package acp

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"testing"

	acpsdk "github.com/coder/acp-go-sdk"
)

func testACPClient(t *testing.T) (*client, string) {
	t.Helper()
	tool := &Tool{}
	turn := newTurn(tool, "session-1")
	return &client{turn: turn}, t.TempDir()
}

func TestReadAndWriteTextFile(t *testing.T) {
	client, cwd := testACPClient(t)
	path := filepath.Join(cwd, "nested", "file.txt")
	request := acpsdk.WriteTextFileRequest{SessionId: "session-1", Path: path, Content: "one\ntwo\nthree\n"}
	if _, err := client.WriteTextFile(context.Background(), request); err != nil {
		t.Fatalf("write text file: %v", err)
	}

	line, limit := 2, 2
	response, err := client.ReadTextFile(context.Background(), acpsdk.ReadTextFileRequest{
		SessionId: "session-1", Path: path, Line: &line, Limit: &limit,
	})
	if err != nil {
		t.Fatalf("read text file: %v", err)
	}
	if response.Content != "two\nthree" {
		t.Fatalf("read content = %q, want %q", response.Content, "two\nthree")
	}

	emptyPath := filepath.Join(cwd, "nested", "empty.txt")
	request.Path = emptyPath
	request.Content = ""
	if _, err := client.WriteTextFile(context.Background(), request); err != nil {
		t.Fatalf("write empty text file: %v", err)
	}
	response, err = client.ReadTextFile(context.Background(), acpsdk.ReadTextFileRequest{
		SessionId: "session-1", Path: emptyPath,
	})
	if err != nil {
		t.Fatalf("read empty text file: %v", err)
	}
	if response.Content != "" {
		t.Fatalf("empty read content = %q, want empty", response.Content)
	}

	if _, err := client.ReadTextFile(context.Background(), acpsdk.ReadTextFileRequest{
		SessionId: "session-1", Path: "relative.txt",
	}); err == nil {
		t.Fatal("relative read path unexpectedly succeeded")
	}
	if _, err := client.WriteTextFile(context.Background(), acpsdk.WriteTextFileRequest{
		SessionId: "session-1", Path: "relative.txt", Content: "content",
	}); err == nil {
		t.Fatal("relative write path unexpectedly succeeded")
	}
	if _, err := client.ReadTextFile(context.Background(), acpsdk.ReadTextFileRequest{
		SessionId: "wrong-session", Path: path,
	}); err == nil {
		t.Fatal("read for another session unexpectedly succeeded")
	}
	if _, err := client.WriteTextFile(context.Background(), acpsdk.WriteTextFileRequest{
		SessionId: "wrong-session", Path: path, Content: "content",
	}); err == nil {
		t.Fatal("write for another session unexpectedly succeeded")
	}
}

func TestWriteTextFileCreatesEmptyFile(t *testing.T) {
	client, cwd := testACPClient(t)
	path := filepath.Join(cwd, "empty", "file")
	if _, err := client.WriteTextFile(context.Background(), acpsdk.WriteTextFileRequest{
		SessionId: "session-1", Path: path,
	}); err != nil {
		t.Fatalf("write empty file: %v", err)
	}
	info, err := os.Stat(path)
	if err != nil {
		t.Fatalf("stat empty file: %v", err)
	}
	if info.Size() != 0 {
		t.Fatalf("empty file size = %d, want 0", info.Size())
	}
}

func TestReadTextFileRejectsCanceledAndOversizedReads(t *testing.T) {
	client, cwd := testACPClient(t)
	path := filepath.Join(cwd, "large.txt")
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

	request := acpsdk.ReadTextFileRequest{SessionId: "session-1", Path: path}
	if _, err := client.ReadTextFile(context.Background(), request); err == nil {
		t.Fatal("oversized read unexpectedly succeeded")
	}

	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	request.Path = filepath.Join(cwd, "missing.txt")
	if _, err := client.ReadTextFile(ctx, request); !errors.Is(err, context.Canceled) {
		t.Fatalf("canceled read error = %v, want context.Canceled", err)
	}
}
