package main

import (
	"archive/tar"
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/klauspost/compress/zstd"
)

func kataArchive(t *testing.T) []byte {
	t.Helper()
	var tb bytes.Buffer
	tw := tar.NewWriter(&tb)
	add := func(h tar.Header, body string) {
		h.Size = int64(len(body))
		if err := tw.WriteHeader(&h); err != nil {
			t.Fatal(err)
		}
		_, _ = tw.Write([]byte(body))
	}
	add(tar.Header{Name: "./opt/kata/share/kata-containers/vmlinux-6.1", Typeflag: tar.TypeReg, Mode: 0o600}, "kernel")
	add(tar.Header{Name: "./opt/kata/share/kata-containers/kata-image.img", Typeflag: tar.TypeReg, Mode: 0o600}, "image")
	add(tar.Header{Name: "./opt/kata/share/kata-containers/vmlinux.container", Typeflag: tar.TypeSymlink, Linkname: "vmlinux-6.1"}, "")
	add(tar.Header{Name: "./opt/kata/share/kata-containers/kata-containers.img", Typeflag: tar.TypeSymlink, Linkname: "kata-image.img"}, "")
	add(tar.Header{Name: "./opt/kata/libexec/virtiofsd", Typeflag: tar.TypeReg, Mode: 0o600}, "virtiofsd")
	add(tar.Header{Name: "./opt/kata/bin/ignored", Typeflag: tar.TypeReg, Mode: 0o600}, "ignored")
	if err := tw.Close(); err != nil {
		t.Fatal(err)
	}
	var zb bytes.Buffer
	zw, _ := zstd.NewWriter(&zb)
	_, _ = zw.Write(tb.Bytes())
	_ = zw.Close()
	return zb.Bytes()
}

func TestDownloadAndExtractKataAssets(t *testing.T) {
	archive := kataArchive(t)
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { _, _ = w.Write(archive) }))
	defer srv.Close()

	work, out := t.TempDir(), t.TempDir()
	if err := downloadAndExtractKataAssets(context.Background(), srv.URL, work, out); err != nil {
		t.Fatal(err)
	}
	for name, want := range map[string]string{"vmlinux": "kernel", "rootfs.img": "image", "virtiofsd": "virtiofsd"} {
		got, err := os.ReadFile(filepath.Join(out, name))
		if err != nil || string(got) != want {
			t.Errorf("%s = %q, %v; want %q", name, got, err, want)
		}
	}
	if fi, _ := os.Stat(filepath.Join(out, "virtiofsd")); fi.Mode().Perm() != 0o755 {
		t.Errorf("virtiofsd mode = %v", fi.Mode().Perm())
	}
	if _, err := os.Stat(filepath.Join(work, "opt/kata/bin/ignored")); !os.IsNotExist(err) {
		t.Errorf("entry outside the wanted paths was extracted")
	}
}
