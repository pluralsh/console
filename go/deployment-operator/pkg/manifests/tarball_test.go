package manifests

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"
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

func withRateLimitBaseDelay(t *testing.T, d time.Duration) {
	prev := rateLimitBaseDelay
	rateLimitBaseDelay = d
	t.Cleanup(func() { rateLimitBaseDelay = prev })
}

func TestGetReader_RateLimitRetryExhaustionPreservesHTTPError(t *testing.T) {
	withRateLimitBaseDelay(t, time.Millisecond)
	var requests int
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests++
		w.Header().Set("Retry-After", "0")
		http.Error(w, "slow down", http.StatusTooManyRequests)
	}))
	defer server.Close()

	resp, _, err := GetReader(server.URL, "dummy-token")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if resp != nil {
		t.Fatal("expected nil response")
	}
	if requests != 3 {
		t.Fatalf("expected 3 requests, got %d", requests)
	}

	var httpErr *HTTPError
	if !errors.As(err, &httpErr) {
		t.Fatalf("expected wrapped HTTPError, got: %v", err)
	}
	if httpErr.StatusCode != http.StatusTooManyRequests {
		t.Fatalf("expected status %d, got %d", http.StatusTooManyRequests, httpErr.StatusCode)
	}
}

func TestGetReader_HonorsRetryAfter(t *testing.T) {
	withRateLimitBaseDelay(t, time.Millisecond)
	var requests int
	var first time.Time
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests++
		if requests == 1 {
			first = time.Now()
			w.Header().Set("Retry-After", "1")
			http.Error(w, "Too Many Requests", http.StatusTooManyRequests)
			return
		}
		fmt.Fprint(w, "ok")
	}))
	defer server.Close()

	resp, _, err := GetReader(server.URL, "dummy-token")
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}
	resp.Close()
	if requests != 2 {
		t.Fatalf("expected 2 requests, got %d", requests)
	}
	if waited := time.Since(first); waited < time.Second {
		t.Fatalf("expected to wait at least the Retry-After of 1s, waited %s", waited)
	}
}

func TestFetchSha_DoesNotRetryRateLimits(t *testing.T) {
	var requests int
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests++
		w.Header().Set("Retry-After", "7")
		http.Error(w, "Too Many Requests", http.StatusTooManyRequests)
	}))
	defer server.Close()

	_, err := fetchSha(server.URL, "dummy-token", "service-id")

	var httpErr *HTTPError
	if !errors.As(err, &httpErr) {
		t.Fatalf("expected wrapped HTTPError, got: %v", err)
	}
	if httpErr.RetryAfter != 7*time.Second {
		t.Fatalf("expected retry after of 7s, got %s", httpErr.RetryAfter)
	}
	if requests != 1 {
		t.Fatalf("expected 1 request, got %d", requests)
	}
}

func TestParseRetryAfter(t *testing.T) {
	now := time.Date(2026, 10, 29, 12, 0, 0, 0, time.UTC)
	tests := []struct {
		value string
		want  time.Duration
	}{
		{"", 0},
		{"3", 3 * time.Second},
		{" 3 ", 3 * time.Second},
		{"-5", 0},
		{"garbage", 0},
		{"86400", maxRetryAfter},
		{now.Add(30 * time.Second).Format(http.TimeFormat), 30 * time.Second},
		{now.Add(-30 * time.Second).Format(http.TimeFormat), 0},
	}

	for _, tt := range tests {
		if got := parseRetryAfter(tt.value, now); got != tt.want {
			t.Errorf("parseRetryAfter(%q) = %s, want %s", tt.value, got, tt.want)
		}
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

	dir := t.TempDir()
	if err := fetch(server.URL, "dummy-token", "", dir); err != nil {
		t.Fatalf("fetch failed: %v", err)
	}

	extractedFile := filepath.Join(dir, "test.txt")
	data, err := os.ReadFile(extractedFile)
	if err != nil {
		t.Fatalf("failed to read extracted file: %v", err)
	}
	if string(data) != "hello world" {
		t.Errorf("unexpected content in extracted file: got %q, want %q", string(data), "hello world")
	}
}
