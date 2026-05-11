package manifests

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	"errors"
	"io"
	"testing"
)

// brokenReader simulates a stream that fails after reading a few bytes.
type brokenReader struct {
	data         []byte
	readFailures int // The number of successful reads allowed before it fails
	readCount    int // Tracks the current number of reads
}

// Read simulates reading from the broken reader.
func (br *brokenReader) Read(p []byte) (n int, err error) {
	if br.readCount >= br.readFailures {
		return 0, errors.New("simulated broken stream")
	}
	br.readCount++

	// Simulate reading as much data as possible
	n = copy(p, br.data)
	br.data = br.data[n:]
	if len(br.data) == 0 {
		return n, io.EOF
	}
	return n, nil
}

// generateTestTarGz generates a simple tar.gz byte stream with one file.
func generateTestTarGz() []byte {
	var buf bytes.Buffer

	// Create a gzip writer
	gzw := gzip.NewWriter(&buf)
	defer gzw.Close()

	// Create a tar writer
	tw := tar.NewWriter(gzw)
	defer tw.Close()

	// Add a single file to the tar archive
	content := []byte("hello world")
	header := &tar.Header{
		Name: "testfile.txt",
		Mode: 0600,
		Size: int64(len(content)),
	}
	if err := tw.WriteHeader(header); err != nil {
		panic(err) // Panic here as this is a controlled test function
	}
	if _, err := tw.Write(content); err != nil {
		panic(err) // Panic here as this is a controlled test function
	}

	return buf.Bytes()
}

func TestUntarWithBrokenStream(t *testing.T) {
	// Generate a valid tar.gz byte slice
	validTarGzInput := generateTestTarGz()

	// Create a broken stream that fails after 2 reads
	br := &brokenReader{
		data:         validTarGzInput,
		readFailures: 2, // Fail on the third read attempt
	}

	// Destination directory for extraction (use a temp directory for testing)
	dst := t.TempDir()

	// Call the Untar function with the broken reader
	err := Untar(dst, br)

	// Validate that an error is returned
	if err == nil {
		t.Fatalf("Expected an error for broken stream, got nil")
	}

	// Ensure the error message indicates the stream issue
	if !errors.Is(err, io.ErrUnexpectedEOF) && !errors.Is(err, io.EOF) {
		t.Errorf("Expected EOF-related error, but got: %v", err)
	}
}
