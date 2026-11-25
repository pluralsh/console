// Package podcert builds TLS configs from Substrate's projected pod certificates: credential bundles (a private key
// and its chain in one PEM file) and ClusterTrustBundles. The kubelet rotates both on disk, so every config re-reads
// them instead of loading them once.
package podcert

import (
	"crypto/tls"
	"crypto/x509"
	"errors"
	"fmt"
	"os"
	"slices"
	"sync"
	"time"
)

// reloadEvery bounds how stale a client's view of a rotated trust bundle can be.
const reloadEvery = time.Minute

// LoadBundle reads a credential bundle.
func LoadBundle(file string) (*tls.Certificate, error) {
	data, err := os.ReadFile(file)
	if err != nil {
		return nil, fmt.Errorf("reading credential bundle: %w", err)
	}
	cert, err := tls.X509KeyPair(data, data)
	if err != nil {
		return nil, fmt.Errorf("parsing credential bundle %s: %w", file, err)
	}
	return &cert, nil
}

// ClientTLS presents credentialBundle and verifies the server against trustBundle for serverName (or the name the
// connection dials, when empty).
func ClientTLS(credentialBundle, trustBundle, serverName string) (*tls.Config, error) {
	roots := &reloadingPool{file: trustBundle}
	if _, err := roots.get(); err != nil {
		return nil, err
	}
	if _, err := LoadBundle(credentialBundle); err != nil {
		return nil, err
	}
	return &tls.Config{
		MinVersion: tls.VersionTLS12,
		ServerName: serverName,
		GetClientCertificate: func(*tls.CertificateRequestInfo) (*tls.Certificate, error) {
			return LoadBundle(credentialBundle)
		},
		// Verified in VerifyConnection against the current trust bundle, which rotates.
		InsecureSkipVerify: true, // nolint: gosec
		VerifyConnection: func(cs tls.ConnectionState) error {
			pool, err := roots.get()
			if err != nil {
				return err
			}
			if len(cs.PeerCertificates) == 0 {
				return errors.New("server presented no certificate")
			}
			inter := x509.NewCertPool()
			for _, c := range cs.PeerCertificates[1:] {
				inter.AddCert(c)
			}
			_, err = cs.PeerCertificates[0].Verify(x509.VerifyOptions{DNSName: cs.ServerName, Roots: pool, Intermediates: inter})
			return err
		},
	}, nil
}

// ServerConfig describes an mTLS server.
type ServerConfig struct {
	// Bundle is the serving credential bundle; CertFile and KeyFile may hold the certificate and key instead.
	Bundle   string
	CertFile string
	KeyFile  string
	// ClientCA is the trust bundle caller certificates must chain to.
	ClientCA string
	// AllowedURISANs are the caller identities (SPIFFE IDs) accepted.
	AllowedURISANs []string
}

// ServerTLS requires a client certificate that chains to cfg.ClientCA and carries one of cfg.AllowedURISANs. It
// re-reads the certificate files on every handshake and fails at once on a missing projection rather than on the
// first call.
func ServerTLS(cfg ServerConfig) (*tls.Config, error) {
	if cfg.ClientCA == "" {
		return nil, errors.New("podcert: a client CA bundle is required")
	}
	if cfg.Bundle == "" && (cfg.CertFile == "" || cfg.KeyFile == "") {
		return nil, errors.New("podcert: a serving bundle, or certificate and key files, are required")
	}
	if len(cfg.AllowedURISANs) == 0 {
		return nil, errors.New("podcert: at least one allowed client URI SAN is required")
	}

	loadCert := func() (*tls.Certificate, error) {
		if cfg.Bundle != "" {
			return LoadBundle(cfg.Bundle)
		}
		cert, err := tls.LoadX509KeyPair(cfg.CertFile, cfg.KeyFile)
		return &cert, err
	}
	loadPool := func() (*x509.CertPool, error) {
		raw, err := os.ReadFile(cfg.ClientCA)
		if err != nil {
			return nil, fmt.Errorf("reading client CA bundle: %w", err)
		}
		pool := x509.NewCertPool()
		if !pool.AppendCertsFromPEM(raw) {
			return nil, fmt.Errorf("client CA bundle %s holds no certificates", cfg.ClientCA)
		}
		return pool, nil
	}
	if _, err := loadCert(); err != nil {
		return nil, fmt.Errorf("podcert: loading server certificate: %w", err)
	}
	if _, err := loadPool(); err != nil {
		return nil, fmt.Errorf("podcert: %w", err)
	}

	return &tls.Config{
		MinVersion: tls.VersionTLS13,
		GetConfigForClient: func(*tls.ClientHelloInfo) (*tls.Config, error) {
			pool, err := loadPool()
			if err != nil {
				return nil, err
			}
			return &tls.Config{
				MinVersion: tls.VersionTLS13,
				GetCertificate: func(*tls.ClientHelloInfo) (*tls.Certificate, error) {
					return loadCert()
				},
				ClientAuth:       tls.RequireAndVerifyClientCert,
				ClientCAs:        pool,
				VerifyConnection: VerifyURISAN(cfg.AllowedURISANs),
				NextProtos:       []string{"h2"},
			}, nil
		},
	}, nil
}

// VerifyURISAN accepts a peer only when its leaf certificate carries one of the allowed URI SANs.
func VerifyURISAN(allowed []string) func(tls.ConnectionState) error {
	return func(state tls.ConnectionState) error {
		if len(state.PeerCertificates) == 0 {
			return errors.New("client certificate is required")
		}
		leaf := state.PeerCertificates[0]
		for _, u := range leaf.URIs {
			if slices.Contains(allowed, u.String()) {
				return nil
			}
		}
		return fmt.Errorf("client certificate URI SANs %v include none of %v", leaf.URIs, allowed)
	}
}

type reloadingPool struct {
	file string
	mu   sync.Mutex
	pool *x509.CertPool
	at   time.Time
}

func (p *reloadingPool) get() (*x509.CertPool, error) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if p.pool != nil && time.Since(p.at) < reloadEvery {
		return p.pool, nil
	}
	data, err := os.ReadFile(p.file)
	if err != nil {
		if p.pool != nil {
			return p.pool, nil
		}
		return nil, fmt.Errorf("reading trust bundle: %w", err)
	}
	pool := x509.NewCertPool()
	if !pool.AppendCertsFromPEM(data) {
		return nil, fmt.Errorf("no certificates in trust bundle %s", p.file)
	}
	p.pool, p.at = pool, time.Now()
	return pool, nil
}
