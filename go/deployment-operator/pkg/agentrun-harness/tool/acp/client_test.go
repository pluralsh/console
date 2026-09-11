package acp

import (
	"context"
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"testing"
	"time"
)

import acpsdk "github.com/coder/acp-go-sdk"

import console "github.com/pluralsh/console/go/client"

func newTestClient(t *testing.T, fileSystemWrite bool) (*client, string) {
	t.Helper()
	directory := t.TempDir()
	root, err := os.OpenRoot(directory)
	if err != nil {
		t.Fatalf("open test root: %v", err)
	}
	t.Cleanup(func() { _ = root.Close() })
	engine := NewEngine()
	return newClient(
		newTurn(engine, &testSink{}, "session-1"),
		directory,
		root,
		fileSystemWrite,
	), directory
}

func TestClientReadsAndWritesTextFiles(t *testing.T) {
	acpClient, directory := newTestClient(t, true)
	path := filepath.Join(directory, "nested", "file.txt")
	if _, err := acpClient.WriteTextFile(context.Background(), acpsdk.WriteTextFileRequest{SessionId: "session-1", Path: path, Content: "one\ntwo\nthree\n"}); err != nil {
		t.Fatalf("write text file: %v", err)
	}
	line, limit := 2, 2
	response, err := acpClient.ReadTextFile(context.Background(), acpsdk.ReadTextFileRequest{SessionId: "session-1", Path: path, Line: &line, Limit: &limit})
	if err != nil {
		t.Fatalf("read text file: %v", err)
	}
	if response.Content != "two\nthree" {
		t.Fatalf("read content = %q", response.Content)
	}
}

func TestClientReadTextFileCancellationWhileWaitingForAdmission(t *testing.T) {
	acpClient, directory := newTestClient(t, true)
	path := filepath.Join(directory, "file.txt")
	if err := os.WriteFile(path, []byte("content"), 0o600); err != nil {
		t.Fatalf("write text file: %v", err)
	}
	if err := acpClient.acquireTextFileRead(context.Background()); err != nil {
		t.Fatalf("hold text file read slot: %v", err)
	}
	if slots := cap(acpClient.textFileReadSlots); slots != 1 {
		t.Fatalf("text file read slot capacity = %d, want 1", slots)
	}

	var releaseOnce sync.Once
	release := func() {
		releaseOnce.Do(acpClient.releaseTextFileRead)
	}
	t.Cleanup(release)

	baseCtx, cancel := context.WithCancel(context.Background())
	ctx := &observedDoneContext{
		Context:  baseCtx,
		observed: make(chan struct{}),
	}
	readDone := make(chan error, 1)
	go func() {
		_, err := acpClient.ReadTextFile(ctx, acpsdk.ReadTextFileRequest{
			SessionId: "session-1",
			Path:      path,
		})
		readDone <- err
	}()

	select {
	case <-ctx.observed:
	case <-time.After(time.Second):
		t.Fatal("read did not wait for admission")
	}
	cancel()

	select {
	case err := <-readDone:
		if !errors.Is(err, context.Canceled) {
			t.Fatalf("queued read error = %v, want context canceled", err)
		}
	case <-time.After(time.Second):
		t.Fatal("queued read did not return after cancellation")
	}

	if slots := len(acpClient.textFileReadSlots); slots != maxConcurrentTextFileReads {
		t.Fatalf("occupied text file read slots = %d, want %d", slots, maxConcurrentTextFileReads)
	}
	release()
	if slots := len(acpClient.textFileReadSlots); slots != 0 {
		t.Fatalf("occupied text file read slots after release = %d, want 0", slots)
	}
}

func TestClientReadTextFileRejectsMissingAdmissionGate(t *testing.T) {
	acpClient, directory := newTestClient(t, true)
	acpClient.textFileReadSlots = nil
	path := filepath.Join(directory, "file.txt")
	if err := os.WriteFile(path, []byte("content"), 0o600); err != nil {
		t.Fatalf("write text file: %v", err)
	}

	_, err := acpClient.ReadTextFile(context.Background(), acpsdk.ReadTextFileRequest{
		SessionId: "session-1",
		Path:      path,
	})
	if !errors.Is(err, errReadGateUninitialized) {
		t.Fatalf("missing text file read gate error = %v, want %v", err, errReadGateUninitialized)
	}
}

type observedDoneContext struct {
	context.Context
	observed     chan struct{}
	observedOnce sync.Once
}

func (ctx *observedDoneContext) Done() <-chan struct{} {
	ctx.observedOnce.Do(func() { close(ctx.observed) })
	return ctx.Context.Done()
}

func TestClientReadTextFileCancellationRetainsResourceOwnership(t *testing.T) {
	underlying := &blockingReadCloser{
		readStarted:  make(chan struct{}),
		closeStarted: make(chan struct{}),
		releaseRead:  make(chan struct{}),
		releaseClose: make(chan struct{}),
		read:         1,
	}
	t.Cleanup(underlying.release)

	ctx, cancel := context.WithCancel(context.Background())
	readDone := make(chan error, 1)
	go func() {
		_, err := (&client{}).readTextFile(ctx, underlying, acpsdk.ReadTextFileRequest{Path: "/file.txt"})
		readDone <- err
	}()

	select {
	case <-underlying.readStarted:
	case <-time.After(time.Second):
		t.Fatal("underlying read did not start")
	}
	cancel()

	select {
	case <-underlying.closeStarted:
		t.Fatal("cancellation started close concurrently with the blocked read")
	case err := <-readDone:
		t.Fatalf("canceled read returned before the owned read stopped: %v", err)
	case <-time.After(100 * time.Millisecond):
	}

	underlying.unblockRead()
	select {
	case <-underlying.closeStarted:
	case <-time.After(time.Second):
		t.Fatal("underlying close did not start after the read stopped")
	}

	select {
	case err := <-readDone:
		t.Fatalf("canceled read returned before the owned close stopped: %v", err)
	case <-time.After(100 * time.Millisecond):
	}

	underlying.unblockClose()
	select {
	case err := <-readDone:
		if !errors.Is(err, context.Canceled) {
			t.Fatalf("canceled read error = %v, want context canceled", err)
		}
	case <-time.After(time.Second):
		t.Fatal("canceled read did not return after cleanup completed")
	}
}

func TestClientReadTextFileCancellationTakesPrecedenceOverEOF(t *testing.T) {
	underlying := &blockingReadCloser{
		readStarted:  make(chan struct{}),
		closeStarted: make(chan struct{}),
		releaseRead:  make(chan struct{}),
		releaseClose: make(chan struct{}),
		readErr:      io.EOF,
	}
	t.Cleanup(underlying.release)

	ctx, cancel := context.WithCancel(context.Background())
	readDone := make(chan error, 1)
	go func() {
		_, err := (&client{}).readTextFile(ctx, underlying, acpsdk.ReadTextFileRequest{Path: "/file.txt"})
		readDone <- err
	}()

	select {
	case <-underlying.readStarted:
	case <-time.After(time.Second):
		t.Fatal("underlying read did not start")
	}
	cancel()
	underlying.unblockRead()

	select {
	case <-underlying.closeStarted:
	case <-time.After(time.Second):
		t.Fatal("underlying close did not start after EOF")
	}

	select {
	case err := <-readDone:
		t.Fatalf("canceled read returned before the owned close stopped: %v", err)
	case <-time.After(100 * time.Millisecond):
	}

	underlying.unblockClose()
	select {
	case err := <-readDone:
		if !errors.Is(err, context.Canceled) {
			t.Fatalf("canceled EOF read error = %v, want context canceled", err)
		}
	case <-time.After(time.Second):
		t.Fatal("canceled EOF read did not return after cleanup completed")
	}
}

type blockingReadCloser struct {
	readStarted      chan struct{}
	closeStarted     chan struct{}
	releaseRead      chan struct{}
	releaseClose     chan struct{}
	readStartedOnce  sync.Once
	releaseReadOnce  sync.Once
	releaseCloseOnce sync.Once
	readCount        int
	read             int
	readErr          error
}

func (reader *blockingReadCloser) Read([]byte) (int, error) {
	reader.readStartedOnce.Do(func() { close(reader.readStarted) })
	<-reader.releaseRead
	reader.readCount++
	if reader.readCount > 1 {
		return 0, io.EOF
	}
	return reader.read, reader.readErr
}

func (reader *blockingReadCloser) Close() error {
	close(reader.closeStarted)
	<-reader.releaseClose
	return nil
}

func (reader *blockingReadCloser) release() {
	reader.unblockRead()
	reader.unblockClose()
}

func (reader *blockingReadCloser) unblockRead() {
	reader.releaseReadOnce.Do(func() { close(reader.releaseRead) })
}

func (reader *blockingReadCloser) unblockClose() {
	reader.releaseCloseOnce.Do(func() { close(reader.releaseClose) })
}

func TestClientRejectsWritesWithoutPermission(t *testing.T) {
	acpClient, directory := newTestClient(t, false)
	path := filepath.Join(directory, "nested", "file.txt")

	_, err := acpClient.WriteTextFile(context.Background(), acpsdk.WriteTextFileRequest{
		SessionId: "session-1",
		Path:      path,
		Content:   "content",
	})
	if err == nil {
		t.Fatal("write without permission unexpectedly succeeded")
	}
	if _, err := os.Stat(filepath.Dir(path)); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("write parent directory error = %v, want not exist", err)
	}
}

func TestClientRequestPermissionStartsToolCallBeforeDenying(t *testing.T) {
	sink := &testSink{}
	acpClient := &client{turn: newTurn(NewEngine(), sink, "session-1")}
	title := "Run command"
	kind := acpsdk.ToolKindExecute

	_, err := acpClient.RequestPermission(context.Background(), acpsdk.RequestPermissionRequest{
		SessionId: "session-1",
		ToolCall: acpsdk.ToolCallUpdate{
			ToolCallId: "call-1",
			Title:      &title,
			Kind:       &kind,
		},
	})
	if err == nil || err.Error() != "acp permission requests are unavailable in unattended runs" {
		t.Fatalf("permission error = %v, want unattended permission denial", err)
	}
	if len(sink.messages) != 1 {
		t.Fatalf("permission-start tool messages = %d, want 1", len(sink.messages))
	}
	if state := sink.messages[0].Metadata.Tool.State; state == nil || *state != console.AgentMessageToolStatePending {
		t.Fatalf("permission-start tool state = %v, want pending", state)
	}

	completed := acpsdk.ToolCallStatusCompleted
	err = acpClient.SessionUpdate(context.Background(), acpsdk.SessionNotification{
		SessionId: "session-1",
		Update: acpsdk.SessionUpdate{ToolCallUpdate: &acpsdk.SessionToolCallUpdate{
			ToolCallId: "call-1",
			Status:     &completed,
		}},
	})
	if err != nil {
		t.Fatalf("tool call update after permission denial: %v", err)
	}
	if len(sink.messages) != 2 {
		t.Fatalf("tool call messages = %d, want 2", len(sink.messages))
	}
}

func TestClientTerminalRequestsAreUnavailable(t *testing.T) {
	const expected = "acp terminal requests are unavailable in unattended runs"

	tests := []struct {
		name string
		call func() error
	}{
		{
			name: "create",
			call: func() error {
				_, err := (&client{}).CreateTerminal(context.Background(), acpsdk.CreateTerminalRequest{})
				return err
			},
		},
		{
			name: "kill",
			call: func() error {
				_, err := (&client{}).KillTerminal(context.Background(), acpsdk.KillTerminalRequest{})
				return err
			},
		},
		{
			name: "output",
			call: func() error {
				_, err := (&client{}).TerminalOutput(context.Background(), acpsdk.TerminalOutputRequest{})
				return err
			},
		},
		{
			name: "release",
			call: func() error {
				_, err := (&client{}).ReleaseTerminal(context.Background(), acpsdk.ReleaseTerminalRequest{})
				return err
			},
		},
		{
			name: "wait for exit",
			call: func() error {
				_, err := (&client{}).WaitForTerminalExit(context.Background(), acpsdk.WaitForTerminalExitRequest{})
				return err
			},
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if err := test.call(); err == nil || err.Error() != expected {
				t.Fatalf("terminal request error = %v, want %q", err, expected)
			}
		})
	}
}

func TestClientRejectsToolCallUpdateBeforeToolCallByDefault(t *testing.T) {
	acpClient := &client{turn: newTurn(NewEngine(), &testSink{}, "session-1")}
	completed := acpsdk.ToolCallStatusCompleted
	err := acpClient.SessionUpdate(context.Background(), acpsdk.SessionNotification{
		SessionId: "session-1",
		Update: acpsdk.SessionUpdate{ToolCallUpdate: &acpsdk.SessionToolCallUpdate{
			ToolCallId: "call-1",
			Status:     &completed,
		}},
	})
	if err == nil || err.Error() != `acp tool call update "call-1" arrived before tool_call` {
		t.Fatalf("tool call update error = %v", err)
	}
}

func TestClientRejectsEmptyToolCallUpdateID(t *testing.T) {
	acpClient := &client{turn: newTurn(NewEngine(), &testSink{}, "session-1")}
	err := acpClient.SessionUpdate(context.Background(), acpsdk.SessionNotification{
		SessionId: "session-1",
		Update:    acpsdk.SessionUpdate{ToolCallUpdate: &acpsdk.SessionToolCallUpdate{}},
	})
	if err == nil || err.Error() != "acp tool call update has an empty id" {
		t.Fatalf("empty tool call update error = %v", err)
	}
}

func TestClientRejectsDuplicateToolCallStarts(t *testing.T) {
	acpClient := &client{turn: newTurn(NewEngine(), &testSink{}, "session-1")}
	update := acpsdk.SessionUpdateToolCall{ToolCallId: "call-1", Status: acpsdk.ToolCallStatusInProgress}
	request := acpsdk.SessionNotification{SessionId: "session-1", Update: acpsdk.SessionUpdate{ToolCall: &update}}
	if err := acpClient.SessionUpdate(context.Background(), request); err != nil {
		t.Fatalf("start tool call: %v", err)
	}
	err := acpClient.SessionUpdate(context.Background(), request)
	if err == nil || err.Error() != `acp tool call "call-1" was started twice` {
		t.Fatalf("duplicate tool call error = %v", err)
	}
}

func TestClientMapsStartContentToOutputByDefault(t *testing.T) {
	sink := &testSink{}
	acpClient := &client{turn: newTurn(NewEngine(), sink, "session-1")}
	inProgress := acpsdk.ToolCallStatusInProgress
	err := acpClient.SessionUpdate(context.Background(), acpsdk.SessionNotification{
		SessionId: "session-1",
		Update: acpsdk.SessionUpdate{ToolCall: &acpsdk.SessionUpdateToolCall{
			ToolCallId: "call-1", Status: inProgress,
			Content: []acpsdk.ToolCallContent{acpsdk.ToolContent(acpsdk.TextBlock(`{"command":"git status"}`))},
		}},
	})
	if err != nil {
		t.Fatalf("start tool call: %v", err)
	}
	if len(sink.messages) != 1 || sink.messages[0].Metadata.Tool.Input != nil || *sink.messages[0].Metadata.Tool.Output != `{"command":"git status"}` {
		t.Fatalf("default tool mapping = %#v", sink.messages)
	}
	if len(sink.outputs) != 1 || sink.outputs[0] != `call-1:{"command":"git status"}` {
		t.Fatalf("default output events = %v", sink.outputs)
	}
}

func TestClientMapsRawInputAndStartContent(t *testing.T) {
	sink := &testSink{}
	acpClient := &client{turn: newTurn(NewEngine(), sink, "session-1")}
	inProgress := acpsdk.ToolCallStatusInProgress
	err := acpClient.SessionUpdate(context.Background(), acpsdk.SessionNotification{
		SessionId: "session-1",
		Update: acpsdk.SessionUpdate{ToolCall: &acpsdk.SessionUpdateToolCall{
			ToolCallId: "call-1", Status: inProgress, RawInput: map[string]any{"command": "git status"},
			Content: []acpsdk.ToolCallContent{acpsdk.ToolContent(acpsdk.TextBlock("displayed output"))},
		}},
	})
	if err != nil {
		t.Fatalf("start tool call: %v", err)
	}
	tool := sink.messages[0].Metadata.Tool
	if tool.Input == nil || *tool.Input != `{"command":"git status"}` || tool.Output == nil || *tool.Output != "displayed output" {
		t.Fatalf("raw input tool mapping = %#v", tool)
	}
	if len(sink.outputs) != 1 || sink.outputs[0] != "call-1:displayed output" {
		t.Fatalf("raw input output events = %v", sink.outputs)
	}
}

func TestClientKeepsTerminalStartContentAsOutput(t *testing.T) {
	sink := &testSink{}
	acpClient := &client{turn: newTurn(NewEngine(), sink, "session-1")}
	completed := acpsdk.ToolCallStatusCompleted
	err := acpClient.SessionUpdate(context.Background(), acpsdk.SessionNotification{
		SessionId: "session-1",
		Update: acpsdk.SessionUpdate{ToolCall: &acpsdk.SessionUpdateToolCall{
			ToolCallId: "call-1", Status: completed,
			Content: []acpsdk.ToolCallContent{acpsdk.ToolContent(acpsdk.TextBlock("actual output"))},
		}},
	})
	if err != nil {
		t.Fatalf("start terminal tool call: %v", err)
	}
	tool := sink.messages[0].Metadata.Tool
	if tool.Input != nil || tool.Output == nil || *tool.Output != "actual output" {
		t.Fatalf("terminal start mapping = %#v", tool)
	}
	if len(sink.outputs) != 0 {
		t.Fatalf("terminal start output events = %v", sink.outputs)
	}
	if _, exists := acpClient.turn.tools["call-1"]; exists {
		t.Fatal("terminal start remained active")
	}
}

func TestClientRequestPermissionUpdatesExistingToolCallBeforeDenying(t *testing.T) {
	sink := &testSink{}
	acpClient := &client{turn: newTurn(NewEngine(), sink, "session-1")}
	inProgress := acpsdk.ToolCallStatusInProgress
	execute := acpsdk.ToolKindExecute
	if err := acpClient.SessionUpdate(context.Background(), acpsdk.SessionNotification{
		SessionId: "session-1",
		Update: acpsdk.SessionUpdate{ToolCall: &acpsdk.SessionUpdateToolCall{
			ToolCallId: "call-1",
			Kind:       execute,
			Status:     inProgress,
		}},
	}); err != nil {
		t.Fatalf("start tool call: %v", err)
	}

	read := acpsdk.ToolKindRead
	_, err := acpClient.RequestPermission(context.Background(), acpsdk.RequestPermissionRequest{
		SessionId: "session-1",
		ToolCall: acpsdk.ToolCallUpdate{
			ToolCallId: "call-1",
			Kind:       &read,
			RawInput:   map[string]any{"command": "rm -rf build"},
		},
	})
	if err == nil || err.Error() != "acp permission requests are unavailable in unattended runs" {
		t.Fatalf("permission error = %v, want unattended permission denial", err)
	}
	if len(sink.messages) != 2 {
		t.Fatalf("tool call messages = %d, want 2", len(sink.messages))
	}
	tool := sink.messages[1].Metadata.Tool
	if tool.Name == nil || *tool.Name != string(read) {
		t.Fatalf("updated tool name = %v, want %q", tool.Name, read)
	}
	if tool.Input == nil || *tool.Input != `{"command":"rm -rf build"}` {
		t.Fatalf("updated tool input = %v", tool.Input)
	}
}

func TestClientRequestPermissionReturnsSessionAndToolCallErrors(t *testing.T) {
	acpClient := &client{turn: newTurn(NewEngine(), &testSink{}, "session-1")}
	for _, test := range []struct {
		name    string
		request acpsdk.RequestPermissionRequest
		want    string
	}{
		{
			name:    "foreign session",
			request: acpsdk.RequestPermissionRequest{SessionId: "session-2", ToolCall: acpsdk.ToolCallUpdate{ToolCallId: "call-1"}},
			want:    `acp request belongs to session "session-2", expected "session-1"`,
		},
		{
			name:    "missing tool call id",
			request: acpsdk.RequestPermissionRequest{SessionId: "session-1"},
			want:    "acp tool call has an empty id",
		},
	} {
		t.Run(test.name, func(t *testing.T) {
			_, err := acpClient.RequestPermission(context.Background(), test.request)
			if err == nil || err.Error() != test.want {
				t.Fatalf("permission error = %v, want %q", err, test.want)
			}
		})
	}
}

func TestClientRejectsWritesOutsideRoot(t *testing.T) {
	acpClient, _ := newTestClient(t, true)
	outside := t.TempDir()
	path := filepath.Join(outside, "nested", "file.txt")

	_, err := acpClient.WriteTextFile(context.Background(), acpsdk.WriteTextFileRequest{
		SessionId: "session-1",
		Path:      path,
		Content:   "content",
	})
	if err == nil {
		t.Fatal("outside-root write unexpectedly succeeded")
	}
	if _, err := os.Stat(filepath.Dir(path)); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("outside-root parent directory error = %v, want not exist", err)
	}
}

func TestClientRejectsWritesToRootDirectory(t *testing.T) {
	acpClient, directory := newTestClient(t, true)

	_, err := acpClient.WriteTextFile(context.Background(), acpsdk.WriteTextFileRequest{
		SessionId: "session-1",
		Path:      directory,
		Content:   "content",
	})
	if err == nil {
		t.Fatal("root-directory write unexpectedly succeeded")
	}
}

func TestClientRejectsWritesThroughSymlinkEscape(t *testing.T) {
	acpClient, directory := newTestClient(t, true)
	outside := t.TempDir()
	target, err := filepath.Rel(directory, outside)
	if err != nil {
		t.Fatalf("relative symlink target: %v", err)
	}
	if err := os.Symlink(target, filepath.Join(directory, "escape")); err != nil {
		t.Fatalf("create symlink: %v", err)
	}
	path := filepath.Join(directory, "escape", "file.txt")

	_, err = acpClient.WriteTextFile(context.Background(), acpsdk.WriteTextFileRequest{
		SessionId: "session-1",
		Path:      path,
		Content:   "content",
	})
	if err == nil {
		t.Fatal("symlink escape write unexpectedly succeeded")
	}
	if _, err := os.Stat(filepath.Join(outside, "file.txt")); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("symlink escape file error = %v, want not exist", err)
	}
}

func TestClientRejectsReadsOutsideRoot(t *testing.T) {
	acpClient, _ := newTestClient(t, true)
	path := filepath.Join(t.TempDir(), "outside.txt")
	if err := os.WriteFile(path, []byte("outside content"), 0o600); err != nil {
		t.Fatalf("write outside file: %v", err)
	}

	response, err := acpClient.ReadTextFile(context.Background(), acpsdk.ReadTextFileRequest{
		SessionId: "session-1",
		Path:      path,
	})
	if err == nil {
		t.Fatal("outside-root read unexpectedly succeeded")
	}
	if response.Content == "outside content" {
		t.Fatal("outside-root content was returned")
	}
	if !strings.Contains(err.Error(), path) {
		t.Fatalf("outside-root read error = %v, want original path %q", err, path)
	}
}

func TestClientRejectsReadsThroughSymlinkEscapes(t *testing.T) {
	acpClient, directory := newTestClient(t, true)
	outside := t.TempDir()
	outsideFile := filepath.Join(outside, "outside.txt")
	if err := os.WriteFile(outsideFile, []byte("outside content"), 0o600); err != nil {
		t.Fatalf("write outside file: %v", err)
	}
	outsideTarget, err := filepath.Rel(directory, outside)
	if err != nil {
		t.Fatalf("resolve relative outside target: %v", err)
	}
	for _, test := range []struct {
		name       string
		linkTarget string
		linkPath   string
		path       string
	}{
		{
			name:       "file",
			linkTarget: filepath.Join(outsideTarget, "outside.txt"),
			linkPath:   filepath.Join(directory, "outside-file"),
			path:       filepath.Join(directory, "outside-file"),
		},
		{
			name:       "directory",
			linkTarget: outsideTarget,
			linkPath:   filepath.Join(directory, "outside-directory"),
			path:       filepath.Join(directory, "outside-directory", "outside.txt"),
		},
	} {
		t.Run(test.name, func(t *testing.T) {
			if err := os.Symlink(test.linkTarget, test.linkPath); err != nil {
				t.Fatalf("create symlink: %v", err)
			}

			response, err := acpClient.ReadTextFile(context.Background(), acpsdk.ReadTextFileRequest{
				SessionId: "session-1",
				Path:      test.path,
			})
			if err == nil {
				t.Fatal("symlink escape read unexpectedly succeeded")
			}
			if response.Content == "outside content" {
				t.Fatal("symlink escape content was returned")
			}
			if !strings.Contains(err.Error(), test.path) {
				t.Fatalf("symlink escape read error = %v, want original path %q", err, test.path)
			}
		})
	}
}

func TestClientRejectsRelativeAndForeignSessionPaths(t *testing.T) {
	acpClient, directory := newTestClient(t, true)
	for _, request := range []acpsdk.ReadTextFileRequest{
		{SessionId: "session-1", Path: "relative.txt"},
		{SessionId: "other", Path: filepath.Join(directory, "file.txt")},
	} {
		if _, err := acpClient.ReadTextFile(context.Background(), request); err == nil {
			t.Fatalf("read request unexpectedly succeeded: %+v", request)
		}
	}
	for _, request := range []acpsdk.WriteTextFileRequest{
		{SessionId: "session-1", Path: "relative.txt", Content: "content"},
		{SessionId: "other", Path: filepath.Join(directory, "file.txt"), Content: "content"},
	} {
		if _, err := acpClient.WriteTextFile(context.Background(), request); err == nil {
			t.Fatalf("write request unexpectedly succeeded: %+v", request)
		}
	}
}

func TestClientRejectsOversizedAndCanceledReads(t *testing.T) {
	acpClient, directory := newTestClient(t, true)
	path := filepath.Join(directory, "large.txt")
	file, err := os.Create(path)
	if err != nil {
		t.Fatal(err)
	}
	if err := file.Truncate(maxTextFileBytes + 1); err != nil {
		t.Fatal(err)
	}
	if err := file.Close(); err != nil {
		t.Fatal(err)
	}
	if _, err := acpClient.ReadTextFile(context.Background(), acpsdk.ReadTextFileRequest{SessionId: "session-1", Path: path}); err == nil {
		t.Fatal("oversized read unexpectedly succeeded")
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	_, err = acpClient.ReadTextFile(ctx, acpsdk.ReadTextFileRequest{SessionId: "session-1", Path: path})
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("canceled read error = %v", err)
	}
}

func TestClientRejectsFIFOWithoutBlocking(t *testing.T) {
	acpClient, directory := newTestClient(t, true)
	path := filepath.Join(directory, "pipe")
	if err := syscall.Mkfifo(path, 0o600); err != nil {
		t.Fatalf("create FIFO: %v", err)
	}

	done := make(chan error, 1)
	go func() {
		_, err := acpClient.ReadTextFile(context.Background(), acpsdk.ReadTextFileRequest{SessionId: "session-1", Path: path})
		done <- err
	}()

	select {
	case err := <-done:
		if err == nil {
			t.Fatal("FIFO read unexpectedly succeeded")
		}
	case <-time.After(time.Second):
		t.Fatal("FIFO read blocked")
	}
}

func TestClientRejectsCanceledWritesBeforeFilesystemSideEffects(t *testing.T) {
	acpClient, directory := newTestClient(t, true)
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	path := filepath.Join(directory, "nested", "file.txt")

	_, err := acpClient.WriteTextFile(ctx, acpsdk.WriteTextFileRequest{SessionId: "session-1", Path: path, Content: "content"})
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("canceled write error = %v", err)
	}
	if _, err := os.Stat(filepath.Dir(path)); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("write parent directory error = %v, want not exist", err)
	}
}

type cancelAfterFirstCheckContext struct {
	context.Context
	checks int
}

func (ctx *cancelAfterFirstCheckContext) Err() error {
	ctx.checks++
	if ctx.checks > 1 {
		return context.Canceled
	}
	return nil
}
func TestClientRejectsCanceledWritesBetweenFilesystemSideEffects(t *testing.T) {
	acpClient, directory := newTestClient(t, true)
	path := filepath.Join(directory, "nested", "file.txt")

	ctx := &cancelAfterFirstCheckContext{Context: context.Background()}
	_, err := acpClient.WriteTextFile(ctx, acpsdk.WriteTextFileRequest{SessionId: "session-1", Path: path, Content: "content"})
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("canceled write error = %v", err)
	}
	if _, err := os.Stat(filepath.Dir(path)); err != nil {
		t.Fatalf("write parent directory error = %v, want directory", err)
	}
	if _, err := os.Stat(path); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("write file error = %v, want not exist", err)
	}
}
