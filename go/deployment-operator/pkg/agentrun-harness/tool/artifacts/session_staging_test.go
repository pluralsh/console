package artifacts

import (
	"context"
	"errors"
	"os"
	stdexec "os/exec"
	"path/filepath"
	"testing"
	"time"
)

func TestStageSessionDirectory(t *testing.T) {
	source := t.TempDir()
	nested := filepath.Join(source, "nested")
	if err := os.Mkdir(nested, 0755); err != nil {
		t.Fatal(err)
	}
	file := filepath.Join(nested, "session.jsonl")
	if err := os.WriteFile(file, []byte("session data"), 0640); err != nil {
		t.Fatal(err)
	}
	if err := os.Chmod(file, 0640); err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(filepath.Join("nested", "session.jsonl"), filepath.Join(source, "latest")); err != nil {
		t.Fatal(err)
	}

	destination := filepath.Join(t.TempDir(), "staged")
	found, err := StageSessionDirectory(nil, source, destination)
	if err != nil {
		t.Fatalf("StageSessionDirectory() error = %v", err)
	}
	if !found {
		t.Fatal("StageSessionDirectory() found = false, want true")
	}

	assertMode(t, filepath.Join(destination, "nested", "session.jsonl"), 0640)
	content, err := os.ReadFile(filepath.Join(destination, "nested", "session.jsonl"))
	if err != nil {
		t.Fatal(err)
	}
	if string(content) != "session data" {
		t.Fatalf("staged content = %q", content)
	}
	link, err := os.Readlink(filepath.Join(destination, "latest"))
	if err != nil {
		t.Fatal(err)
	}
	if link != filepath.Join("nested", "session.jsonl") {
		t.Fatalf("staged symlink target = %q", link)
	}
}

func TestStageSessionDirectoryMissingSource(t *testing.T) {
	found, err := StageSessionDirectory(context.Background(), filepath.Join(t.TempDir(), "missing"), filepath.Join(t.TempDir(), "staged"))
	if err != nil {
		t.Fatalf("StageSessionDirectory() error = %v", err)
	}
	if found {
		t.Fatal("StageSessionDirectory() found = true, want false")
	}
}

func TestStageSessionDirectoryRejectsFile(t *testing.T) {
	source := filepath.Join(t.TempDir(), "session.jsonl")
	if err := os.WriteFile(source, []byte("session"), 0644); err != nil {
		t.Fatal(err)
	}

	_, err := StageSessionDirectory(context.Background(), source, filepath.Join(t.TempDir(), "staged"))
	if err == nil {
		t.Fatal("StageSessionDirectory() error = nil, want non-nil")
	}
}

func TestStageSessionDirectoryHonorsCancellation(t *testing.T) {
	source := t.TempDir()
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	_, err := StageSessionDirectory(ctx, source, filepath.Join(t.TempDir(), "staged"))
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("StageSessionDirectory() error = %v, want context canceled", err)
	}
}

func TestStageSessionDirectorySkipsFIFO(t *testing.T) {
	source := t.TempDir()
	if err := os.WriteFile(filepath.Join(source, "session.jsonl"), []byte("session"), 0644); err != nil {
		t.Fatal(err)
	}
	fifo := filepath.Join(source, "blocked.pipe")
	if err := stdexec.Command("mkfifo", fifo).Run(); err != nil {
		t.Skipf("mkfifo is unavailable: %v", err)
	}

	done := make(chan error, 1)
	destination := t.TempDir()
	go func() {
		_, err := StageSessionDirectory(context.Background(), source, destination)
		done <- err
	}()
	select {
	case err := <-done:
		if err != nil {
			t.Fatalf("StageSessionDirectory() error = %v", err)
		}
	case <-time.After(500 * time.Millisecond):
		t.Fatal("StageSessionDirectory() blocked on FIFO")
	}
	if _, err := os.Lstat(filepath.Join(destination, "blocked.pipe")); !os.IsNotExist(err) {
		t.Fatalf("FIFO was copied, lstat error = %v", err)
	}
}

func assertMode(t *testing.T, path string, want os.FileMode) {
	t.Helper()
	info, err := os.Stat(path)
	if err != nil {
		t.Fatal(err)
	}
	if got := info.Mode().Perm(); got != want {
		t.Fatalf("mode for %q = %o, want %o", path, got, want)
	}
}
