package acp

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"testing"
)

import acpsdk "github.com/coder/acp-go-sdk"

func newTestClient(t *testing.T) (*client, string) {
	t.Helper()
	engine := NewEngine(Config{})
	return &client{turn: newTurn(engine, &testSink{}, "session-1")}, t.TempDir()
}

func TestClientReadsAndWritesTextFiles(t *testing.T) {
	acpClient, directory := newTestClient(t)
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

func TestClientRejectsRelativeAndForeignSessionPaths(t *testing.T) {
	acpClient, directory := newTestClient(t)
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
	acpClient, directory := newTestClient(t)
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
