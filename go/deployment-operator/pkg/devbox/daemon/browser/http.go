package browser

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/coder/websocket"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
)

// ServeVNC bridges the /browser/vnc WebSocket (noVNC, binary frames) to x11vnc on localhost, starting the browser
// if needed.
func (b *Browser) ServeVNC(w http.ResponseWriter, r *http.Request) {
	if _, err := b.Start(r.Context(), 0, 0, ""); err != nil {
		http.Error(w, "browser unavailable: "+err.Error(), http.StatusServiceUnavailable)
		return
	}
	up, err := net.DialTimeout("tcp", fmt.Sprintf("127.0.0.1:%d", b.opts.VNCPort), 5*time.Second)
	if err != nil {
		http.Error(w, "vnc unavailable", http.StatusBadGateway)
		return
	}
	c, err := websocket.Accept(w, r, &websocket.AcceptOptions{Subprotocols: []string{"binary"}, InsecureSkipVerify: true})
	if err != nil {
		_ = up.Close()
		return
	}
	c.SetReadLimit(-1)
	nc := websocket.NetConn(r.Context(), c, websocket.MessageBinary)
	b.Pipe(nc, up)
}

// ServeStream bridges the /browser/stream WebSocket (console's voxl client) to voxl's on localhost, message by
// message so text and binary frames keep their type, starting the browser if needed.
func (b *Browser) ServeStream(w http.ResponseWriter, r *http.Request) {
	if !b.voxl {
		http.Error(w, "this image streams the browser over VNC", http.StatusNotFound)
		return
	}
	if _, err := b.Start(r.Context(), 0, 0, ""); err != nil {
		http.Error(w, "browser unavailable: "+err.Error(), http.StatusServiceUnavailable)
		return
	}
	ctx := r.Context()
	dialCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	up, _, err := websocket.Dial(dialCtx, fmt.Sprintf("ws://127.0.0.1:%d/ws", b.opts.VoxlPort), &websocket.DialOptions{
		HTTPHeader: http.Header{"Authorization": []string{"Bearer " + b.voxlPassword}},
	})
	if err != nil {
		http.Error(w, "browser stream unavailable", http.StatusBadGateway)
		return
	}
	defer func() { _ = up.CloseNow() }()
	c, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		Subprotocols: []string{devboxv1.BrowserStreamSubprotocol}, InsecureSkipVerify: true,
	})
	if err != nil {
		return
	}
	defer func() { _ = c.CloseNow() }()
	up.SetReadLimit(-1)
	c.SetReadLimit(-1)

	b.streams.Add(1)
	defer b.streams.Add(-1)
	ctx, stop := context.WithCancel(ctx)
	defer stop()
	// the latest screen size voxl reported; Chromium's windows follow it
	sizes := make(chan [2]int, 1)
	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case s := <-sizes:
				if err := b.fitWindows(ctx, s[0], s[1]); err != nil {
					b.log.Warn("fit chromium to the screen", "err", err)
				}
			}
		}
	}()
	picker := &streamPicker{b: b, viewer: c}
	defer picker.stop(false)
	relay := func(dst, src *websocket.Conn, fromVoxl bool) {
		defer stop()
		for {
			typ, data, err := src.Read(ctx)
			if err != nil {
				return
			}
			b.touch()
			if typ == websocket.MessageText {
				if fromVoxl {
					if w, h, ok := screenSize(data); ok {
						data = withPick(data)
						if !b.sized(w, h) {
							select {
							case <-sizes:
							default:
							}
							sizes <- [2]int{w, h}
						}
					}
				} else if on, ok := pickCommand(data); ok {
					// the daemon's own command, which voxl doesn't know
					if on {
						picker.start(ctx)
					} else {
						picker.stop(true)
					}
					continue
				}
			}
			if err := dst.Write(ctx, typ, data); err != nil {
				return
			}
		}
	}
	go relay(c, up, true)
	relay(up, c, false)
}

// pickCommand reads the viewer's `pk,1` (start picking an element) and `pk,0` (stop).
func pickCommand(msg []byte) (on, ok bool) {
	switch string(msg) {
	case "pk,1":
		return true, true
	case "pk,0":
		return false, true
	}
	return false, false
}

// withPick marks a voxl hello with "pick", telling the viewer it can pick elements on this stream.
func withPick(hello []byte) []byte {
	var m map[string]any
	if json.Unmarshal(hello, &m) != nil {
		return hello
	}
	m["pick"] = true
	out, err := json.Marshal(m)
	if err != nil {
		return hello
	}
	return out
}

// streamPicker runs one viewer's element pick at a time, answering with a {"t":"pick"} message: the element,
// an error, or cancelled.
type streamPicker struct {
	b      *Browser
	viewer *websocket.Conn

	mu      sync.Mutex
	current *pick
}

type pick struct {
	cancel context.CancelFunc
	// set when the viewer stopped the pick, so it hears it was cancelled
	byViewer atomic.Bool
}

func (p *streamPicker) start(ctx context.Context) {
	p.stop(false)
	ctx, cancel := context.WithCancel(ctx)
	pk := &pick{cancel: cancel}
	p.mu.Lock()
	p.current = pk
	p.mu.Unlock()
	go func() {
		defer cancel()
		el, err := p.b.pickElement(ctx)
		msg := map[string]any{"t": "pick"}
		switch {
		case err == nil:
			msg["element"] = el
		case pk.byViewer.Load():
			msg["cancelled"] = true
		case ctx.Err() != nil:
			// replaced by another pick, or the stream closed
			return
		default:
			p.b.log.Warn("pick an element", "err", err)
			msg["error"] = err.Error()
		}
		data, _ := json.Marshal(msg)
		wctx, done := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
		defer done()
		_ = p.viewer.Write(wctx, websocket.MessageText, data)
	}()
}

func (p *streamPicker) stop(byViewer bool) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if p.current != nil {
		p.current.byViewer.Store(byViewer)
		p.current.cancel()
		p.current = nil
	}
}

// PreviewProxy serves /preview/<port>/* by reverse-proxying to 127.0.0.1:<port> (WebSockets included).
type PreviewProxy struct {
	// Deny are ports that must not be proxied (the daemon's own listener).
	Deny map[int]bool
	// Activity is told about proxied traffic (idle detection).
	Activity *Browser
}

// ServeHTTP implements http.Handler.
func (p *PreviewProxy) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	rest := strings.TrimPrefix(r.URL.Path, "/preview/")
	portStr, tail, hasSlash := strings.Cut(rest, "/")
	port, err := strconv.Atoi(portStr)
	if err != nil || port <= 0 || port > 65535 || p.Deny[port] {
		http.Error(w, "invalid preview port", http.StatusBadRequest)
		return
	}
	prefix := "/preview/" + portStr
	if !hasSlash {
		target := prefix + "/"
		if r.URL.RawQuery != "" {
			target += "?" + r.URL.RawQuery
		}
		http.Redirect(w, r, target, http.StatusTemporaryRedirect)
		return
	}
	host := "127.0.0.1:" + portStr
	rp := &httputil.ReverseProxy{
		Rewrite: func(pr *httputil.ProxyRequest) {
			pr.Out.URL.Scheme = "http"
			pr.Out.URL.Host = host
			pr.Out.URL.Path = "/" + tail
			pr.Out.URL.RawPath = ""
			if raw := pr.In.URL.RawPath; raw != "" {
				if t, ok := strings.CutPrefix(raw, prefix); ok {
					pr.Out.URL.RawPath = t
				}
			}
			pr.Out.Host = "localhost:" + portStr
			pr.SetXForwarded()
			pr.Out.Header.Set("X-Forwarded-Prefix", prefix)
		},
		ModifyResponse: func(resp *http.Response) error {
			// Keep redirects inside the prefix.
			if loc := resp.Header.Get("Location"); loc != "" {
				if u, err := url.Parse(loc); err == nil {
					local := u.Host == "" || u.Host == host || u.Host == "localhost:"+portStr || u.Host == "127.0.0.1:"+portStr
					if local && strings.HasPrefix(u.Path, "/") && !strings.HasPrefix(u.Path, prefix+"/") {
						u.Scheme, u.Host = "", ""
						u.Path = prefix + u.Path
						resp.Header.Set("Location", u.String())
					}
				}
			}
			return nil
		},
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			http.Error(w, fmt.Sprintf("nothing is listening on port %s in the sandbox", portStr), http.StatusBadGateway)
		},
		FlushInterval: -1,
	}
	if p.Activity != nil {
		p.Activity.streams.Add(1)
		defer p.Activity.streams.Add(-1)
		p.Activity.touch()
		defer p.Activity.touch()
	}
	rp.ServeHTTP(w, r)
}
