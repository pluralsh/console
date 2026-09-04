package codex

import (
	"context"
	"os"
	stdexec "os/exec"
	"path/filepath"
	"testing"
	"time"
)

func TestAgentSessionExportSkipsFIFO(t *testing.T) {
	source := t.TempDir()
	if err := os.WriteFile(filepath.Join(source, "session.jsonl"), []byte("session"), 0644); err != nil {
		t.Fatal(err)
	}
	fifo := filepath.Join(source, "blocked.pipe")
	if err := stdexec.Command("mkfifo", fifo).Run(); err != nil {
		t.Skipf("mkfifo is unavailable: %v", err)
	}
	destination := t.TempDir()
	done := make(chan error, 1)
	go func() { done <- (&Agent{}).copySessionDirectory(context.Background(), source, destination) }()
	select {
	case err := <-done:
		if err != nil {
			t.Fatalf("copySessionDirectory() error = %v", err)
		}
	case <-time.After(500 * time.Millisecond):
		t.Fatal("copySessionDirectory() blocked on FIFO")
	}
	if _, err := os.Stat(filepath.Join(destination, "blocked.pipe")); !os.IsNotExist(err) {
		t.Fatalf("FIFO was copied, stat error = %v", err)
	}
}
