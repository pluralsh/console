// Package tunnel connects the gateway to KAS (DBX-31): a gRPC connection over WebSocket to KAS's devbox
// listener, carrying Ingest calls up and a pool of devbox.v1.Tunnel reverse tunnels that KAS sends
// devbox.v1.Gateway calls down. It is a port of agentk's reverse_tunnel agent module.
package tunnel

import (
	"context"
	"crypto/tls"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/coder/websocket"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/keepalive"
)

const (
	// WebSocketProtocol is the subprotocol KAS's tunnel listener accepts.
	WebSocketProtocol = "ws-tunnel"
	// DefaultPath is KAS's devbox listener path prefix. KAS serves tunnels on any path but streams, so it is
	// only a convention.
	DefaultPath = "/ext/devbox"

	keepaliveTime  = 55 * time.Second
	maxMessageSize = 64 << 20
)

// DialConfig locates KAS.
type DialConfig struct {
	// URL is KAS's devbox listener: wss://kas.example.com[/ext/devbox] (ws:// for tests), or grpc[s]://host:port
	// to dial gRPC directly without WebSocket framing.
	URL string
	// Token returns the cluster deploy token sent as "authorization: Bearer <token>" on every call.
	Token func() (string, error)
	// TLS optionally overrides the TLS client configuration (custom CA).
	TLS *tls.Config
	// UserAgent identifies the gateway build.
	UserAgent string
	// Options are appended to the dial options (tests add a bufconn dialer).
	Options []grpc.DialOption
}

// Dial returns a client connection to KAS. Ingest and Tunnel clients share it.
func Dial(cfg DialConfig) (*grpc.ClientConn, error) {
	u, err := url.Parse(cfg.URL)
	if err != nil {
		return nil, fmt.Errorf("invalid KAS URL %q: %w", cfg.URL, err)
	}
	opts := []grpc.DialOption{
		grpc.WithKeepaliveParams(keepalive.ClientParameters{Time: keepaliveTime, PermitWithoutStream: true}),
		grpc.WithDefaultCallOptions(grpc.MaxCallRecvMsgSize(maxMessageSize), grpc.MaxCallSendMsgSize(maxMessageSize)),
	}
	if cfg.UserAgent != "" {
		opts = append(opts, grpc.WithUserAgent(cfg.UserAgent))
	}
	if cfg.Token != nil {
		opts = append(opts, grpc.WithPerRPCCredentials(tokenCredentials(cfg.Token)))
	}

	var target string
	switch u.Scheme {
	case "ws", "wss":
		if u.Path == "" || u.Path == "/" {
			u.Path = DefaultPath
		}
		// TLS (for wss) is the WebSocket's; gRPC itself runs in cleartext inside it.
		target = "passthrough:" + u.String()
		opts = append(opts,
			grpc.WithTransportCredentials(insecure.NewCredentials()),
			grpc.WithContextDialer(webSocketDialer(cfg)),
		)
	case "grpc":
		target = "dns:" + u.Host
		opts = append(opts, grpc.WithTransportCredentials(insecure.NewCredentials()))
	case "grpcs":
		target = "dns:" + u.Host
		tlsCfg := cfg.TLS
		if tlsCfg == nil {
			tlsCfg = &tls.Config{MinVersion: tls.VersionTLS12}
		}
		opts = append(opts, grpc.WithTransportCredentials(credentials.NewTLS(tlsCfg)))
	case "passthrough":
		target = cfg.URL
		opts = append(opts, grpc.WithTransportCredentials(insecure.NewCredentials()))
	default:
		return nil, fmt.Errorf("unsupported KAS URL scheme %q (want wss, ws, grpcs or grpc)", u.Scheme)
	}
	opts = append(opts, cfg.Options...)
	return grpc.NewClient(target, opts...)
}

func webSocketDialer(cfg DialConfig) func(context.Context, string) (net.Conn, error) {
	transport := http.DefaultTransport.(*http.Transport).Clone()
	if cfg.TLS != nil {
		transport.TLSClientConfig = cfg.TLS
	}
	header := http.Header{}
	if cfg.UserAgent != "" {
		header.Set("User-Agent", cfg.UserAgent)
	}
	opts := &websocket.DialOptions{
		HTTPClient:      &http.Client{Transport: transport},
		HTTPHeader:      header,
		Subprotocols:    []string{WebSocketProtocol},
		CompressionMode: websocket.CompressionDisabled,
	}
	return func(ctx context.Context, address string) (net.Conn, error) {
		address = strings.TrimPrefix(address, "passthrough:")
		conn, resp, err := websocket.Dial(ctx, address, opts)
		if resp != nil && resp.Body != nil {
			_ = resp.Body.Close()
		}
		if err != nil {
			return nil, err
		}
		conn.SetReadLimit(maxMessageSize + 1024)
		return websocket.NetConn(context.Background(), conn, websocket.MessageBinary), nil // nolint: contextcheck
	}
}

type tokenCredentials func() (string, error)

func (t tokenCredentials) GetRequestMetadata(context.Context, ...string) (map[string]string, error) {
	token, err := t()
	if err != nil {
		return nil, err
	}
	return map[string]string{"authorization": "Bearer " + token}, nil
}

// RequireTransportSecurity is false because TLS is provided by the WebSocket, which gRPC can't see.
func (tokenCredentials) RequireTransportSecurity() bool { return false }
