package terminal

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"
	"github.com/creack/pty"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
)

func newManager(t *testing.T) *Manager {
	t.Helper()
	ptmx, tty, err := pty.Open()
	if err != nil {
		t.Skipf("pseudo-terminals unavailable here: %v", err)
	}
	ptmx.Close()
	tty.Close()
	m := New(Options{Home: t.TempDir(), Shell: "/bin/sh", Env: os.Environ, Log: slog.New(slog.NewTextHandler(io.Discard, nil))})
	t.Cleanup(m.CloseAll)
	return m
}

// readUntil reads from offset until the accumulated output contains want; it returns the output and the offset
// after it.
func readUntil(t *testing.T, term *Terminal, offset uint64, want string) (string, uint64) {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	var out bytes.Buffer
	for !strings.Contains(out.String(), want) {
		data, at, _, err := term.Read(ctx, offset)
		if err != nil {
			t.Fatalf("waiting for %q: %v (have %q)", want, err, out.String())
		}
		out.Write(data)
		offset = at + uint64(len(data))
	}
	return out.String(), offset
}

func TestReplayByOffset(t *testing.T) {
	m := newManager(t)
	info, err := m.Create(&devboxv1.CreateTerminalRequest{TerminalId: "t1", Command: "/bin/sh", Cols: 80, Rows: 24})
	if err != nil {
		t.Fatal(err)
	}
	if again, _ := m.Create(&devboxv1.CreateTerminalRequest{TerminalId: "t1"}); again.GetTerminalId() != info.GetTerminalId() {
		t.Fatal("Create is not idempotent")
	}
	term, err := m.Get("t1")
	if err != nil {
		t.Fatal(err)
	}
	if err := term.Write([]byte("echo first-$((40+2))\n")); err != nil {
		t.Fatal(err)
	}
	_, mark := readUntil(t, term, 0, "first-42")

	if err := term.Write([]byte("echo second-$((1+1))\n")); err != nil {
		t.Fatal(err)
	}
	tail, _ := readUntil(t, term, mark, "second-2")
	if strings.Contains(tail, "first-42") {
		t.Fatalf("read from offset %d replayed earlier output: %q", mark, tail)
	}
	all, _ := readUntil(t, term, 0, "second-2")
	if !strings.Contains(all, "first-42") {
		t.Fatalf("replay from 0 lost output: %q", all)
	}

	if _, err := m.Close("t1", ""); err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	end := uint64(0)
	for {
		data, at, exit, err := term.Read(ctx, end)
		if err != nil {
			t.Fatal(err)
		}
		if exit != nil {
			break
		}
		end = at + uint64(len(data))
	}
}

func TestWebSocketAttachReplay(t *testing.T) {
	m := newManager(t)
	if _, err := m.Create(&devboxv1.CreateTerminalRequest{TerminalId: "ws1", Command: "/bin/sh"}); err != nil {
		t.Fatal(err)
	}
	term, _ := m.Get("ws1")
	_ = term.Write([]byte("echo before-$((2*3))\n"))
	readUntil(t, term, 0, "before-6")

	srv := httptest.NewServer(http.HandlerFunc(m.ServeWS))
	defer srv.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	c, _, err := websocket.Dial(ctx, "ws"+strings.TrimPrefix(srv.URL, "http")+"/terminals/ws1/ws?offset=0", nil)
	if err != nil {
		t.Fatal(err)
	}
	defer c.CloseNow()

	var out bytes.Buffer
	sawInfo := false
	sentInput := false
	for !strings.Contains(out.String(), "after-12") {
		typ, data, err := c.Read(ctx)
		if err != nil {
			t.Fatalf("ws read: %v (have %q)", err, out.String())
		}
		if typ == websocket.MessageText {
			var ctl map[string]any
			_ = json.Unmarshal(data, &ctl)
			sawInfo = sawInfo || ctl["type"] == "info"
			continue
		}
		out.Write(data)
		if !sentInput && strings.Contains(out.String(), "before-6") {
			sentInput = true
			_ = c.Write(ctx, websocket.MessageText, []byte(`{"type":"resize","cols":100,"rows":30}`))
			_ = c.Write(ctx, websocket.MessageBinary, []byte("echo after-$((3*4))\n"))
		}
	}
	if !sawInfo {
		t.Fatal("no info control frame")
	}
	if got := term.Info(); got.GetCols() != 100 || got.GetRows() != 30 {
		t.Fatalf("resize not applied: %v", got)
	}
}
