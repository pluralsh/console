package terminal

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/coder/websocket"
	"google.golang.org/grpc/codes"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/derr"
)

// Attach serves one attached client. recv returns client frames (the first must be `attach`); send writes
// output. It returns when the client goes away or the terminal exits (after sending `exit`).
func (m *Manager) Attach(ctx context.Context, recv func() (*devboxv1.TerminalInput, error), send func(*devboxv1.TerminalOutput) error) error {
	first, err := recv()
	if err != nil {
		return err
	}
	at := first.GetAttach()
	if at == nil {
		return derr.New(codes.InvalidArgument, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED, "first frame must be attach", nil)
	}
	t, err := m.Get(at.GetTerminalId())
	if err != nil {
		return err
	}
	return t.serve(ctx, at.GetFromOffset(), recv, send)
}

func (t *Terminal) serve(ctx context.Context, from uint64, recv func() (*devboxv1.TerminalInput, error), send func(*devboxv1.TerminalOutput) error) error {
	t.mu.Lock()
	t.attached++
	t.mu.Unlock()
	defer func() {
		t.mu.Lock()
		t.attached--
		t.mu.Unlock()
	}()
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()
	if err := send(&devboxv1.TerminalOutput{Output: &devboxv1.TerminalOutput_Info{Info: t.Info()}}); err != nil {
		return err
	}
	inErr := make(chan error, 1)
	go func() {
		for {
			in, err := recv()
			if err != nil {
				inErr <- err
				return
			}
			switch v := in.GetInput().(type) {
			case *devboxv1.TerminalInput_Data:
				if err := t.Write(v.Data); err != nil {
					inErr <- err
					return
				}
			case *devboxv1.TerminalInput_Resize:
				_ = t.Resize(v.Resize.GetCols(), v.Resize.GetRows())
			}
		}
	}()
	outErr := make(chan error, 1)
	go func() {
		off := from
		for {
			data, at, exit, err := t.Read(ctx, off)
			if err != nil {
				outErr <- err
				return
			}
			if exit != nil {
				_ = send(&devboxv1.TerminalOutput{Output: &devboxv1.TerminalOutput_Exit{Exit: exit}})
				outErr <- nil
				return
			}
			if err := send(&devboxv1.TerminalOutput{Output: &devboxv1.TerminalOutput_Data{Data: &devboxv1.TerminalData{Data: data, Offset: at}}}); err != nil {
				outErr <- err
				return
			}
			off = at + uint64(len(data))
		}
	}()
	select {
	case err := <-inErr:
		if errors.Is(err, io.EOF) {
			return nil
		}
		return err
	case err := <-outErr:
		return err
	}
}

// wsControl is a JSON text frame on /terminals/<id>/ws. Binary frames carry raw terminal bytes both ways.
//
// Client -> daemon: {"type":"resize","cols":120,"rows":32}.
// Daemon -> client: {"type":"info", ...TerminalInfo}, {"type":"output","offset":N} before each binary output
// frame whose offset isn't contiguous, and {"type":"exit","exitCode":0,"signal":""}.
type wsControl struct {
	Type     string `json:"type"`
	Cols     int32  `json:"cols,omitempty"`
	Rows     int32  `json:"rows,omitempty"`
	Offset   uint64 `json:"offset,omitempty"`
	ExitCode *int32 `json:"exitCode,omitempty"`
	Signal   string `json:"signal,omitempty"`

	TerminalID       string `json:"terminalId,omitempty"`
	Cwd              string `json:"cwd,omitempty"`
	Command          string `json:"command,omitempty"`
	ForegroundCmd    string `json:"foregroundCommand,omitempty"`
	OutputOffset     uint64 `json:"outputOffset,omitempty"`
	Exited           bool   `json:"exited,omitempty"`
	TerminalExitCode *int32 `json:"terminalExitCode,omitempty"`
}

// ServeWS serves GET /terminals/<id>/ws[?offset=N]. The router and KAS handle stream authorization; the daemon
// only accepts the gateway's upgrade.
func (m *Manager) ServeWS(w http.ResponseWriter, r *http.Request) {
	rest := strings.TrimPrefix(r.URL.Path, "/terminals/")
	id, ok := strings.CutSuffix(rest, "/ws")
	if !ok || id == "" || strings.Contains(id, "/") {
		http.NotFound(w, r)
		return
	}
	t, err := m.Get(id)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	var from uint64
	for _, k := range []string{"offset", "from_offset"} {
		if v := r.URL.Query().Get(k); v != "" {
			from, _ = strconv.ParseUint(v, 10, 64)
		}
	}
	c, err := websocket.Accept(w, r, &websocket.AcceptOptions{InsecureSkipVerify: true})
	if err != nil {
		return
	}
	defer func() { _ = c.CloseNow() }()
	c.SetReadLimit(1 << 20)
	ctx := r.Context()
	next := from
	recv := func() (*devboxv1.TerminalInput, error) {
		for {
			typ, data, err := c.Read(ctx)
			if err != nil {
				if websocket.CloseStatus(err) != -1 {
					return nil, io.EOF
				}
				return nil, err
			}
			if typ == websocket.MessageBinary {
				return &devboxv1.TerminalInput{Input: &devboxv1.TerminalInput_Data{Data: data}}, nil
			}
			var ctl wsControl
			if json.Unmarshal(data, &ctl) != nil {
				continue
			}
			if ctl.Type == "resize" {
				return &devboxv1.TerminalInput{Input: &devboxv1.TerminalInput_Resize{Resize: &devboxv1.TerminalSize{Cols: ctl.Cols, Rows: ctl.Rows}}}, nil
			}
		}
	}
	writeJSON := func(v wsControl) error {
		b, _ := json.Marshal(v)
		return c.Write(ctx, websocket.MessageText, b)
	}
	send := func(out *devboxv1.TerminalOutput) error {
		switch v := out.GetOutput().(type) {
		case *devboxv1.TerminalOutput_Info:
			i := v.Info
			return writeJSON(wsControl{Type: "info", TerminalID: i.GetTerminalId(), Cwd: i.GetCwd(), Command: i.GetCommand(),
				Cols: i.GetCols(), Rows: i.GetRows(), ForegroundCmd: i.GetForegroundCommand(), OutputOffset: i.GetOutputOffset(),
				Exited: i.GetExited(), TerminalExitCode: i.ExitCode})
		case *devboxv1.TerminalOutput_Data:
			if v.Data.GetOffset() != next {
				if err := writeJSON(wsControl{Type: "output", Offset: v.Data.GetOffset()}); err != nil {
					return err
				}
			}
			next = v.Data.GetOffset() + uint64(len(v.Data.GetData()))
			return c.Write(ctx, websocket.MessageBinary, v.Data.GetData())
		case *devboxv1.TerminalOutput_Exit:
			_ = writeJSON(wsControl{Type: "exit", ExitCode: v.Exit.ExitCode, Signal: v.Exit.GetSignal()})
			return c.Close(websocket.StatusNormalClosure, "exited")
		}
		return nil
	}
	if err := t.serve(ctx, from, recv, send); err != nil && !errors.Is(err, context.Canceled) {
		_ = c.Close(websocket.StatusInternalError, err.Error())
		return
	}
	_ = c.Close(websocket.StatusNormalClosure, "")
}
