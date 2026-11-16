// Package router reaches devbox daemons through Substrate's atenet-router: gRPC (devbox.v1.Daemon) and HTTP
// (terminal, VNC and preview WebSockets) over mTLS, with the target actor in the ate-target-actor header. A
// request to a suspended actor resumes it, so callers check the instance state first.
package router

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"errors"
	"fmt"
	"net"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/keepalive"
	"google.golang.org/grpc/metadata"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
)

const (
	// TargetHeader selects the actor, as "<atespace>/<name>".
	TargetHeader = "ate-target-actor"
	// DefaultAddress is atenet-router's in-cluster HTTPS Service.
	DefaultAddress = "atenet-router.ate-system.svc:443"

	maxMessageSize = 64 << 20
	reloadEvery    = time.Minute
)

// Config locates atenet-router and the gateway's identity.
type Config struct {
	// Address is host:port, DefaultAddress when empty.
	Address string
	// CredentialBundle is a PEM file with the gateway's pod-identity key and certificate chain
	// (podidentity.podcert.ate.dev/credential-bundle.pem). Re-read on every handshake.
	CredentialBundle string
	// TrustBundle verifies the router's serving certificate (servicedns-ca.podcert.ate.dev/trust-bundle.pem).
	TrustBundle string
	// ServerName overrides the TLS server name, the Address host by default.
	ServerName string
	// Insecure dials without TLS (tests and local development).
	Insecure bool
}

// Router is a connection to atenet-router.
type Router struct {
	conn    grpc.ClientConnInterface
	closer  func() error
	http    http.RoundTripper
	baseURL string
}

// Dial connects to atenet-router.
func Dial(cfg Config) (*Router, error) {
	if cfg.Address == "" {
		cfg.Address = DefaultAddress
	}
	host, _, err := net.SplitHostPort(cfg.Address)
	if err != nil {
		return nil, fmt.Errorf("invalid router address %q: %w", cfg.Address, err)
	}
	if cfg.ServerName == "" {
		cfg.ServerName = host
	}
	opts := []grpc.DialOption{
		grpc.WithKeepaliveParams(keepalive.ClientParameters{Time: time.Minute, PermitWithoutStream: false}),
		grpc.WithDefaultCallOptions(grpc.MaxCallRecvMsgSize(maxMessageSize), grpc.MaxCallSendMsgSize(maxMessageSize)),
	}
	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.Proxy = nil
	scheme := "http"
	if cfg.Insecure {
		opts = append(opts, grpc.WithTransportCredentials(insecure.NewCredentials()))
	} else {
		tlsCfg, err := clientTLS(cfg)
		if err != nil {
			return nil, err
		}
		opts = append(opts, grpc.WithTransportCredentials(credentials.NewTLS(tlsCfg)))
		httpTLS := tlsCfg.Clone()
		// WebSocket upgrades need HTTP/1.1.
		httpTLS.NextProtos = []string{"http/1.1"}
		transport.TLSClientConfig = httpTLS
		transport.ForceAttemptHTTP2 = false
		scheme = "https"
	}
	conn, err := grpc.NewClient("dns:"+cfg.Address, opts...)
	if err != nil {
		return nil, err
	}
	return &Router{conn: conn, closer: conn.Close, http: transport, baseURL: scheme + "://" + cfg.Address}, nil
}

// New wraps an existing connection and HTTP transport (tests).
func New(conn grpc.ClientConnInterface, rt http.RoundTripper, baseURL string) *Router {
	return &Router{conn: conn, http: rt, baseURL: strings.TrimSuffix(baseURL, "/")}
}

func (r *Router) Close() error {
	if r.closer == nil {
		return nil
	}
	return r.closer()
}

// Daemon returns a client for the daemon of an actor ("<atespace>/<name>"). Calls carry the request token of
// the incoming call they serve, if any.
func (r *Router) Daemon(actor string) devboxv1.DaemonClient {
	return devboxv1.NewDaemonClient(&targetConn{conn: r.conn, actor: actor})
}

// NewRequest builds an HTTP request to an actor's daemon; send it with RoundTrip.
func (r *Router) NewRequest(ctx context.Context, actor, method, pathAndQuery string) (*http.Request, error) {
	req, err := http.NewRequestWithContext(ctx, method, r.baseURL+pathAndQuery, http.NoBody)
	if err != nil {
		return nil, err
	}
	req.Header.Set(TargetHeader, actor)
	return req, nil
}

// RoundTrip sends a request built by NewRequest.
func (r *Router) RoundTrip(req *http.Request) (*http.Response, error) {
	if req.Header.Get(TargetHeader) == "" {
		return nil, errors.New("router: request has no " + TargetHeader)
	}
	return r.http.RoundTrip(req)
}

type targetConn struct {
	conn  grpc.ClientConnInterface
	actor string
}

func (c *targetConn) ctx(ctx context.Context) context.Context {
	ctx = metadata.AppendToOutgoingContext(ctx, TargetHeader, c.actor)
	out, _ := metadata.FromOutgoingContext(ctx)
	if len(out.Get(devboxv1.RequestTokenMetadataKey)) == 0 {
		if in, ok := metadata.FromIncomingContext(ctx); ok {
			if tok := in.Get(devboxv1.RequestTokenMetadataKey); len(tok) > 0 {
				ctx = metadata.AppendToOutgoingContext(ctx, devboxv1.RequestTokenMetadataKey, tok[0])
			}
		}
	}
	return ctx
}

func (c *targetConn) Invoke(ctx context.Context, method string, args, reply any, opts ...grpc.CallOption) error {
	return c.conn.Invoke(c.ctx(ctx), method, args, reply, opts...)
}

func (c *targetConn) NewStream(ctx context.Context, desc *grpc.StreamDesc, method string, opts ...grpc.CallOption) (grpc.ClientStream, error) {
	return c.conn.NewStream(c.ctx(ctx), desc, method, opts...)
}

// ---- TLS ----

func clientTLS(cfg Config) (*tls.Config, error) {
	roots := &reloadingPool{file: cfg.TrustBundle}
	if _, err := roots.get(); err != nil {
		return nil, err
	}
	if _, err := loadBundle(cfg.CredentialBundle); err != nil {
		return nil, err
	}
	return &tls.Config{
		MinVersion: tls.VersionTLS12,
		ServerName: cfg.ServerName,
		GetClientCertificate: func(*tls.CertificateRequestInfo) (*tls.Certificate, error) {
			return loadBundle(cfg.CredentialBundle)
		},
		// Verified in VerifyConnection against the current trust bundle, which rotates.
		InsecureSkipVerify: true, // nolint: gosec
		VerifyConnection: func(cs tls.ConnectionState) error {
			pool, err := roots.get()
			if err != nil {
				return err
			}
			if len(cs.PeerCertificates) == 0 {
				return errors.New("router presented no certificate")
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

func loadBundle(file string) (*tls.Certificate, error) {
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
		return nil, fmt.Errorf("reading router trust bundle: %w", err)
	}
	pool := x509.NewCertPool()
	if !pool.AppendCertsFromPEM(data) {
		return nil, fmt.Errorf("no certificates in router trust bundle %s", p.file)
	}
	p.pool, p.at = pool, time.Now()
	return pool, nil
}
