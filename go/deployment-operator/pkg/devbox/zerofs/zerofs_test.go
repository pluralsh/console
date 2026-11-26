package zerofs

import (
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestParseStorage(t *testing.T) {
	for raw, want := range map[string]Storage{
		"s3://snapshots/devbox-homes/":   {Scheme: "s3", Bucket: "snapshots", Path: "devbox-homes"},
		"gs://snapshots":                 {Scheme: "gs", Bucket: "snapshots"},
		"azure://homes/a/b":              {Scheme: "azure", Bucket: "homes", Path: "a/b"},
		"s3://snapshots/substrate/homes": {Scheme: "s3", Bucket: "snapshots", Path: "substrate/homes"},
	} {
		got, err := ParseStorage(raw)
		if err != nil {
			t.Errorf("%s: %v", raw, err)
		} else if got != want {
			t.Errorf("%s = %+v, want %+v", raw, got, want)
		}
	}
	for _, raw := range []string{"", "file:///tmp/x", "s3:///path", "s3://b/../x", "s3://b/p?region=x", "http://b/p"} {
		if _, err := ParseStorage(raw); err == nil {
			t.Errorf("%q parsed", raw)
		}
	}
}

func TestStorageURLs(t *testing.T) {
	s := Storage{Scheme: "s3", Bucket: "snapshots", Path: "devbox-homes"}
	if got := s.VolumeURL("v1"); got != "s3://snapshots/devbox-homes/homes/v1" {
		t.Errorf("VolumeURL = %s", got)
	}
	if got := (Storage{Scheme: "gs", Bucket: "b"}).VolumePrefix("v1"); got != "homes/v1/" {
		t.Errorf("VolumePrefix = %s", got)
	}
	for s, want := range map[Storage]string{
		{Scheme: "s3", Bucket: "b"}:    "s3://b?use_path_style=true",
		{Scheme: "gs", Bucket: "b"}:    "gs://b",
		{Scheme: "azure", Bucket: "b"}: "azblob://b",
	} {
		if got := s.BucketURL(true); got != want {
			t.Errorf("BucketURL(%+v) = %s, want %s", s, got, want)
		}
	}
}

func TestWriterConfig(t *testing.T) {
	got := writerConfig{
		StorageURL: "s3://snapshots/devbox-homes/homes/v1",
		CacheDir:   "/var/lib/ate/zerofs/v1/cache",
		Cache:      CacheConfig{DiskGB: 10, MemoryGB: 0.25},
		NBDSocket:  "/run/zerofs/x/nbd.sock",
		NinePSock:  "/run/zerofs/x/9p.sock",
		RPCSocket:  "/run/zerofs/x/rpc.sock",
		Backend:    backendSection("s3"),
		Options:    map[string]string{"allow_http": "true", "aws_endpoint": "http://rustfs:9000"},
	}.render()
	for _, want := range []string{
		"[cache]\ndir = \"/var/lib/ate/zerofs/v1/cache\"\ndisk_size_gb = 10\nmemory_size_gb = 0.25\n",
		"[storage]\nurl = \"s3://snapshots/devbox-homes/homes/v1\"\nencryption_password = \"${ZEROFS_PASSWORD}\"\n",
		"[servers.nbd]\nunix_socket = \"/run/zerofs/x/nbd.sock\"\n",
		"[servers.ninep]\nunix_socket = \"/run/zerofs/x/9p.sock\"\n",
		"[servers.rpc]\nunix_socket = \"/run/zerofs/x/rpc.sock\"\n",
		"[telemetry]\nenabled = false\n",
		"[aws]\n\"allow_http\" = \"true\"\n\"aws_endpoint\" = \"http://rustfs:9000\"\n",
	} {
		if !strings.Contains(got, want) {
			t.Errorf("config is missing\n%s\ngot\n%s", want, got)
		}
	}
	if q := quoteTOML("a\"b\\c\n"); q != `"a\"b\\c\u000A"` {
		t.Errorf("quoteTOML = %s", q)
	}
}

func TestParseMountinfo(t *testing.T) {
	entries, err := parseMountinfo(strings.NewReader(
		"36 35 98:0 / /var/lib/ate/staging/v1 rw,noatime shared:1 - ext4 /dev/nbd3 rw,discard\n" +
			"37 35 98:0 / /var/lib/ate/actors/a\\040b/volumes/home rw master:1 - ext4 /dev/nbd3 rw\n" +
			"38 35 0:50 / /run/zerofs/x/fs rw - fuse.zerofs zerofs rw\n"))
	if err != nil {
		t.Fatal(err)
	}
	want := []mountEntry{
		{point: "/var/lib/ate/staging/v1", fsType: "ext4", source: "/dev/nbd3"},
		{point: "/var/lib/ate/actors/a b/volumes/home", fsType: "ext4", source: "/dev/nbd3"},
		{point: "/run/zerofs/x/fs", fsType: "fuse.zerofs", source: "zerofs"},
	}
	if len(entries) != len(want) {
		t.Fatalf("entries = %+v", entries)
	}
	for i := range want {
		if entries[i] != want[i] {
			t.Errorf("entry %d = %+v, want %+v", i, entries[i], want[i])
		}
	}
	if _, err := parseMountinfo(strings.NewReader("garbage\n")); err == nil {
		t.Error("parsed a malformed line")
	}
}

func TestFreeNBDSkipsConnectedDevices(t *testing.T) {
	sys := t.TempDir()
	device := func(name, size string, pid bool) {
		dir := filepath.Join(sys, name)
		if err := os.MkdirAll(dir, 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(filepath.Join(dir, "size"), []byte(size+"\n"), 0o644); err != nil {
			t.Fatal(err)
		}
		if pid {
			if err := os.WriteFile(filepath.Join(dir, "pid"), []byte("42\n"), 0o644); err != nil {
				t.Fatal(err)
			}
		}
	}
	device("nbd0", "0", true)        // ioctl-attached, still negotiating
	device("nbd1", "2097152", false) // netlink-attached
	device("nbd10", "0", false)
	device("nbd2", "0", false)
	device("loop0", "0", false)

	held := func(dev string) bool { return dev == "/dev/nbd2" }
	got, err := freeNBD(sys, func(string) bool { return false })
	if err != nil {
		t.Fatal(err)
	}
	if got != "/dev/nbd2" {
		t.Fatalf("freeNBD = %s, want /dev/nbd2", got)
	}
	// A disconnected device a lazily detached filesystem still holds is skipped.
	if got, err := freeNBD(sys, held); err != nil || got != "/dev/nbd10" {
		t.Fatalf("freeNBD = %s, %v, want /dev/nbd10", got, err)
	}

	device("nbd2", "8", false)
	device("nbd10", "8", false)
	if _, err := freeNBD(sys, held); err == nil || !strings.Contains(err.Error(), "nbds_max") {
		t.Fatalf("err = %v", err)
	}
}

func TestRemoveEmptyLostFound(t *testing.T) {
	root := t.TempDir()
	lostFound := filepath.Join(root, "lost+found")
	if err := os.Mkdir(lostFound, 0o700); err != nil {
		t.Fatal(err)
	}
	if err := removeEmptyLostFound(root); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(lostFound); !errors.Is(err, fs.ErrNotExist) {
		t.Fatalf("an empty lost+found survived: %v", err)
	}
	// Staging a home without one, as every stage after the first does.
	if err := removeEmptyLostFound(root); err != nil {
		t.Fatal(err)
	}

	// What e2fsck placed there is kept.
	if err := os.MkdirAll(filepath.Join(lostFound, "#12"), 0o700); err != nil {
		t.Fatal(err)
	}
	if err := removeEmptyLostFound(root); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(lostFound, "#12")); err != nil {
		t.Fatalf("a lost+found holding orphans was removed: %v", err)
	}

	// A user's own file by that name is kept, even when empty.
	if err := os.RemoveAll(lostFound); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(lostFound, nil, 0o600); err != nil {
		t.Fatal(err)
	}
	if err := removeEmptyLostFound(root); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(lostFound); err != nil {
		t.Fatalf("a user's lost+found file was removed: %v", err)
	}
}
