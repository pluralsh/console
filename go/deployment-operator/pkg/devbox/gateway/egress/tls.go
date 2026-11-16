package egress

import (
	"crypto/tls"
	"crypto/x509"
	"encoding/pem"
	"errors"
	"fmt"
	"os"
	"slices"
)

// egressServerTLS is the mTLS config shared by the credential provider and the ext_proc. Like Substrate's
// reference provider, it requires a client certificate that chains to the pod-identity trust bundle and carries one
// of the allowed URI SANs, and it re-reads the certificate files on every handshake so rotation needs no restart.
func egressServerTLS(cfg Config) (*tls.Config, error) {
	if cfg.ClientCAFile == "" {
		return nil, errors.New("egress: ClientCAFile (the pod-identity trust bundle) is required")
	}
	if cfg.ServerBundleFile == "" && (cfg.ServerCertFile == "" || cfg.ServerKeyFile == "") {
		return nil, errors.New("egress: ServerBundleFile or ServerCertFile and ServerKeyFile are required")
	}
	sans := cfg.AllowedClientSANs
	if len(sans) == 0 {
		sans = []string{DefaultEgressSPIFFEID}
	}

	loadCert := func() (*tls.Certificate, error) {
		if cfg.ServerBundleFile != "" {
			return loadBundle(cfg.ServerBundleFile)
		}
		cert, err := tls.LoadX509KeyPair(cfg.ServerCertFile, cfg.ServerKeyFile)
		return &cert, err
	}
	loadPool := func() (*x509.CertPool, error) {
		raw, err := os.ReadFile(cfg.ClientCAFile)
		if err != nil {
			return nil, fmt.Errorf("reading client CA bundle: %w", err)
		}
		pool := x509.NewCertPool()
		if !pool.AppendCertsFromPEM(raw) {
			return nil, fmt.Errorf("client CA bundle %s holds no certificates", cfg.ClientCAFile)
		}
		return pool, nil
	}
	// Fail at startup on a missing projection rather than on the first call.
	if _, err := loadCert(); err != nil {
		return nil, fmt.Errorf("egress: loading server certificate: %w", err)
	}
	if _, err := loadPool(); err != nil {
		return nil, fmt.Errorf("egress: %w", err)
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
				VerifyConnection: verifyClientSAN(sans),
				NextProtos:       []string{"h2"},
			}, nil
		},
	}, nil
}

// verifyClientSAN accepts a caller only when its leaf certificate carries one of the allowed URI SANs.
func verifyClientSAN(allowed []string) func(tls.ConnectionState) error {
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

// loadBundle reads a PEM file holding a private key and its certificate chain, the format of Substrate's pod
// identity credential bundles.
func loadBundle(path string) (*tls.Certificate, error) {
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var certPEM, keyPEM []byte
	for {
		var block *pem.Block
		block, raw = pem.Decode(raw)
		if block == nil {
			break
		}
		encoded := pem.EncodeToMemory(block)
		if block.Type == "CERTIFICATE" {
			certPEM = append(certPEM, encoded...)
		} else {
			keyPEM = append(keyPEM, encoded...)
		}
	}
	cert, err := tls.X509KeyPair(certPEM, keyPEM)
	if err != nil {
		return nil, fmt.Errorf("credential bundle %s: %w", path, err)
	}
	return &cert, nil
}
