package artifacts

import (
	"archive/tar"
	"compress/gzip"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func fileServer(t *testing.T, path string) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, path)
	}))
}

func TestReadSessionManifest(t *testing.T) {
	dir := t.TempDir()
	manifest := SessionManifest{
		Version:    1,
		AgentRunID: "run-1",
		Provider:   "claude",
		Session: SessionMetadata{
			ID:          "session-1",
			ArchivePath: "projects",
		},
	}
	data, err := json.Marshal(manifest)
	if err != nil {
		t.Fatalf("marshal manifest: %v", err)
	}
	if err := os.WriteFile(filepath.Join(dir, "manifest.json"), data, 0644); err != nil {
		t.Fatalf("write manifest: %v", err)
	}

	got, err := ReadSessionManifest(dir)
	if err != nil {
		t.Fatalf("ReadSessionManifest() error = %v", err)
	}
	if got.Session.ID != "session-1" || got.Session.ArchivePath != "projects" {
		t.Fatalf("manifest = %#v", got)
	}
}

func TestRestoreArchiveTree(t *testing.T) {
	extractDir := t.TempDir()
	archiveRoot := filepath.Join(extractDir, "projects", "demo")
	if err := os.MkdirAll(archiveRoot, 0755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(archiveRoot, "session.json"), []byte(`{"ok":true}`), 0644); err != nil {
		t.Fatalf("write session: %v", err)
	}

	destination := filepath.Join(t.TempDir(), "projects")
	if err := RestoreArchiveTree(context.Background(), extractDir, "projects", destination); err != nil {
		t.Fatalf("RestoreArchiveTree() error = %v", err)
	}

	restored := filepath.Join(destination, "demo", "session.json")
	data, err := os.ReadFile(restored)
	if err != nil {
		t.Fatalf("read restored session: %v", err)
	}
	if string(data) != `{"ok":true}` {
		t.Fatalf("restored content = %q", data)
	}
}

func TestDownloadAndExtractSession(t *testing.T) {
	workDir := t.TempDir()
	archivePath := filepath.Join(workDir, "session.tar.gz")
	if err := writeTestSessionArchive(archivePath); err != nil {
		t.Fatalf("write archive: %v", err)
	}

	server := fileServer(t, archivePath)
	defer server.Close()

	restored, err := DownloadAndExtractSession(context.Background(), server.URL, workDir)
	if err != nil {
		t.Fatalf("DownloadAndExtractSession() error = %v", err)
	}
	defer os.RemoveAll(restored.ExtractDir)

	if restored.Manifest.Session.ID != "session-abc" {
		t.Fatalf("session id = %q", restored.Manifest.Session.ID)
	}
	if _, err := os.Stat(filepath.Join(restored.ExtractDir, "projects", "demo", "session.json")); err != nil {
		t.Fatalf("extracted session missing: %v", err)
	}
}

func writeTestSessionArchive(path string) error {
	file, err := os.Create(path)
	if err != nil {
		return err
	}
	defer file.Close()

	gzipWriter := gzip.NewWriter(file)
	defer gzipWriter.Close()
	tarWriter := tar.NewWriter(gzipWriter)
	defer tarWriter.Close()

	manifest, err := json.Marshal(SessionManifest{
		Version:    1,
		AgentRunID: "run-1",
		Provider:   "claude",
		Session: SessionMetadata{
			ID:          "session-abc",
			ArchivePath: "projects",
		},
	})
	if err != nil {
		return err
	}
	if err := writeTarBytes(tarWriter, "manifest.json", manifest); err != nil {
		return err
	}
	return writeTarBytes(tarWriter, "projects/demo/session.json", []byte(`{"ok":true}`))
}

func writeTarBytes(tw *tar.Writer, name string, data []byte) error {
	header := &tar.Header{
		Name: name,
		Mode: 0644,
		Size: int64(len(data)),
	}
	if err := tw.WriteHeader(header); err != nil {
		return err
	}
	_, err := tw.Write(data)
	return err
}
