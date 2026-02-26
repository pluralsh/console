package wstunnel

import (
	"bytes"
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"sync"
	"time"

	"github.com/coder/websocket"

	"github.com/pluralsh/kubernetes-agent/pkg/tool/httpz"
)

// ListenerWrapper does two things:
//   - HTTP/1.1 connections are expected to contain WebSocket upgrade request. Such connections are turned into TCP
//     streams and returned from Accept(). This mode can be used for tunneling an HTTP/2 protocol via a WebSocket connection.
//   - HTTP/2 connections are returned from Accept() as is.
//
// There are two modes of operation - with and without TLS. Whether connection is HTTP/1.1 or HTTP/2 is determined
// by looking at:
// - TLS: what protocol was negotiated via ALPN. h2 means HTTP/2, everything else is considered HTTP/1.1.
// - Cleartext: if byte stream contains the standard h2 client preface then it's an HTTP/2 connection, HTTP/1.1 otherwise.
// See https://httpwg.org/specs/rfc9113.html#preface.
// See https://www.rfc-editor.org/rfc/rfc7301.html.
type ListenerWrapper struct {
	AcceptOptions websocket.AcceptOptions
	// ReadLimit. Optional. See websocket.Conn.SetReadLimit().
	ReadLimit  int64
	ServerName string

	// Fields below are directly passed to the constructed http.Server.
	// All of them are optional.

	ReadTimeout       time.Duration
	ReadHeaderTimeout time.Duration
	WriteTimeout      time.Duration
	IdleTimeout       time.Duration
	MaxHeaderBytes    int
	ConnState         func(net.Conn, http.ConnState)
	ErrorLog          *log.Logger
	BaseContext       func(net.Listener) context.Context
	ConnContext       func(ctx context.Context, c net.Conn) context.Context
}

type Listener interface {
	net.Listener
	// Shutdown gracefully shuts down the server without interrupting any
	// active connections. See http.Server.Shutdown().
	Shutdown(context.Context) error
}

func (w *ListenerWrapper) Wrap(source net.Listener, isTls bool) Listener {
	accepted := make(chan net.Conn) // unwrapped WebSocket streams or HTTP/2 connections
	isHttp2Connection := isCleartextHttp2Connection
	if isTls {
		isHttp2Connection = isTlsHttp2Connection
	}
	ctx, cancel := context.WithCancel(context.Background())
	options := w.AcceptOptions
	options.Subprotocols = []string{TunnelWebSocketProtocol}
	pl := &protocolListener{
		delegate:          source,
		http1:             make(chan acceptResult),
		http2:             accepted,
		close:             make(chan struct{}),
		handshakeTimeout:  w.handshakeTimeout(),
		isHttp2Connection: isHttp2Connection,
	}
	s := &wrapperServer{
		cancelAccept: cancel,
		source: &onceCloseListener{
			Listener: pl,
		},
		server: &http.Server{
			Handler: &HttpHandler{
				Ctx:           ctx,
				ServerName:    w.ServerName,
				AcceptOptions: options,
				Sink:          accepted,
				ReadLimit:     w.ReadLimit,
			},
			ReadTimeout:       w.ReadTimeout,
			ReadHeaderTimeout: w.ReadHeaderTimeout,
			WriteTimeout:      w.WriteTimeout,
			IdleTimeout:       w.IdleTimeout,
			MaxHeaderBytes:    w.MaxHeaderBytes,
			ConnState:         w.ConnState,
			ErrorLog:          w.ErrorLog,
			BaseContext:       w.BaseContext,
			ConnContext:       w.ConnContext,
		},
		accepted:  accepted,
		serverErr: make(chan error, 1),
	}
	go pl.acceptLoop()
	go s.run()

	return s
}

// handshakeTimeout returns the time limit permitted for the TLS/cleartext
// handshake, or zero for unlimited.
//
// It returns the minimum of any positive ReadHeaderTimeout,
// ReadTimeout, or WriteTimeout.
func (w *ListenerWrapper) handshakeTimeout() time.Duration {
	var ret time.Duration
	for _, v := range [...]time.Duration{w.ReadHeaderTimeout, w.ReadTimeout, w.WriteTimeout} {
		if v <= 0 {
			continue
		}
		if ret == 0 || v < ret {
			ret = v
		}
	}
	return ret
}

type wrapperServer struct {
	cancelAccept context.CancelFunc
	source       net.Listener
	server       *http.Server
	accepted     <-chan net.Conn
	serverErr    chan error
}

func (s *wrapperServer) run() {
	defer s.cancelAccept()
	s.serverErr <- s.server.Serve(s.source)
}

func (s *wrapperServer) Accept() (net.Conn, error) {
	select {
	case con := <-s.accepted:
		return con, nil
	case err := <-s.serverErr:
		s.serverErr <- err // put it back for the next Accept call
		return nil, err
	}
}

func (s *wrapperServer) Close() error {
	return s.source.Close()
}

func (s *wrapperServer) Shutdown(ctx context.Context) error {
	return s.server.Shutdown(ctx)
}

func (s *wrapperServer) Addr() net.Addr {
	return s.source.Addr()
}

type HttpHandler struct {
	Ctx           context.Context
	ServerName    string
	AcceptOptions websocket.AcceptOptions
	Sink          chan<- net.Conn
	// ReadLimit. Optional. See websocket.Conn.SetReadLimit().
	ReadLimit int64
}

func (h *HttpHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header()[httpz.ServerHeader] = []string{h.ServerName}
	conn, err := websocket.Accept(w, r, &h.AcceptOptions)
	if err != nil {
		return
	}
	subprotocol := conn.Subprotocol()
	if subprotocol != TunnelWebSocketProtocol {
		conn.Close(websocket.StatusProtocolError, fmt.Sprintf("Expecting %q subprotocol, got %q", TunnelWebSocketProtocol, subprotocol)) // nolint: errcheck, gosec
		return
	}
	if h.ReadLimit != 0 {
		conn.SetReadLimit(h.ReadLimit)
	}
	netConn := websocket.NetConn(context.Background(), conn, websocket.MessageBinary) // nolint: contextcheck

	select {
	case <-h.Ctx.Done():
		// send correct close frame
		conn.Close(websocket.StatusGoingAway, "Shutting down") // nolint: errcheck, gosec
		// free resources
		netConn.Close() // nolint: errcheck, gosec
	case h.Sink <- netConn:
	}
}

// onceCloseListener wraps a net.Listener, protecting it from
// multiple Close calls.
// We get two Close calls:
// - server.Serve(s.source) closes the listener before returning
// - Close() method
type onceCloseListener struct {
	net.Listener
	once     sync.Once
	closeErr error
}

func (oc *onceCloseListener) Close() error {
	oc.once.Do(oc.close)
	return oc.closeErr
}

func (oc *onceCloseListener) close() {
	oc.closeErr = oc.Listener.Close()
}

type acceptResult struct {
	conn net.Conn
	err  error
}

type protocolListener struct {
	delegate          net.Listener
	http1             chan acceptResult
	http2             chan<- net.Conn
	close             chan struct{}
	handshakeTimeout  time.Duration
	isHttp2Connection func(conn net.Conn, handshakeTimeout time.Duration) (net.Conn, bool /* isHttp2 */, error)
}

func (l *protocolListener) Accept() (net.Conn, error) {
	select {
	case <-l.close:
		return nil, errors.New("closed listener")
	case res := <-l.http1:
		return res.conn, res.err
	}
}

func (l *protocolListener) Close() error {
	close(l.close)
	return l.delegate.Close()
}

func (l *protocolListener) Addr() net.Addr {
	return l.delegate.Addr()
}

func (l *protocolListener) acceptLoop() {
	for {
		conn, err := l.delegate.Accept()
		if err != nil {
			select {
			case <-l.close:
				return
			case l.http1 <- acceptResult{err: err}:
				continue
			}
		}
		go l.acceptAsync(conn)
	}
}

// acceptAsync calls isHttp2Connection() on incoming connections asynchronously to avoid blocking/slowing down
// the accept loop.
func (l *protocolListener) acceptAsync(conn net.Conn) {
	wrappedConn, isHttp2, err := l.isHttp2Connection(conn, l.handshakeTimeout)
	if err != nil {
		_ = conn.Close()
		return
	}
	if isHttp2 {
		select {
		case <-l.close:
			// Listener is closing, close the connection.
			_ = wrappedConn.Close()
		case l.http2 <- wrappedConn:
		}
	} else {
		select {
		case <-l.close:
			// Listener is closing, close the connection.
			_ = wrappedConn.Close()
		case l.http1 <- acceptResult{conn: wrappedConn}:
		}
	}
}

func isTlsHttp2Connection(conn net.Conn, handshakeTimeout time.Duration) (net.Conn, bool /* isHttp2 */, error) {
	type tlsConnInterface interface {
		ConnectionState() tls.ConnectionState
		HandshakeContext(context.Context) error
	}
	tlsConn, ok := conn.(tlsConnInterface)
	if !ok {
		return conn, false, nil
	}
	if handshakeTimeout > 0 {
		err := conn.SetDeadline(time.Now().Add(handshakeTimeout))
		if err != nil {
			return nil, false, err
		}
	}
	err := tlsConn.HandshakeContext(context.Background()) // this is needed to populate connection state, used below.
	if err != nil {
		return nil, false, err
	}
	if handshakeTimeout > 0 { // Restore timeout
		err = conn.SetDeadline(time.Time{})
		if err != nil {
			return nil, false, err
		}
	}
	return conn, tlsConn.ConnectionState().NegotiatedProtocol == httpz.TLSNextProtoH2, nil
}

func isCleartextHttp2Connection(conn net.Conn, handshakeTimeout time.Duration) (net.Conn, bool /* isHttp2 */, error) {
	if handshakeTimeout > 0 {
		err := conn.SetReadDeadline(time.Now().Add(10 * time.Second))
		if err != nil {
			return nil, false, err
		}
	}
	preface := make([]byte, len(httpz.H2ClientPreface))
	_, err := io.ReadFull(conn, preface)
	if err != nil {
		return nil, false, err
	}
	if handshakeTimeout > 0 {
		err = conn.SetReadDeadline(time.Time{})
		if err != nil {
			return nil, false, err
		}
	}
	conn = &readerConn{
		Conn: conn,
		r:    io.MultiReader(bytes.NewReader(preface), conn),
	}
	return conn, string(preface) == httpz.H2ClientPreface, nil
}

// readerConn uses a reader instead of the net.Conn's Read() method.
// This makes it possible e.g. to unread a chunk of data.
type readerConn struct {
	net.Conn
	r io.Reader
}

func (r *readerConn) Read(b []byte) (int, error) {
	return r.r.Read(b)
}
