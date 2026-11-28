package browser

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os/exec"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/coder/websocket"
)

// fakeChromium serves Chromium's browser endpoint, answering each CDP call with respond and recording it.
func fakeChromium(t *testing.T, respond func(method string, params map[string]any) any) (*Browser, func() []string) {
	t.Helper()
	var mu sync.Mutex
	var calls []string
	var port int
	port = upstream(t, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/json/version" {
			_ = json.NewEncoder(w).Encode(map[string]string{"webSocketDebuggerUrl": fmt.Sprintf("ws://127.0.0.1:%d/devtools/browser/x", port)})
			return
		}
		c, err := websocket.Accept(w, r, nil)
		if err != nil {
			return
		}
		defer func() { _ = c.CloseNow() }()
		for {
			_, data, err := c.Read(r.Context())
			if err != nil {
				return
			}
			var req struct {
				ID     int            `json:"id"`
				Method string         `json:"method"`
				Params map[string]any `json:"params"`
			}
			_ = json.Unmarshal(data, &req)
			p, _ := json.Marshal(req.Params)
			mu.Lock()
			calls = append(calls, req.Method+" "+string(p))
			mu.Unlock()
			_ = c.Write(r.Context(), websocket.MessageText, []byte(`{"method":"Target.event","params":{}}`))
			resp, _ := json.Marshal(map[string]any{"id": req.ID, "result": respond(req.Method, req.Params)})
			_ = c.Write(r.Context(), websocket.MessageText, resp)
		}
	}))
	b := New(Options{Voxl: "voxl-not-installed", CDPPort: port - 1, Log: slog.New(slog.NewTextHandler(io.Discard, nil))})
	return b, func() []string {
		mu.Lock()
		defer mu.Unlock()
		return append([]string(nil), calls...)
	}
}

func TestFitWindowsSizesEveryChromiumWindow(t *testing.T) {
	b, calls := fakeChromium(t, func(method string, _ map[string]any) any {
		switch method {
		case "Target.getTargets":
			return map[string]any{"targetInfos": []map[string]string{
				{"targetId": "a", "type": "page"}, {"targetId": "b", "type": "page"}, {"targetId": "w", "type": "service_worker"},
			}}
		case "Browser.getWindowForTarget":
			// both tabs share a window
			return map[string]any{"windowId": 7}
		}
		return map[string]any{}
	})
	if err := b.fitWindows(context.Background(), 1000, 700); err != nil {
		t.Fatal(err)
	}
	want := []string{
		`Target.getTargets {}`,
		`Browser.getWindowForTarget {"targetId":"a"}`,
		`Browser.getWindowForTarget {"targetId":"b"}`,
		`Browser.setWindowBounds {"bounds":{"windowState":"normal"},"windowId":7}`,
		`Browser.setWindowBounds {"bounds":{"height":701,"left":0,"top":0,"width":1001},"windowId":7}`,
	}
	if got := calls(); strings.Join(got, "\n") != strings.Join(want, "\n") {
		t.Fatalf("calls:\n%s\nwant:\n%s", strings.Join(got, "\n"), strings.Join(want, "\n"))
	}
	if !b.sized(1000, 700) || b.Info().GetWidth() != 1000 {
		t.Fatalf("info %v", b.Info())
	}
}

func TestScreenSizeReadsHellos(t *testing.T) {
	if w, h, ok := screenSize([]byte(`{"t":"hello","w":1000,"h":700,"resize":{"scale":1}}`)); !ok || w != 1000 || h != 700 {
		t.Fatalf("got %d %d %v", w, h, ok)
	}
	for _, msg := range []string{`{"t":"ping","s":1}`, `{"t":"hello"}`, `not json`} {
		if _, _, ok := screenSize([]byte(msg)); ok {
			t.Fatalf("%s read as a hello", msg)
		}
	}
}

// voxlStack starts the real browser stack and a viewer on its stream; runs where the image's binaries are
// installed.
func voxlStack(t *testing.T, ctx context.Context, url string) (*Browser, *websocket.Conn) {
	t.Helper()
	for _, bin := range []string{"chromium", "Xvfb", "voxl"} {
		if _, err := exec.LookPath(bin); err != nil {
			t.Skipf("%s not installed", bin)
		}
	}
	chromium, _ := exec.LookPath("chromium")
	b := New(Options{Chromium: chromium, ProfileDir: t.TempDir(), Display: ":96", CDPPort: 19322, VoxlPort: 16901,
		Log: slog.New(slog.NewTextHandler(io.Discard, nil))})
	if _, err := b.Start(ctx, 0, 0, url); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { b.Stop() })
	srv := httptest.NewServer(http.HandlerFunc(b.ServeStream))
	t.Cleanup(srv.Close)
	c, _, err := websocket.Dial(ctx, "ws"+strings.TrimPrefix(srv.URL, "http")+StreamPath,
		&websocket.DialOptions{Subprotocols: []string{"voxl"}})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = c.CloseNow() })
	c.SetReadLimit(-1)
	return b, c
}

// nextText reads the stream until a text message of type typ.
func nextText(t *testing.T, ctx context.Context, c *websocket.Conn, typ string) map[string]any {
	t.Helper()
	for {
		kind, data, err := c.Read(ctx)
		if err != nil {
			t.Fatalf("read: %v", err)
		}
		var m map[string]any
		if kind == websocket.MessageText && json.Unmarshal(data, &m) == nil && m["t"] == typ {
			return m
		}
	}
}

// The screen and Chromium follow a viewer's size end to end.
func TestVoxlScreenFollowsTheViewer(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()
	b, c := voxlStack(t, ctx, "about:blank")
	hello := nextText(t, ctx, c, "hello")
	if hello["w"] != float64(maxScreenWidth) || hello["h"] != float64(maxScreenHeight) || hello["pick"] != true {
		t.Fatalf("first hello %v", hello)
	}
	_ = c.Write(ctx, websocket.MessageText, []byte("sz,1001,701"))
	if hello := nextText(t, ctx, c, "hello"); hello["w"] != float64(1000) || hello["h"] != float64(700) {
		t.Fatalf("resized hello %v, want 1000x700", hello)
	}
	for !b.sized(1000, 700) {
		if ctx.Err() != nil {
			t.Fatalf("chromium wasn't fitted: %v", b.Info())
		}
		time.Sleep(100 * time.Millisecond)
	}
	cdp, err := b.dialCDP(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer cdp.Close()
	pages, err := cdp.pages(ctx)
	if err != nil {
		t.Fatal(err)
	}
	for _, p := range pages {
		var win struct {
			Bounds struct{ Width, Height int } `json:"bounds"`
		}
		if err := cdp.call(ctx, "", "Browser.getWindowForTarget", map[string]any{"targetId": p.ID}, &win); err != nil {
			t.Fatal(err)
		}
		t.Logf("chromium window %dx%d", win.Bounds.Width, win.Bounds.Height)
		if win.Bounds.Width < 1000 || win.Bounds.Height < 700 {
			t.Fatalf("chromium window %dx%d, want at least 1000x700", win.Bounds.Width, win.Bounds.Height)
		}
	}
}

// A viewer picks an element by clicking it through the stream, the way a person does.
func TestVoxlViewerPicksAnElement(t *testing.T) {
	page := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.WriteString(w, `<!doctype html><title>Settings</title><body style="margin:0">
<form><div class="row"><button type="button" data-testid="save" style="position:absolute;left:200px;top:150px;width:160px;height:60px">Save   changes</button></div></form>`)
	}))
	defer page.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()
	b, c := voxlStack(t, ctx, page.URL)
	nextText(t, ctx, c, "hello")

	// where the button is on the screen: the page's offset in the window plus the button's in the page
	cdp, err := b.dialCDP(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer cdp.Close()
	var session string
	for session == "" && ctx.Err() == nil {
		s, err := visiblePage(ctx, cdp)
		if err != nil {
			t.Fatal(err)
		}
		var ready struct {
			Result struct {
				Value bool `json:"value"`
			} `json:"result"`
		}
		_ = cdp.call(ctx, s, "Runtime.evaluate", map[string]any{"expression": `!!document.querySelector("[data-testid=save]")`, "returnByValue": true}, &ready)
		if ready.Result.Value {
			session = s
		} else {
			time.Sleep(200 * time.Millisecond)
		}
	}
	var at struct {
		Result struct {
			Value struct{ X, Y float64 } `json:"value"`
		} `json:"result"`
	}
	if err := cdp.call(ctx, session, "Runtime.evaluate", map[string]any{"returnByValue": true, "expression": `(() => {
		const r = document.querySelector("[data-testid=save]").getBoundingClientRect()
		return { x: window.screenX + (outerWidth - innerWidth) + r.x + r.width / 2, y: window.screenY + (outerHeight - innerHeight) + r.y + r.height / 2 }
	})()`}, &at); err != nil {
		t.Fatal(err)
	}

	_ = c.Write(ctx, websocket.MessageText, []byte("pk,1"))
	time.Sleep(time.Second)
	for _, cmd := range []string{fmt.Sprintf("m,%d,%d", int(at.Result.Value.X)-5, int(at.Result.Value.Y)-5), fmt.Sprintf("m,%d,%d", int(at.Result.Value.X), int(at.Result.Value.Y)), "b,1,1", "b,1,0"} {
		_ = c.Write(ctx, websocket.MessageText, []byte(cmd))
		time.Sleep(150 * time.Millisecond)
	}
	msg := nextText(t, ctx, c, "pick")
	el, _ := msg["element"].(map[string]any)
	if el == nil {
		t.Fatalf("pick %v", msg)
	}
	t.Logf("picked %v", el)
	if el["selector"] != `button[data-testid="save"]` || el["tag"] != "button" || el["text"] != "Save changes" ||
		el["title"] != "Settings" || !strings.HasPrefix(el["url"].(string), page.URL) || !strings.Contains(el["html"].(string), `data-testid="save"`) {
		t.Fatalf("picked %v", el)
	}

	// the click went to the inspector, not the page, and inspect mode ends with the pick
	_ = c.Write(ctx, websocket.MessageText, []byte("pk,1"))
	time.Sleep(500 * time.Millisecond)
	_ = c.Write(ctx, websocket.MessageText, []byte("pk,0"))
	if msg := nextText(t, ctx, c, "pick"); msg["cancelled"] != true {
		t.Fatalf("stopped pick %v", msg)
	}
}

func TestPickCommandsAndHellos(t *testing.T) {
	if on, ok := pickCommand([]byte("pk,1")); !on || !ok {
		t.Fatal("pk,1 starts a pick")
	}
	if on, ok := pickCommand([]byte("pk,0")); on || !ok {
		t.Fatal("pk,0 stops one")
	}
	if _, ok := pickCommand([]byte("m,1,2")); ok {
		t.Fatal("voxl's commands pass through")
	}
	var m map[string]any
	if err := json.Unmarshal(withPick([]byte(`{"t":"hello","w":10,"h":20}`)), &m); err != nil || m["pick"] != true || m["w"] != float64(10) {
		t.Fatalf("hello %v %v", m, err)
	}
}
