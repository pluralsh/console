package acp

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"testing"
	"time"
)

import acpsdk "github.com/coder/acp-go-sdk"

func newTestClient(t *testing.T, fileSystemWrite bool) (*client, string) {
	t.Helper()
	directory := t.TempDir()
	root, err := os.OpenRoot(directory)
	if err != nil {
		t.Fatalf("open test root: %v", err)
	}
	t.Cleanup(func() { _ = root.Close() })
	engine := NewEngine()
	return &client{turn: newTurn(engine, &testSink{}, "session-1"), cwd: directory, root: root, fileSystemWrite: fileSystemWrite}, directory
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
