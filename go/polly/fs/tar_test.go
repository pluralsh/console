package fs

import (
	"archive/tar"
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func buildTar(t *testing.T, entries []tar.Header, bodies map[string]string) *bytes.Buffer {
	t.Helper()
	var buf bytes.Buffer
	tw := tar.NewWriter(&buf)
	for _, h := range entries {
		h := h
		h.Size = int64(len(bodies[h.Name]))
		if h.Typeflag != tar.TypeReg {
			h.Size = 0
		}
		if err := tw.WriteHeader(&h); err != nil {
			t.Fatal(err)
		}
		if h.Typeflag == tar.TypeReg {
			if _, err := tw.Write([]byte(bodies[h.Name])); err != nil {
				t.Fatal(err)
			}
		}
	}
	if err := tw.Close(); err != nil {
		t.Fatal(err)
	}
	return &buf
}

func TestUntarStreamFilterAndSymlinks(t *testing.T) {
	dst := t.TempDir()
	buf := buildTar(t, []tar.Header{
		{Name: "./opt/share/real", Typeflag: tar.TypeReg, Mode: 0o644},
		{Name: "opt/share/link", Typeflag: tar.TypeSymlink, Linkname: "real"},
		{Name: "opt/other/skipped", Typeflag: tar.TypeReg, Mode: 0o644},
	}, map[string]string{"./opt/share/real": "hello", "opt/other/skipped": "no"})

	err := UntarStream(dst, buf,
		WithTarFilter(func(n string) bool { return strings.HasPrefix(n, "opt/share/") }),
		WithTarSymlinks())
	if err != nil {
		t.Fatal(err)
	}
	got, err := os.ReadFile(filepath.Join(dst, "opt/share/link"))
	if err != nil || string(got) != "hello" {
		t.Fatalf("symlink read = %q, %v", got, err)
	}
	if _, err := os.Stat(filepath.Join(dst, "opt/other/skipped")); !os.IsNotExist(err) {
		t.Fatalf("filtered entry was extracted: %v", err)
	}
}

func TestUntarStreamIgnoresSymlinksByDefault(t *testing.T) {
	dst := t.TempDir()
	buf := buildTar(t, []tar.Header{{Name: "link", Typeflag: tar.TypeSymlink, Linkname: "real"}}, nil)
	if err := UntarStream(dst, buf); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Lstat(filepath.Join(dst, "link")); !os.IsNotExist(err) {
		t.Fatalf("symlink extracted without WithTarSymlinks: %v", err)
	}
}

func TestUntarStreamRejectsEscapes(t *testing.T) {
	for name, h := range map[string]tar.Header{
		"dotdot file":      {Name: "../evil", Typeflag: tar.TypeReg, Mode: 0o644},
		"nested dotdot":    {Name: "a/../../evil", Typeflag: tar.TypeReg, Mode: 0o644},
		"symlink dotdot":   {Name: "l", Typeflag: tar.TypeSymlink, Linkname: "../evil"},
		"symlink absolute": {Name: "l", Typeflag: tar.TypeSymlink, Linkname: "/etc/passwd"},
	} {
		t.Run(name, func(t *testing.T) {
			buf := buildTar(t, []tar.Header{h}, map[string]string{h.Name: "x"})
			if err := UntarStream(t.TempDir(), buf, WithTarSymlinks()); err == nil {
				t.Fatal("expected an error")
			}
		})
	}
}

func TestUntarStreamRejectsWritesThroughSymlinks(t *testing.T) {
	for name, entries := range map[string][]tar.Header{
		"file under link": {
			{Name: "d/a", Typeflag: tar.TypeSymlink, Linkname: ".."},
			{Name: "d/a/victim", Typeflag: tar.TypeReg, Mode: 0o644},
		},
		"link chain": {
			{Name: "d/e/a", Typeflag: tar.TypeSymlink, Linkname: "../.."},
			{Name: "d/e/a/b", Typeflag: tar.TypeSymlink, Linkname: ".."},
			{Name: "d/e/a/b/victim", Typeflag: tar.TypeReg, Mode: 0o644},
		},
	} {
		t.Run(name, func(t *testing.T) {
			parent := t.TempDir()
			dst := filepath.Join(parent, "dst")
			if err := os.Mkdir(dst, 0o755); err != nil {
				t.Fatal(err)
			}
			if err := UntarStream(dst, buildTar(t, entries, nil), WithTarSymlinks()); err == nil {
				t.Fatal("expected an error")
			}
			for _, p := range []string{filepath.Join(parent, "victim"), filepath.Join(dst, "victim")} {
				if _, err := os.Stat(p); !os.IsNotExist(err) {
					t.Errorf("%s was written", p)
				}
			}
		})
	}
}
