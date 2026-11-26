package zerofs

import (
	"context"
	"io"
	"maps"
	"slices"
	"strings"
	"testing"

	"github.com/container-storage-interface/spec/lib/go/csi"
	"github.com/go-logr/logr"
	"gocloud.dev/blob"
	"gocloud.dev/blob/memblob"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func memStore(t *testing.T) BlobStore {
	t.Helper()
	bucket := memblob.OpenBucket(nil)
	t.Cleanup(func() { _ = bucket.Close() })
	return BlobStore{Bucket: bucket}
}

// objects lists every object in the bucket with its contents.
func objects(t *testing.T, s BlobStore) map[string]string {
	t.Helper()
	out := map[string]string{}
	it := s.Bucket.List(&blob.ListOptions{})
	for {
		obj, err := it.Next(context.Background())
		if err == io.EOF {
			return out
		}
		if err != nil {
			t.Fatal(err)
		}
		data, err := s.Bucket.ReadAll(context.Background(), obj.Key)
		if err != nil {
			t.Fatal(err)
		}
		out[obj.Key] = string(data)
	}
}

func put(t *testing.T, s BlobStore, kv map[string]string) {
	t.Helper()
	for k, v := range kv {
		if err := s.Write(context.Background(), k, []byte(v)); err != nil {
			t.Fatal(err)
		}
	}
}

func seeded(name, seed string) *csi.CreateVolumeRequest {
	return &csi.CreateVolumeRequest{
		Name:               name,
		VolumeCapabilities: mountCap(),
		Parameters:         map[string]string{ParamSeed: seed},
	}
}

func mountCap() []*csi.VolumeCapability {
	return []*csi.VolumeCapability{{
		AccessType: &csi.VolumeCapability_Mount{Mount: &csi.VolumeCapability_MountVolume{}},
		AccessMode: &csi.VolumeCapability_AccessMode{Mode: csi.VolumeCapability_AccessMode_SINGLE_NODE_WRITER},
	}}
}

func newController(store Store) *Controller {
	return &Controller{
		Storage:         Storage{Scheme: "s3", Bucket: "snapshots", Path: "devbox-homes"},
		Store:           store,
		DefaultCapacity: 1 << 30,
		Log:             logr.Discard(),
	}
}

func TestCreateVolumeCarriesCapacityAndOwnerToTheNode(t *testing.T) {
	c := newController(memStore(t))
	resp, err := c.CreateVolume(context.Background(), &csi.CreateVolumeRequest{
		Name:               "substrate-a-home",
		CapacityRange:      &csi.CapacityRange{RequiredBytes: 20 << 30},
		VolumeCapabilities: mountCap(),
		Parameters:         map[string]string{ParamUID: "1000", ParamGID: "1000", ParamMode: "0750"},
	})
	if err != nil {
		t.Fatal(err)
	}
	v := resp.GetVolume()
	if v.GetVolumeId() != "substrate-a-home" || v.GetCapacityBytes() != 20<<30 {
		t.Fatalf("volume = %v", v)
	}
	got, err := volumeFromContext(v.GetVolumeId(), v.GetVolumeContext())
	if err != nil {
		t.Fatal(err)
	}
	want := Volume{ID: "substrate-a-home", CapacityBytes: 20 << 30, Owner: Owner{UID: 1000, GID: 1000, Mode: 0o750}}
	if got != want {
		t.Fatalf("volume from context = %+v, want %+v", got, want)
	}
}

func TestCreateVolumeDefaultsTheCapacity(t *testing.T) {
	c := newController(memStore(t))
	resp, err := c.CreateVolume(context.Background(), &csi.CreateVolumeRequest{
		Name:               "substrate-a-home",
		VolumeCapabilities: mountCap(),
	})
	if err != nil {
		t.Fatal(err)
	}
	if resp.GetVolume().GetCapacityBytes() != 1<<30 {
		t.Fatalf("capacity = %d", resp.GetVolume().GetCapacityBytes())
	}
	got, err := volumeFromContext("substrate-a-home", resp.GetVolume().GetVolumeContext())
	if err != nil {
		t.Fatal(err)
	}
	if got.Owner != (Owner{UID: -1, GID: -1, Mode: 0o755}) {
		t.Fatalf("owner = %+v", got.Owner)
	}
}

func TestCreateVolumeRefusesWhatItCantServe(t *testing.T) {
	c := newController(memStore(t))
	block := []*csi.VolumeCapability{{
		AccessType: &csi.VolumeCapability_Block{Block: &csi.VolumeCapability_BlockVolume{}},
		AccessMode: &csi.VolumeCapability_AccessMode{Mode: csi.VolumeCapability_AccessMode_SINGLE_NODE_WRITER},
	}}
	multi := []*csi.VolumeCapability{{
		AccessType: &csi.VolumeCapability_Mount{Mount: &csi.VolumeCapability_MountVolume{}},
		AccessMode: &csi.VolumeCapability_AccessMode{Mode: csi.VolumeCapability_AccessMode_MULTI_NODE_MULTI_WRITER},
	}}
	xfs := []*csi.VolumeCapability{{
		AccessType: &csi.VolumeCapability_Mount{Mount: &csi.VolumeCapability_MountVolume{FsType: "xfs"}},
		AccessMode: &csi.VolumeCapability_AccessMode{Mode: csi.VolumeCapability_AccessMode_SINGLE_NODE_WRITER},
	}}
	snapshot := &csi.VolumeContentSource{Type: &csi.VolumeContentSource_Snapshot{
		Snapshot: &csi.VolumeContentSource_SnapshotSource{SnapshotId: "seed"},
	}}
	for name, tc := range map[string]struct {
		req  *csi.CreateVolumeRequest
		code codes.Code
	}{
		"bad name":   {&csi.CreateVolumeRequest{Name: "../x", VolumeCapabilities: mountCap()}, codes.InvalidArgument},
		"block":      {&csi.CreateVolumeRequest{Name: "a", VolumeCapabilities: block}, codes.InvalidArgument},
		"multi node": {&csi.CreateVolumeRequest{Name: "a", VolumeCapabilities: multi}, codes.InvalidArgument},
		"xfs":        {&csi.CreateVolumeRequest{Name: "a", VolumeCapabilities: xfs}, codes.InvalidArgument},
		"bad mode": {&csi.CreateVolumeRequest{Name: "a", VolumeCapabilities: mountCap(),
			Parameters: map[string]string{ParamMode: "rwx"}}, codes.InvalidArgument},
		"snapshot": {&csi.CreateVolumeRequest{Name: "a", VolumeCapabilities: mountCap(),
			VolumeContentSource: snapshot}, codes.Unimplemented},
		"bad seed": {&csi.CreateVolumeRequest{Name: "a", VolumeCapabilities: mountCap(),
			Parameters: map[string]string{ParamSeed: "../rev-1"}}, codes.InvalidArgument},
	} {
		t.Run(name, func(t *testing.T) {
			_, err := c.CreateVolume(context.Background(), tc.req)
			if status.Code(err) != tc.code {
				t.Fatalf("err = %v, want %s", err, tc.code)
			}
		})
	}
}

func TestDeleteVolumeDeletesOnlyItsPrefix(t *testing.T) {
	store := memStore(t)
	put(t, store, map[string]string{
		"devbox-homes/homes/substrate-a-home/manifest/1": "a",
		"devbox-homes/homes/substrate-a-home/wal/1.sst":  "a",
		"devbox-homes/homes/substrate-a-home-2/wal/1":    "b",
	})
	c := newController(store)
	if _, err := c.DeleteVolume(context.Background(), &csi.DeleteVolumeRequest{VolumeId: "substrate-a-home"}); err != nil {
		t.Fatal(err)
	}
	if got := slices.Collect(maps.Keys(objects(t, store))); !slices.Equal(got, []string{"devbox-homes/homes/substrate-a-home-2/wal/1"}) {
		t.Fatalf("objects left = %v", got)
	}
	if _, err := c.DeleteVolume(context.Background(), &csi.DeleteVolumeRequest{VolumeId: ".."}); status.Code(err) != codes.InvalidArgument {
		t.Fatalf("err = %v", err)
	}
}

func TestSeededVolumesStartFromTheGoldenVolume(t *testing.T) {
	ctx := context.Background()
	store := memStore(t)
	c := newController(store)

	// The golden actor's volume claims the seed and starts empty.
	if _, err := c.CreateVolume(ctx, seeded("golden-home", "ate.rev-1")); err != nil {
		t.Fatal(err)
	}
	// Until the golden volume is deleted, no other volume can start.
	if _, err := c.CreateVolume(ctx, seeded("box-1-home", "ate.rev-1")); status.Code(err) != codes.FailedPrecondition {
		t.Fatalf("err = %v, want FailedPrecondition", err)
	}
	// Recreating the golden volume, as a retry would, returns it as it is.
	if _, err := c.CreateVolume(ctx, seeded("golden-home", "ate.rev-1")); err != nil {
		t.Fatal(err)
	}

	// Its writer fills it; deleting it captures the seed.
	put(t, store, map[string]string{
		"devbox-homes/homes/golden-home/manifest/00001.manifest": "m1",
		"devbox-homes/homes/golden-home/wal/00001.sst":           "w1",
	})
	if _, err := c.DeleteVolume(ctx, &csi.DeleteVolumeRequest{VolumeId: "golden-home"}); err != nil {
		t.Fatal(err)
	}

	if _, err := c.CreateVolume(ctx, seeded("box-1-home", "ate.rev-1")); err != nil {
		t.Fatal(err)
	}
	// The box writes to its copy; recreating it must not copy the seed over that.
	put(t, store, map[string]string{"devbox-homes/homes/box-1-home/wal/00002.sst": "w2"})
	if _, err := c.CreateVolume(ctx, seeded("box-1-home", "ate.rev-1")); err != nil {
		t.Fatal(err)
	}

	want := map[string]string{
		"devbox-homes/seeds/ate.rev-1/manifest/00001.manifest":  "m1",
		"devbox-homes/seeds/ate.rev-1/wal/00001.sst":            "w1",
		"devbox-homes/homes/box-1-home/manifest/00001.manifest": "m1",
		"devbox-homes/homes/box-1-home/wal/00001.sst":           "w1",
		"devbox-homes/homes/box-1-home/wal/00002.sst":           "w2",
		"devbox-homes/meta/claims/ate.rev-1":                    "golden-home",
		"devbox-homes/meta/captured/ate.rev-1":                  "golden-home",
		"devbox-homes/meta/cloned/box-1-home":                   "ate.rev-1",
	}
	if got := objects(t, store); !maps.Equal(got, want) {
		t.Fatalf("objects =\n%v\nwant\n%v", got, want)
	}

	// Deleting a box's home leaves the seed.
	if _, err := c.DeleteVolume(ctx, &csi.DeleteVolumeRequest{VolumeId: "box-1-home"}); err != nil {
		t.Fatal(err)
	}
	got := objects(t, store)
	for k := range got {
		if strings.HasPrefix(k, "devbox-homes/homes/box-1-home/") || k == "devbox-homes/meta/cloned/box-1-home" {
			t.Fatalf("%s survived deleting box-1-home", k)
		}
	}
	if got["devbox-homes/seeds/ate.rev-1/wal/00001.sst"] != "w1" {
		t.Fatalf("seed lost: %v", got)
	}
}

func TestSeededVolumeReplacesAnInterruptedCopy(t *testing.T) {
	ctx := context.Background()
	store := memStore(t)
	put(t, store, map[string]string{
		"devbox-homes/seeds/ate.rev-1/wal/00001.sst":  "w1",
		"devbox-homes/meta/captured/ate.rev-1":        "golden-home",
		"devbox-homes/homes/box-1-home/wal/stale.sst": "partial",
	})
	if _, err := newController(store).CreateVolume(ctx, seeded("box-1-home", "ate.rev-1")); err != nil {
		t.Fatal(err)
	}
	got := objects(t, store)
	if _, ok := got["devbox-homes/homes/box-1-home/wal/stale.sst"]; ok {
		t.Fatalf("the interrupted copy survived: %v", got)
	}
	if got["devbox-homes/homes/box-1-home/wal/00001.sst"] != "w1" {
		t.Fatalf("volume wasn't copied from its seed: %v", got)
	}
}

func TestDeletingAnUnwrittenGoldenVolumeCapturesNothing(t *testing.T) {
	ctx := context.Background()
	store := memStore(t)
	c := newController(store)
	if _, err := c.CreateVolume(ctx, seeded("golden-home", "ate.rev-1")); err != nil {
		t.Fatal(err)
	}
	if _, err := c.DeleteVolume(ctx, &csi.DeleteVolumeRequest{VolumeId: "golden-home"}); err != nil {
		t.Fatal(err)
	}
	if got := objects(t, store); !maps.Equal(got, map[string]string{"devbox-homes/meta/claims/ate.rev-1": "golden-home"}) {
		t.Fatalf("objects = %v", got)
	}
	if _, err := c.CreateVolume(ctx, seeded("box-1-home", "ate.rev-1")); status.Code(err) != codes.FailedPrecondition {
		t.Fatalf("err = %v, want FailedPrecondition", err)
	}
}

// blockingCopies holds every copy into a volume of block until release closes.
type blockingCopies struct {
	Store
	block   string
	started chan struct{}
	release chan struct{}
}

func (s *blockingCopies) CopyPrefix(ctx context.Context, src, dst string) (int, error) {
	if strings.Contains(dst, "/homes/"+s.block+"/") {
		close(s.started)
		<-s.release
	}
	return s.Store.CopyPrefix(ctx, src, dst)
}

func TestCopiesOfACapturedSeedRunInParallel(t *testing.T) {
	ctx := context.Background()
	store := memStore(t)
	put(t, store, map[string]string{
		"devbox-homes/seeds/ate.rev-1/wal/00001.sst": "w1",
		"devbox-homes/meta/claims/ate.rev-1":         "golden-home",
		"devbox-homes/meta/captured/ate.rev-1":       "golden-home",
	})
	blocking := &blockingCopies{Store: store, block: "box-1-home", started: make(chan struct{}), release: make(chan struct{})}
	c := newController(blocking)

	first := make(chan error, 1)
	go func() {
		_, err := c.CreateVolume(ctx, seeded("box-1-home", "ate.rev-1"))
		first <- err
	}()
	<-blocking.started
	// box-1-home's copy holds its volume's lock, but not the seed's.
	if _, err := c.CreateVolume(ctx, seeded("box-2-home", "ate.rev-1")); err != nil {
		t.Fatal(err)
	}
	close(blocking.release)
	if err := <-first; err != nil {
		t.Fatal(err)
	}
	got := objects(t, store)
	for _, box := range []string{"box-1-home", "box-2-home"} {
		if got["devbox-homes/homes/"+box+"/wal/00001.sst"] != "w1" || got["devbox-homes/meta/cloned/"+box] != "ate.rev-1" {
			t.Fatalf("%s wasn't copied from the seed: %v", box, got)
		}
	}
}
