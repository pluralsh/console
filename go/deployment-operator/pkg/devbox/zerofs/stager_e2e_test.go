//go:build linux && zerofs_e2e

package zerofs

import (
	"context"
	"io"
	"os"
	"path/filepath"
	"strconv"
	"syscall"
	"testing"
	"time"

	"github.com/go-logr/logr/testr"
	"gocloud.dev/blob"
	_ "gocloud.dev/blob/s3blob"
)

// TestStageRoundTrip drives the real tools against a real bucket: run it as root, in the devbox-zerofs image, on
// a kernel with nbd, with ZEROFS_E2E_STORAGE_URL, ZEROFS_PASSWORD and the bucket's AWS_* environment set.
//
//	GOOS=linux go test -c -tags zerofs_e2e -o zerofs-e2e ./pkg/devbox/zerofs
func TestStageRoundTrip(t *testing.T) {
	storage, err := ParseStorage(os.Getenv("ZEROFS_E2E_STORAGE_URL"))
	if err != nil {
		t.Fatal(err)
	}
	root := t.TempDir()
	m := &Manager{
		Binary:             "/usr/local/bin/zerofs",
		NBDClient:          "nbd-client",
		Blkid:              "blkid",
		Mkfs:               "mkfs.ext4",
		Resize:             "resize2fs",
		NBDClientFlags:     []string{"-connections", "4", "-timeout", "600", "-block-size", "4096"},
		Storage:            storage,
		ObjectStoreOptions: map[string]string{"allow_http": "true"},
		StateRoot:          filepath.Join(root, "state"),
		SocketDir:          "/run/zerofs-e2e",
		Cache:              CacheConfig{DiskPercent: 50, MinDiskGB: 1, MaxDiskGB: 1, MemoryGB: 0.1},
		Mountinfo:          "/proc/self/mountinfo",
		SysBlock:           "/sys/block",
		Log:                testr.New(t),
	}
	binder := HostBinder{Mountinfo: m.Mountinfo}
	ctx := context.Background()
	staging := filepath.Join(root, "staging")
	target := filepath.Join(root, "actor", "home")
	v := Volume{
		ID:            "e2e-" + strconv.FormatInt(time.Now().UnixNano(), 36),
		CapacityBytes: 1 << 30,
		Owner:         Owner{UID: 1000, GID: 1000, Mode: 0o750},
	}

	if err := m.Stage(ctx, v, staging); err != nil {
		t.Fatal(err)
	}
	if err := m.Stage(ctx, v, staging); err != nil {
		t.Fatalf("restaging a staged volume: %v", err)
	}
	info, err := os.Stat(staging)
	if err != nil {
		t.Fatal(err)
	}
	st := info.Sys().(*syscall.Stat_t)
	if info.Mode().Perm() != 0o750 || st.Uid != 1000 || st.Gid != 1000 {
		t.Fatalf("home root is %v %d:%d", info.Mode().Perm(), st.Uid, st.Gid)
	}
	if _, err := os.Stat(filepath.Join(staging, "lost+found")); !os.IsNotExist(err) {
		t.Fatalf("the home shows mkfs's lost+found: %v", err)
	}
	if err := binder.Bind(staging, target, false); err != nil {
		t.Fatal(err)
	}
	payload := []byte("survives a node move\n")
	if err := os.WriteFile(filepath.Join(target, "note"), payload, 0o644); err != nil {
		t.Fatal(err)
	}
	if err := binder.Unmount(target); err != nil {
		t.Fatal(err)
	}
	if err := m.Unstage(ctx, v.ID, staging); err != nil {
		t.Fatal(err)
	}
	if ok, _ := m.Mounted(staging); ok {
		t.Fatal("staging is still mounted")
	}
	if _, err := os.Stat(m.stateDir(v.ID)); !os.IsNotExist(err) {
		t.Fatalf("state is left behind: %v", err)
	}

	// A fresh writer with an empty cache has to read the home back from the bucket; a larger capacity grows it.
	v.CapacityBytes = 2 << 30
	if err := m.Stage(ctx, v, staging); err != nil {
		t.Fatal(err)
	}
	got, err := os.ReadFile(filepath.Join(staging, "note"))
	if err != nil || string(got) != string(payload) {
		t.Fatalf("read back %q, %v", got, err)
	}
	var fs syscall.Statfs_t
	if err := syscall.Statfs(staging, &fs); err != nil {
		t.Fatal(err)
	}
	if size := int64(fs.Blocks) * fs.Bsize; size < 3<<29 {
		t.Fatalf("the filesystem is %d bytes after growing to 2GiB", size)
	}

	// A busy home fails to unstage and keeps serving, rather than being detached from under its user.
	held, err := os.Open(filepath.Join(staging, "note"))
	if err != nil {
		t.Fatal(err)
	}
	if err := m.Unstage(ctx, v.ID, staging); err == nil {
		t.Fatal("unstaged a busy home")
	}
	if p := m.writer(v.ID); p == nil || p.exited() {
		t.Fatal("a failed unstage stopped the writer")
	}
	if got, err := io.ReadAll(held); err != nil || string(got) != string(payload) {
		t.Fatalf("read %q, %v from the busy home", got, err)
	}
	held.Close()

	// A writer that dies takes the home down: staging it again fails until an unstage recovers the volume, which
	// keeps what was synced before the crash.
	durable := []byte("synced before the crash\n")
	f, err := os.Create(filepath.Join(staging, "durable"))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := f.Write(durable); err != nil {
		t.Fatal(err)
	}
	if err := f.Sync(); err != nil {
		t.Fatal(err)
	}
	f.Close()
	p := m.writer(v.ID)
	if err := p.cmd.Process.Kill(); err != nil {
		t.Fatal(err)
	}
	<-p.done
	if err := m.Stage(ctx, v, staging); err == nil {
		t.Fatal("restaged a home whose writer died")
	}
	if err := m.Unstage(ctx, v.ID, staging); err != nil {
		t.Fatalf("recovering a dead writer: %v", err)
	}
	if err := m.Stage(ctx, v, staging); err != nil {
		t.Fatal(err)
	}
	if got, err := os.ReadFile(filepath.Join(staging, "durable")); err != nil || string(got) != string(durable) {
		t.Fatalf("read back %q, %v after the crash", got, err)
	}
	if err := m.Unstage(ctx, v.ID, staging); err != nil {
		t.Fatal(err)
	}

	bucket, err := blob.OpenBucket(ctx, storage.BucketURL(true))
	if err != nil {
		t.Fatal(err)
	}
	defer bucket.Close()
	store := BlobStore{Bucket: bucket}
	n, err := store.DeletePrefix(ctx, storage.VolumePrefix(v.ID))
	if err != nil || n == 0 {
		t.Fatalf("deleted %d objects: %v", n, err)
	}
	if n, err := store.DeletePrefix(ctx, storage.VolumePrefix(v.ID)); err != nil || n != 0 {
		t.Fatalf("a second delete found %d objects: %v", n, err)
	}
}
