package manifests

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func createTestTarGz(t *testing.T) []byte {
	var buf bytes.Buffer

	gzw := gzip.NewWriter(&buf)
	tw := tar.NewWriter(gzw)

	content := "hello world"
	header := &tar.Header{
		Name: "test.txt",
		Mode: 0600,
		Size: int64(len(content)),
	}
	if err := tw.WriteHeader(header); err != nil {
		t.Fatalf("failed to write tar header: %v", err)
	}

	if _, err := tw.Write([]byte(content)); err != nil {
		t.Fatalf("failed to write tar content: %v", err)
	}

	if err := tw.Close(); err != nil {
		t.Fatalf("failed to close tar writer: %v", err)
	}
	if err := gzw.Close(); err != nil {
		t.Fatalf("failed to close gzip writer: %v", err)
	}

	return buf.Bytes()
}

func TestGetBody_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Token my-token" {
			http.Error(w, "unauthorized", http.StatusForbidden)
			return
		}
		fmt.Fprint(w, "hello from server")
	}))
	defer server.Close()

	body, err := getBody(server.URL, "my-token")
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}
	if body != "hello from server" {
		t.Errorf("unexpected body: %v", body)
	}
}

func TestSanitizeURL_Success(t *testing.T) {
	result, err := sanitizeURL("https://example.com/path?q=stuff")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result != "https://example.com" {
		t.Errorf("unexpected sanitized url: %v", result)
	}
}

func TestFetchSha_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "some-digest-value")
	}))
	defer server.Close()

	digest, err := fetchSha(server.URL, "dummy-token", "service-id")
	if err != nil {
		t.Fatalf("fetchSha failed: %v", err)
	}
	if digest != "some-digest-value" {
		t.Errorf("unexpected digest: %q", digest)
	}
}

func TestFetch_Success(t *testing.T) {
	tarGzData := createTestTarGz(t)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, err := w.Write(tarGzData)
		if err != nil {
			t.Fatalf("write failed: %v", err)
		}
	}))
	defer server.Close()

	dir, err := fetch(server.URL, "dummy-token", "")
	if err != nil {
		t.Fatalf("fetch failed: %v", err)
	}
	defer os.RemoveAll(dir)

	extractedFile := filepath.Join(dir, "test.txt")
	data, err := os.ReadFile(extractedFile)
	if err != nil {
		t.Fatalf("failed to read extracted file: %v", err)
	}
	if string(data) != "hello world" {
		t.Errorf("unexpected content in extracted file: got %q, want %q", string(data), "hello world")
	}
}
