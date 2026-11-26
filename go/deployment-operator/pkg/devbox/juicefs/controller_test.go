package juicefs

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"strconv"
	"sync"
	"testing"

	"github.com/container-storage-interface/spec/lib/go/csi"
	"github.com/go-logr/logr"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// fakeCLI stands in for juicefs on a plain directory: a clone is a deep copy and quotas are only recorded.
type fakeCLI struct {
	mu        sync.Mutex
	quotas    map[string]int64
	failClone error
}

func (f *fakeCLI) Clone(_ context.Context, src, dst string) error {
	if f.failClone != nil {
		return f.failClone
	}
	if _, err := os.Stat(dst); err == nil {
		return errors.New(dst + " already exists")
	}
	return os.CopyFS(dst, os.DirFS(src))
}

func (f *fakeCLI) RemoveAll(_ context.Context, path string) error { return os.RemoveAll(path) }

func (f *fakeCLI) SetQuota(_ context.Context, path string, bytes int64) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.quotas == nil {
		f.quotas = map[string]int64{}
	}
	f.quotas[path] = bytes
	return nil
}

func newController(t *testing.T) (*Controller, *fakeCLI) {
	t.Helper()
	cli := &fakeCLI{}
	return &Controller{Root: t.TempDir(), CLI: cli, Log: logr.Discard()}, cli
}

func mountCap() []*csi.VolumeCapability {
	return []*csi.VolumeCapability{{
		AccessType: &csi.VolumeCapability_Mount{Mount: &csi.VolumeCapability_MountVolume{}},
		AccessMode: &csi.VolumeCapability_AccessMode{Mode: csi.VolumeCapability_AccessMode_SINGLE_NODE_WRITER},
	}}
}

func createVolume(t *testing.T, c *Controller, name string, source *csi.VolumeContentSource) (*csi.CreateVolumeResponse, error) {
	t.Helper()
	return c.CreateVolume(context.Background(), &csi.CreateVolumeRequest{
		Name:                name,
		CapacityRange:       &csi.CapacityRange{RequiredBytes: 10 << 30},
		VolumeCapabilities:  mountCap(),
		Parameters:          map[string]string{ParamMode: "0750"},
		VolumeContentSource: source,
	})
}

func fromSnapshot(id string) *csi.VolumeContentSource {
	return &csi.VolumeContentSource{Type: &csi.VolumeContentSource_Snapshot{
		Snapshot: &csi.VolumeContentSource_SnapshotSource{SnapshotId: id},
	}}
}

func wantCode(t *testing.T, err error, code codes.Code) {
	t.Helper()
	if status.Code(err) != code {
		t.Fatalf("got %v, want code %s", err, code)
	}
}

func TestCreateVolumeMakesAnEmptyHomeWithAQuota(t *testing.T) {
	c, cli := newController(t)

	resp, err := createVolume(t, c, "substrate-a-home", nil)
	if err != nil {
		t.Fatal(err)
	}
	if resp.GetVolume().GetVolumeId() != "substrate-a-home" || resp.GetVolume().GetCapacityBytes() != 10<<30 {
		t.Fatalf("unexpected volume %v", resp.GetVolume())
	}
	info, err := os.Stat(filepath.Join(c.Root, "homes", "substrate-a-home"))
	if err != nil {
		t.Fatal(err)
	}
	if info.Mode().Perm() != 0o750 {
		t.Errorf("mode = %v, want 0750", info.Mode().Perm())
	}
	if got := cli.quotas["/homes/substrate-a-home"]; got != 10<<30 {
		t.Errorf("quota = %d, want %d", got, int64(10<<30))
	}

	if err := os.WriteFile(filepath.Join(c.Root, "homes", "substrate-a-home", "kept"), nil, 0o600); err != nil {
		t.Fatal(err)
	}
	if _, err := createVolume(t, c, "substrate-a-home", fromSnapshot("ignored")); err != nil {
		t.Fatalf("creating an existing volume again: %v", err)
	}
	if _, err := os.Stat(filepath.Join(c.Root, "homes", "substrate-a-home", "kept")); err != nil {
		t.Errorf("an existing volume was replaced: %v", err)
	}
}

func TestCreateVolumeRejectsBadRequests(t *testing.T) {
	c, _ := newController(t)
	for _, name := range []string{"", "../etc", "a/b", ".partial-a", ".hidden"} {
		_, err := createVolume(t, c, name, nil)
		wantCode(t, err, codes.InvalidArgument)
	}

	_, err := c.CreateVolume(context.Background(), &csi.CreateVolumeRequest{
		Name: "block",
		VolumeCapabilities: []*csi.VolumeCapability{{
			AccessType: &csi.VolumeCapability_Block{Block: &csi.VolumeCapability_BlockVolume{}},
			AccessMode: &csi.VolumeCapability_AccessMode{Mode: csi.VolumeCapability_AccessMode_SINGLE_NODE_WRITER},
		}},
	})
	wantCode(t, err, codes.InvalidArgument)

	_, err = c.CreateVolume(context.Background(), &csi.CreateVolumeRequest{
		Name:               "bad-uid",
		VolumeCapabilities: mountCap(),
		Parameters:         map[string]string{ParamUID: "dev"},
	})
	wantCode(t, err, codes.InvalidArgument)

	_, err = createVolume(t, c, "from-nothing", fromSnapshot("missing"))
	wantCode(t, err, codes.NotFound)
}

func TestSnapshotSeedsANewVolume(t *testing.T) {
	c, _ := newController(t)
	ctx := context.Background()
	if _, err := createVolume(t, c, "golden", nil); err != nil {
		t.Fatal(err)
	}
	golden := filepath.Join(c.Root, "homes", "golden")
	if err := os.MkdirAll(filepath.Join(golden, "repo", "target"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(golden, "repo", "target", "built"), []byte("artifact"), 0o644); err != nil {
		t.Fatal(err)
	}

	snap, err := c.CreateSnapshot(ctx, &csi.CreateSnapshotRequest{Name: "seed-1", SourceVolumeId: "golden"})
	if err != nil {
		t.Fatal(err)
	}
	if !snap.GetSnapshot().GetReadyToUse() || snap.GetSnapshot().GetSourceVolumeId() != "golden" {
		t.Fatalf("unexpected snapshot %v", snap.GetSnapshot())
	}
	if err := os.WriteFile(filepath.Join(golden, "after"), nil, 0o644); err != nil {
		t.Fatal(err)
	}

	if _, err := c.CreateSnapshot(ctx, &csi.CreateSnapshotRequest{Name: "seed-1", SourceVolumeId: "golden"}); err != nil {
		t.Fatalf("taking the same snapshot again: %v", err)
	}
	_, err = c.CreateSnapshot(ctx, &csi.CreateSnapshotRequest{Name: "seed-1", SourceVolumeId: "other"})
	wantCode(t, err, codes.AlreadyExists)
	_, err = c.CreateSnapshot(ctx, &csi.CreateSnapshotRequest{Name: "seed-2", SourceVolumeId: "missing"})
	wantCode(t, err, codes.NotFound)

	if _, err := createVolume(t, c, "box", fromSnapshot("seed-1")); err != nil {
		t.Fatal(err)
	}
	got, err := os.ReadFile(filepath.Join(c.Root, "homes", "box", "repo", "target", "built"))
	if err != nil || string(got) != "artifact" {
		t.Fatalf("the seeded volume is missing the seed's files: %q, %v", got, err)
	}
	if _, err := os.Stat(filepath.Join(c.Root, "homes", "box", "after")); !errors.Is(err, os.ErrNotExist) {
		t.Errorf("the seeded volume has a file written after the snapshot: %v", err)
	}

	if _, err := c.DeleteSnapshot(ctx, &csi.DeleteSnapshotRequest{SnapshotId: "seed-1"}); err != nil {
		t.Fatal(err)
	}
	if _, err := c.DeleteSnapshot(ctx, &csi.DeleteSnapshotRequest{SnapshotId: "seed-1"}); err != nil {
		t.Fatalf("deleting a deleted snapshot: %v", err)
	}
	if _, err := os.Stat(filepath.Join(c.Root, "homes", "box", "repo", "target", "built")); err != nil {
		t.Errorf("deleting the seed removed a volume cloned from it: %v", err)
	}
}

func TestInterruptedClonesAreRetried(t *testing.T) {
	c, cli := newController(t)
	ctx := context.Background()
	if _, err := createVolume(t, c, "golden", nil); err != nil {
		t.Fatal(err)
	}
	if _, err := c.CreateSnapshot(ctx, &csi.CreateSnapshotRequest{Name: "seed", SourceVolumeId: "golden"}); err != nil {
		t.Fatal(err)
	}

	cli.failClone = errors.New("metadata store went away")
	_, err := createVolume(t, c, "box", fromSnapshot("seed"))
	wantCode(t, err, codes.Internal)
	if _, err := os.Stat(filepath.Join(c.Root, "homes", "box")); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("a failed clone left a volume behind: %v", err)
	}

	cli.failClone = nil
	if err := os.MkdirAll(filepath.Join(c.Root, "homes", ".partial-box", "half"), 0o755); err != nil {
		t.Fatal(err)
	}
	if _, err := createVolume(t, c, "box", fromSnapshot("seed")); err != nil {
		t.Fatalf("retrying over a partial clone: %v", err)
	}
	if _, err := os.Stat(filepath.Join(c.Root, "homes", "box", "half")); !errors.Is(err, os.ErrNotExist) {
		t.Errorf("the retried clone kept the partial clone's files: %v", err)
	}
}

func TestDeleteVolumeIsIdempotent(t *testing.T) {
	c, _ := newController(t)
	ctx := context.Background()
	if _, err := createVolume(t, c, "box", nil); err != nil {
		t.Fatal(err)
	}
	for range 2 {
		if _, err := c.DeleteVolume(ctx, &csi.DeleteVolumeRequest{VolumeId: "box"}); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := os.Stat(filepath.Join(c.Root, "homes", "box")); !errors.Is(err, os.ErrNotExist) {
		t.Errorf("the volume is still there: %v", err)
	}
	_, err := c.ValidateVolumeCapabilities(ctx, &csi.ValidateVolumeCapabilitiesRequest{VolumeId: "box", VolumeCapabilities: mountCap()})
	wantCode(t, err, codes.NotFound)
}

func createSeeded(c *Controller, name, seed string) error {
	_, err := c.CreateVolume(context.Background(), &csi.CreateVolumeRequest{
		Name:               name,
		CapacityRange:      &csi.CapacityRange{RequiredBytes: 10 << 30},
		VolumeCapabilities: mountCap(),
		Parameters:         map[string]string{ParamSeed: seed},
	})
	return err
}

func TestTheGoldenVolumeBecomesItsStorageClassSeed(t *testing.T) {
	c, _ := newController(t)
	ctx := context.Background()
	const seed = "devbox-platform-x.platform-r1"

	if err := createSeeded(c, "substrate-golden-home", seed); err != nil {
		t.Fatal(err)
	}
	if err := createSeeded(c, "substrate-golden-home", seed); err != nil {
		t.Fatalf("Substrate retrying the golden volume: %v", err)
	}
	built := filepath.Join(c.Root, "homes", "substrate-golden-home", "repo", "built")
	if err := os.MkdirAll(filepath.Dir(built), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(built, []byte("artifact"), 0o644); err != nil {
		t.Fatal(err)
	}
	wantCode(t, createSeeded(c, "substrate-early-home", seed), codes.FailedPrecondition)

	for range 2 {
		if _, err := c.DeleteVolume(ctx, &csi.DeleteVolumeRequest{VolumeId: "substrate-golden-home"}); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := os.Stat(filepath.Join(c.Root, "homes", "substrate-golden-home")); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("the golden volume is still there: %v", err)
	}

	if err := createSeeded(c, "substrate-box-home", seed); err != nil {
		t.Fatal(err)
	}
	got, err := os.ReadFile(filepath.Join(c.Root, "homes", "substrate-box-home", "repo", "built"))
	if err != nil || string(got) != "artifact" {
		t.Fatalf("the box's home is missing the golden boot's files: %q, %v", got, err)
	}
	if err := os.WriteFile(filepath.Join(c.Root, "homes", "substrate-box-home", "secret"), nil, 0o600); err != nil {
		t.Fatal(err)
	}
	if _, err := c.DeleteVolume(ctx, &csi.DeleteVolumeRequest{VolumeId: "substrate-box-home"}); err != nil {
		t.Fatal(err)
	}

	if _, err := c.DeleteSnapshot(ctx, &csi.DeleteSnapshotRequest{SnapshotId: seed}); err != nil {
		t.Fatal(err)
	}
	wantCode(t, createSeeded(c, "substrate-late-home", seed), codes.FailedPrecondition)
	if _, err := os.Stat(filepath.Join(c.Root, "homes", "substrate-late-home")); !errors.Is(err, os.ErrNotExist) {
		t.Errorf("a volume took over a deleted seed: %v", err)
	}
}

func claimSeed(c *Controller, name, seed string) error {
	_, err := c.CreateVolume(context.Background(), &csi.CreateVolumeRequest{
		Name:               name,
		VolumeCapabilities: mountCap(),
		Parameters:         map[string]string{ParamClaimSeed: seed},
	})
	return err
}

// The gateway claims a seed for the golden actor's home after Substrate created it from a StorageClass without one.
func TestAnExistingVolumeClaimsASeed(t *testing.T) {
	c, _ := newController(t)
	ctx := context.Background()
	const seed = "golden.0b6f6c1e-uid"

	wantCode(t, claimSeed(c, "substrate-golden-home", seed), codes.NotFound)
	if _, err := os.Stat(filepath.Join(c.Root, "homes", "substrate-golden-home")); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("a claim created the volume: %v", err)
	}
	for _, id := range []string{"substrate-golden-home", "substrate-box-home"} {
		if _, err := createVolume(t, c, id, nil); err != nil {
			t.Fatal(err)
		}
	}
	if err := os.WriteFile(filepath.Join(c.Root, "homes", "substrate-golden-home", "built"), []byte("artifact"), 0o644); err != nil {
		t.Fatal(err)
	}
	for range 2 {
		if err := claimSeed(c, "substrate-golden-home", seed); err != nil {
			t.Fatal(err)
		}
	}
	if _, err := os.Stat(filepath.Join(c.Root, "homes", "substrate-golden-home", "built")); err != nil {
		t.Fatalf("claiming emptied the volume: %v", err)
	}
	wantCode(t, claimSeed(c, "substrate-box-home", seed), codes.AlreadyExists)
	wantCode(t, claimSeed(c, "substrate-golden-home", "golden.other"), codes.AlreadyExists)

	// Until Substrate deletes the golden actor, the seed is claimed but not captured: a home can't start from it yet.
	_, err := createVolume(t, c, "substrate-early-home", fromSnapshot(seed))
	wantCode(t, err, codes.FailedPrecondition)

	if _, err := c.DeleteVolume(ctx, &csi.DeleteVolumeRequest{VolumeId: "substrate-golden-home"}); err != nil {
		t.Fatal(err)
	}
	if err := claimSeed(c, "substrate-golden-home", seed); status.Code(err) != codes.OK {
		t.Fatalf("claiming the captured seed again from its own volume: %v", err)
	}
	if _, err := os.Stat(filepath.Join(c.Root, "homes", "substrate-golden-home")); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("claiming a captured seed recreated its volume: %v", err)
	}
	if _, err := createVolume(t, c, "substrate-new-home", fromSnapshot(seed)); err != nil {
		t.Fatal(err)
	}
	if got, err := os.ReadFile(filepath.Join(c.Root, "homes", "substrate-new-home", "built")); err != nil || string(got) != "artifact" {
		t.Fatalf("a home seeded from the claim is missing the golden boot's files: %q, %v", got, err)
	}
	// Substrate creates the pre-seeded volume again without a source; it keeps the seed's files.
	if _, err := createVolume(t, c, "substrate-new-home", nil); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(c.Root, "homes", "substrate-new-home", "built")); err != nil {
		t.Fatalf("creating the pre-seeded volume again replaced it: %v", err)
	}
	wantCode(t, claimSeed(c, "substrate-new-home", seed), codes.AlreadyExists)
	_, err = createVolume(t, c, "substrate-missing-home", fromSnapshot("golden.never-claimed"))
	wantCode(t, err, codes.NotFound)
}

func TestOwnerParameters(t *testing.T) {
	c, _ := newController(t)
	uid, gid := os.Getuid(), os.Getgid()
	_, err := c.CreateVolume(context.Background(), &csi.CreateVolumeRequest{
		Name:               "owned",
		VolumeCapabilities: mountCap(),
		Parameters:         map[string]string{ParamUID: strconv.Itoa(uid), ParamGID: strconv.Itoa(gid), ParamMode: "0o700"},
	})
	if err != nil {
		t.Fatal(err)
	}
	info, err := os.Stat(filepath.Join(c.Root, "homes", "owned"))
	if err != nil {
		t.Fatal(err)
	}
	if info.Mode().Perm() != 0o700 {
		t.Errorf("mode = %v, want 0700", info.Mode().Perm())
	}
}
