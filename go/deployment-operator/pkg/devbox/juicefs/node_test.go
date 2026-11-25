package juicefs

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/container-storage-interface/spec/lib/go/csi"
	"github.com/go-logr/logr"
	"google.golang.org/grpc/codes"
)

type fakeMounter struct {
	mu      sync.Mutex
	mounted map[string]string
	mounts  int
}

func (f *fakeMounter) Mount(_ context.Context, volumeID, target string, _ bool) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.mounted == nil {
		f.mounted = map[string]string{}
	}
	f.mounted[target] = volumeID
	f.mounts++
	return nil
}

func (f *fakeMounter) Unmount(_ context.Context, target string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	delete(f.mounted, target)
	return nil
}

func (f *fakeMounter) Mounted(target string) (bool, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	_, ok := f.mounted[target]
	return ok, nil
}

func TestNodePublishIsIdempotentAndConfinedToTheTargetRoot(t *testing.T) {
	m := &fakeMounter{}
	n := &Node{NodeID: "node-a", TargetRoot: "/var/lib/ate", Mounter: m, Log: logr.Discard()}
	ctx := context.Background()
	publish := func(target string) error {
		_, err := n.NodePublishVolume(ctx, &csi.NodePublishVolumeRequest{
			VolumeId:         "substrate-a-home",
			TargetPath:       target,
			VolumeCapability: mountCap()[0],
		})
		return err
	}

	target := "/var/lib/ate/actors/a/volumes/home"
	for range 2 {
		if err := publish(target); err != nil {
			t.Fatal(err)
		}
	}
	if m.mounts != 1 {
		t.Errorf("mounted %d times, want once", m.mounts)
	}
	for _, bad := range []string{"", "/var/lib/ate", "/var/lib/ate/../../etc", "/var/lib/atelier/x", "relative/path"} {
		wantCode(t, publish(bad), codes.InvalidArgument)
	}

	for range 2 {
		if _, err := n.NodeUnpublishVolume(ctx, &csi.NodeUnpublishVolumeRequest{VolumeId: "substrate-a-home", TargetPath: target}); err != nil {
			t.Fatal(err)
		}
	}
	if ok, _ := m.Mounted(target); ok {
		t.Error("the volume is still mounted")
	}

	info, err := n.NodeGetInfo(ctx, &csi.NodeGetInfoRequest{})
	if err != nil || info.GetNodeId() != "node-a" {
		t.Errorf("NodeGetInfo = %v, %v", info, err)
	}
}

func TestParseMountinfo(t *testing.T) {
	in := strings.Join([]string{
		`22 1 259:1 / / rw,relatime shared:1 - ext4 /dev/root rw`,
		`900 22 0:77 / /var/lib/ate/actors/a\040b/home rw,relatime shared:3 master:2 - fuse.juicefs JuiceFS:homes rw,user_id=0`,
	}, "\n")
	got, err := parseMountinfo(strings.NewReader(in))
	if err != nil {
		t.Fatal(err)
	}
	want := []mountEntry{{point: "/", fsType: "ext4"}, {point: "/var/lib/ate/actors/a b/home", fsType: FSType}}
	if len(got) != len(want) || got[0] != want[0] || got[1] != want[1] {
		t.Fatalf("got %+v, want %+v", got, want)
	}

	if _, err := parseMountinfo(strings.NewReader("22 1 259:1 / / rw")); err == nil {
		t.Error("a line without the separator parsed")
	}
}

// fakeJuicefs writes a script that behaves like a foreground `juicefs mount`: it records its mount in the
// mountinfo file the mounter reads and serves until it's signalled. With EXIT_EARLY set it fails before mounting.
func fakeJuicefs(t *testing.T, mountinfo string) string {
	t.Helper()
	bin := filepath.Join(t.TempDir(), "juicefs")
	script := `#!/bin/sh
[ -n "$EXIT_EARLY" ] && { echo "bad meta url" >&2; exit 1; }
echo "900 22 0:77 / $3 rw - fuse.juicefs JuiceFS:homes rw" >> "` + mountinfo + `"
trap 'exit 0' TERM
while :; do sleep 0.05; done
`
	if err := os.WriteFile(bin, []byte(script), 0o755); err != nil {
		t.Fatal(err)
	}
	return bin
}

func TestProcessMounterWaitsForTheMount(t *testing.T) {
	dir := t.TempDir()
	mountinfo := filepath.Join(dir, "mountinfo")
	if err := os.WriteFile(mountinfo, []byte("22 1 259:1 / / rw - ext4 /dev/root rw\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	m := &ProcessMounter{
		Binary:    fakeJuicefs(t, mountinfo),
		MetaURL:   "postgres://juicefs@db/juicefs",
		CacheRoot: filepath.Join(dir, "cache"),
		Mountinfo: mountinfo,
		Log:       logr.Discard(),
	}
	target := filepath.Join(dir, "target")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := m.Mount(ctx, "substrate-a-home", target, false); err != nil {
		t.Fatal(err)
	}
	if ok, err := m.Mounted(target); err != nil || !ok {
		t.Fatalf("Mounted = %v, %v", ok, err)
	}
	if _, err := os.Stat(filepath.Join(dir, "cache", "substrate-a-home")); err != nil {
		t.Errorf("no per-volume cache directory: %v", err)
	}
	m.mu.Lock()
	p := m.procs[target]
	m.mu.Unlock()
	m.stop(p)

	t.Setenv("EXIT_EARLY", "1")
	if err := m.Mount(ctx, "substrate-b-home", filepath.Join(dir, "other"), false); err == nil || !strings.Contains(err.Error(), "exited before mounting") {
		t.Fatalf("a mount that exits early returned %v", err)
	}
}
