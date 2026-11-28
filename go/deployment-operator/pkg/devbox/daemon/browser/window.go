package browser

import (
	"context"
	"encoding/json"
	"time"
)

// The X screen Xvfb starts at when voxl streams it. voxl's dynamic resolution (RandR) can only shrink a screen
// below the size it started at, so this is the largest viewer it follows.
const (
	maxScreenWidth  = 2560
	maxScreenHeight = 1600
)

// fitWindows sizes every Chromium window to the w x h screen. There's no window manager on the display, so
// windows keep their size when voxl resizes the screen to a viewer's.
func (b *Browser) fitWindows(ctx context.Context, w, h int) error {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	cdp, err := b.dialCDP(ctx)
	if err != nil {
		return err
	}
	defer cdp.Close()
	pages, err := cdp.pages(ctx)
	if err != nil {
		return err
	}
	windows := map[int]bool{}
	for _, t := range pages {
		var win struct {
			WindowID int `json:"windowId"`
		}
		if err := cdp.call(ctx, "", "Browser.getWindowForTarget", map[string]any{"targetId": t.ID}, &win); err != nil {
			continue
		}
		windows[win.WindowID] = true
	}
	for id := range windows {
		// a maximized or fullscreen window ignores bounds until it's normal again
		if err := cdp.call(ctx, "", "Browser.setWindowBounds", map[string]any{"windowId": id, "bounds": map[string]any{"windowState": "normal"}}, nil); err != nil {
			return err
		}
		// Chromium shrinks a window that would exactly cover the screen by a pixel (so WMs don't take it
		// for fullscreen), leaving a black edge; a pixel past the screen it keeps
		bounds := map[string]any{"left": 0, "top": 0, "width": w + 1, "height": h + 1}
		if err := cdp.call(ctx, "", "Browser.setWindowBounds", map[string]any{"windowId": id, "bounds": bounds}, nil); err != nil {
			return err
		}
	}
	b.mu.Lock()
	b.width, b.height = int32(w), int32(h)
	b.mu.Unlock()
	return nil
}

// sized reports whether Chromium's windows are already w x h.
func (b *Browser) sized(w, h int) bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	return int(b.width) == w && int(b.height) == h
}

// screenSize reads the geometry from a voxl hello, which voxl sends each viewer again once a resize is applied.
func screenSize(msg []byte) (w, h int, ok bool) {
	var hello struct {
		T string `json:"t"`
		W int    `json:"w"`
		H int    `json:"h"`
	}
	if json.Unmarshal(msg, &hello) != nil || hello.T != "hello" || hello.W <= 0 || hello.H <= 0 {
		return 0, 0, false
	}
	return hello.W, hello.H, true
}
