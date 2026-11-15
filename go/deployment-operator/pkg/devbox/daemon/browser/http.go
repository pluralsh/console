package browser

import (
	"fmt"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/coder/websocket"
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
