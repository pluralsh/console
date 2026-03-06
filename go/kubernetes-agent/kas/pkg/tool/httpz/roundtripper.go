package httpz

import (
	"bufio"
	"crypto/tls"
	"fmt"
	"net"
	"net/http"

	"k8s.io/apimachinery/third_party/forked/golang/netutil"
)

// UpgradeRoundTripper allows to access the underlying network connection after round tripping a request/response.
// A http.RoundTripper must be safe for concurrent use by multiple goroutines, but this implementation is not.
// It does not pool network connections so it's not worth the complexity. Instead, the using code must
// use a new instance for each request.
// See http://golang.org/pkg/net/http/#RoundTripper
type UpgradeRoundTripper struct {
	// Dialer is the dialer used to connect.
	Dialer *net.Dialer

	// TlsDialer is the dialer used to connect over TLS.
	TlsDialer *tls.Dialer

	// Conn is the underlying network connection to the remote server.
	Conn net.Conn

	// ConnReader is a buffered reader for Conn.
	// It may contain some data that has been buffered from Conn while reading the server's response.
	ConnReader *bufio.Reader
}

func (u *UpgradeRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	conn, err := u.dial(req)
	if err != nil {
		if req.Body != nil {
			_ = req.Body.Close()
		}
		return nil, err
	}
	cc := NewContextConn(conn)
	go cc.CloseOnDone(req.Context())
	success := false
	defer func() {
		if !success {
			_ = cc.Close()
		}
	}()
	if err = req.Write(cc); err != nil {
		return nil, err
	}

	connReader := bufio.NewReader(cc)

	resp, err := http.ReadResponse(connReader, req)
	if err != nil {
		return nil, err
	}

	u.Conn = cc
	u.ConnReader = connReader
	success = true

	return resp, nil
}

func (u *UpgradeRoundTripper) dial(req *http.Request) (net.Conn, error) {
	dialAddr := netutil.CanonicalAddr(req.URL)
	ctx := req.Context()

	switch req.URL.Scheme {
	case "http":
		return u.Dialer.DialContext(ctx, "tcp", dialAddr)
	case "https":
		return u.TlsDialer.DialContext(ctx, "tcp", dialAddr)
	default:
		return nil, fmt.Errorf("unsupported URL scheme: %s", req.URL.Scheme)
	}
}
