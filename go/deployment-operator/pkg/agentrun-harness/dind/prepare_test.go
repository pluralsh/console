package dind

import (
	"os"
	"path/filepath"
	"testing"
)

func TestCopyFile(t *testing.T) {
	srcDir := t.TempDir()
	dstDir := t.TempDir()

	content := []byte("private-key")
	src := filepath.Join(srcDir, "key.pem")
	if err := os.WriteFile(src, content, 0o600); err != nil {
		t.Fatal(err)
	}

	dst := filepath.Join(dstDir, "key.pem")
	if err := copyFile(src, dst); err != nil {
		t.Fatalf("copyFile() failed: %v", err)
	}

	got, err := os.ReadFile(dst)
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != string(content) {
		t.Fatalf("expected copied content %q, got %q", content, got)
	}
}
