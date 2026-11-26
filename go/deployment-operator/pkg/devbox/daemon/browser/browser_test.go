package browser

import (
	"context"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/http/httptest"
	"os/exec"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"
)

func upstream(t *testing.T, h http.Handler) int {
	t.Helper()
	srv := httptest.NewServer(h)
	t.Cleanup(srv.Close)
	_, port, _ := net.SplitHostPort(strings.TrimPrefix(srv.URL, "http://"))
	p, _ := strconv.Atoi(port)
	return p
}

func TestPreviewProxy(t *testing.T) {
	port := upstream(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/redirect":
			http.Redirect(w, r, "/login", http.StatusFound)
		case "/ws":
			c, err := websocket.Accept(w, r, nil)
			if err != nil {
				return
			}
			defer c.CloseNow()
			typ, data, err := c.Read(r.Context())
			if err == nil {
				_ = c.Write(r.Context(), typ, append([]byte("pong:"), data...))
			}
		default:
			w.Header().Set("X-Seen-Host", r.Host)
			w.Header().Set("X-Seen-Prefix", r.Header.Get("X-Forwarded-Prefix"))
			_, _ = io.WriteString(w, "path="+r.URL.Path+" q="+r.URL.RawQuery)
		}
	}))
	b := New(Options{Log: slog.New(slog.NewTextHandler(io.Discard, nil))})
	before := b.LastActivity()
	proxy := httptest.NewServer(&PreviewProxy{Deny: map[int]bool{80: true}, Activity: b})
	defer proxy.Close()
	client := &http.Client{CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	base := proxy.URL + "/preview/" + strconv.Itoa(port)

	resp, err := client.Get(base + "/app/page?x=1")
	if err != nil {
		t.Fatal(err)
	}
	body, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	if string(body) != "path=/app/page q=x=1" {
		t.Fatalf("body %q", body)
	}
	if h := resp.Header.Get("X-Seen-Host"); h != "localhost:"+strconv.Itoa(port) {
		t.Fatalf("upstream host %q", h)
	}
	if p := resp.Header.Get("X-Seen-Prefix"); p != "/preview/"+strconv.Itoa(port) {
		t.Fatalf("forwarded prefix %q", p)
	}
	if !b.LastActivity().After(before) {
		t.Fatal("preview traffic not recorded as activity")
	}

	resp, _ = client.Get(base)
	resp.Body.Close()
	if resp.StatusCode/100 != 3 || resp.Header.Get("Location") != "/preview/"+strconv.Itoa(port)+"/" {
		t.Fatalf("bare port not redirected: %d %q", resp.StatusCode, resp.Header.Get("Location"))
	}

	resp, _ = client.Get(base + "/redirect")
	resp.Body.Close()
	if loc := resp.Header.Get("Location"); loc != "/preview/"+strconv.Itoa(port)+"/login" {
		t.Fatalf("Location not rewritten: %q", loc)
	}

	resp, _ = client.Get(proxy.URL + "/preview/80/")
	resp.Body.Close()
	if resp.StatusCode == http.StatusOK {
		t.Fatal("denied port proxied")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	c, _, err := websocket.Dial(ctx, "ws"+strings.TrimPrefix(base, "http")+"/ws", nil)
	if err != nil {
		t.Fatalf("websocket through preview: %v", err)
	}
	defer c.CloseNow()
	_ = c.Write(ctx, websocket.MessageText, []byte("ping"))
	_, data, err := c.Read(ctx)
	if err != nil || string(data) != "pong:ping" {
		t.Fatalf("websocket echo %q %v", data, err)
	}
}

func TestPreviewNothingListening(t *testing.T) {
	ln, _ := net.Listen("tcp", "127.0.0.1:0")
	port := ln.Addr().(*net.TCPAddr).Port
	ln.Close()
	proxy := httptest.NewServer(&PreviewProxy{})
	defer proxy.Close()
	resp, err := http.Get(proxy.URL + "/preview/" + strconv.Itoa(port) + "/")
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusBadGateway {
		t.Fatalf("status %d", resp.StatusCode)
	}
}

func TestStartFailsFastWithTheExitedProcessOutput(t *testing.T) {
	b := New(Options{Log: slog.New(slog.NewTextHandler(io.Discard, nil))})
	s, err := b.spawn("chromium", "sh", "-c", "echo 'No usable sandbox!' >&2; exit 3")
	if err != nil {
		t.Fatal(err)
	}
	begin := time.Now()
	err = waitFor(func() bool { return false }, time.Now().Add(10*time.Second), []started{s})
	if err == nil || !strings.Contains(err.Error(), "chromium exited") || !strings.Contains(err.Error(), "No usable sandbox!") {
		t.Fatalf("err %v, want chromium's exit and output", err)
	}
	if time.Since(begin) > 5*time.Second {
		t.Fatalf("waited %s for a process that had exited", time.Since(begin))
	}
}

func TestTailKeepsTheLastBytes(t *testing.T) {
	out := &tail{max: 4}
	_, _ = out.Write([]byte("abc"))
	_, _ = out.Write([]byte("defg"))
	if got := out.String(); got != "defg" {
		t.Fatalf("tail %q, want %q", got, "defg")
	}
}

func TestServeStreamRelaysVoxlMessages(t *testing.T) {
	b := New(Options{Voxl: "sh", Log: slog.New(slog.NewTextHandler(io.Discard, nil))})
	if !b.voxl || b.StreamPath() != StreamPath || b.Info().GetVncPath() != StreamPath {
		t.Fatalf("an image with voxl streams on %q", b.StreamPath())
	}
	auth := make(chan string, 1)
	b.opts.VoxlPort = upstream(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth <- r.Header.Get("Authorization")
		c, err := websocket.Accept(w, r, nil)
		if err != nil {
			return
		}
		defer c.CloseNow()
		_ = c.Write(r.Context(), websocket.MessageText, []byte(`{"t":"hello","w":1280,"h":800}`))
		typ, data, err := c.Read(r.Context())
		if err == nil {
			_ = c.Write(r.Context(), websocket.MessageBinary, append([]byte{byte(typ)}, data...))
		}
	}))
	b.running = true
	srv := httptest.NewServer(http.HandlerFunc(b.ServeStream))
	defer srv.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	c, resp, err := websocket.Dial(ctx, "ws"+strings.TrimPrefix(srv.URL, "http")+StreamPath,
		&websocket.DialOptions{Subprotocols: []string{"voxl"}})
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	defer c.CloseNow()
	if p := resp.Header.Get("Sec-WebSocket-Protocol"); p != "voxl" {
		t.Fatalf("subprotocol %q, want voxl", p)
	}
	if got := <-auth; got != "Bearer "+b.voxlPassword || b.voxlPassword == "" {
		t.Fatalf("voxl saw Authorization %q", got)
	}
	typ, data, err := c.Read(ctx)
	if err != nil || typ != websocket.MessageText || !strings.Contains(string(data), `"hello"`) {
		t.Fatalf("hello: %v %q %v", typ, data, err)
	}
	if b.Streams() != 1 {
		t.Fatalf("streams %d, want 1", b.Streams())
	}
	_ = c.Write(ctx, websocket.MessageText, []byte("m,10,20"))
	typ, data, err = c.Read(ctx)
	if err != nil || typ != websocket.MessageBinary || string(data) != "\x01m,10,20" {
		t.Fatalf("relayed command: %v %q %v", typ, data, err)
	}
}

func TestWithoutVoxlTheBrowserStreamsOverVNC(t *testing.T) {
	b := New(Options{Voxl: "voxl-not-installed", Log: slog.New(slog.NewTextHandler(io.Discard, nil))})
	if b.StreamPath() != VNCPath || b.streamer() != "x11vnc" {
		t.Fatalf("path %q streamer %q", b.StreamPath(), b.streamer())
	}
	rec := httptest.NewRecorder()
	b.ServeStream(rec, httptest.NewRequest(http.MethodGet, StreamPath, nil))
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status %d", rec.Code)
	}
}

func TestBrowserStartStop(t *testing.T) {
	for _, bin := range []string{"chromium", "Xvfb", "x11vnc"} {
		if _, err := exec.LookPath(bin); err != nil {
			t.Skipf("%s not installed", bin)
		}
	}
	chromium, _ := exec.LookPath("chromium")
	b := New(Options{Chromium: chromium, Voxl: "voxl-not-installed", ProfileDir: t.TempDir(), Display: ":97", CDPPort: 19222, VNCPort: 15900,
		Log: slog.New(slog.NewTextHandler(io.Discard, nil))})
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()
	info, err := b.Start(ctx, 1280, 800, "about:blank")
	if err != nil {
		t.Fatal(err)
	}
	if !info.GetRunning() {
		t.Fatalf("not running: %v", info)
	}
	if b.Stop().GetRunning() {
		t.Fatal("still running after Stop")
	}
}
