package zerofs

import (
	"context"
	"sync"
	"testing"

	"github.com/container-storage-interface/spec/lib/go/csi"
	"github.com/go-logr/logr"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// fakeHost stages and binds in memory: staged volumes and bind targets are both mounts.
type fakeHost struct {
	mu      sync.Mutex
	mounts  map[string]string
	staged  []Volume
	binds   int
	unstage int
}

func (f *fakeHost) Stage(_ context.Context, v Volume, staging string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.mounts == nil {
		f.mounts = map[string]string{}
	}
	f.mounts[staging] = v.ID
	f.staged = append(f.staged, v)
	return nil
}

func (f *fakeHost) Unstage(_ context.Context, _ string, staging string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	delete(f.mounts, staging)
	f.unstage++
	return nil
}

func (f *fakeHost) Bind(source, target string, _ bool) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.mounts[target] = f.mounts[source]
	f.binds++
	return nil
}

func (f *fakeHost) Unmount(target string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	delete(f.mounts, target)
	return nil
}

func (f *fakeHost) Mounted(path string) (bool, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	_, ok := f.mounts[path]
	return ok, nil
}

const (
	testStaging = "/var/lib/ate/staging/substrate-a-home"
	testTarget  = "/var/lib/ate/actors/a/volumes/home"
)

func newNode(h *fakeHost) *Node {
	return &Node{NodeID: "node-a", TargetRoot: "/var/lib/ate", Stager: h, Binder: h, Log: logr.Discard()}
}

func stageRequest() *csi.NodeStageVolumeRequest {
	return &csi.NodeStageVolumeRequest{
		VolumeId:          "substrate-a-home",
		StagingTargetPath: testStaging,
		VolumeCapability:  mountCap()[0],
		VolumeContext:     map[string]string{contextCapacity: "1073741824", ParamUID: "1000", ParamMode: "755"},
	}
}

func publishRequest() *csi.NodePublishVolumeRequest {
	return &csi.NodePublishVolumeRequest{
		VolumeId:          "substrate-a-home",
		StagingTargetPath: testStaging,
		TargetPath:        testTarget,
		VolumeCapability:  mountCap()[0],
	}
}

func TestNodeAdvertisesStaging(t *testing.T) {
	resp, err := newNode(&fakeHost{}).NodeGetCapabilities(context.Background(), &csi.NodeGetCapabilitiesRequest{})
	if err != nil {
		t.Fatal(err)
	}
	if len(resp.GetCapabilities()) != 1 ||
		resp.GetCapabilities()[0].GetRpc().GetType() != csi.NodeServiceCapability_RPC_STAGE_UNSTAGE_VOLUME {
		t.Fatalf("capabilities = %v", resp.GetCapabilities())
	}
}

func TestNodeStagesPublishesAndTearsDown(t *testing.T) {
	h := &fakeHost{}
	n := newNode(h)
	ctx := context.Background()

	if _, err := n.NodeStageVolume(ctx, stageRequest()); err != nil {
		t.Fatal(err)
	}
	want := Volume{ID: "substrate-a-home", CapacityBytes: 1 << 30, Owner: Owner{UID: 1000, GID: -1, Mode: 0o755}}
	if len(h.staged) != 1 || h.staged[0] != want {
		t.Fatalf("staged = %+v, want %+v", h.staged, want)
	}
	for range 2 {
		if _, err := n.NodePublishVolume(ctx, publishRequest()); err != nil {
			t.Fatal(err)
		}
	}
	if h.binds != 1 {
		t.Fatalf("binds = %d, want one for two publishes", h.binds)
	}
	if _, err := n.NodeUnpublishVolume(ctx, &csi.NodeUnpublishVolumeRequest{VolumeId: "substrate-a-home", TargetPath: testTarget}); err != nil {
		t.Fatal(err)
	}
	if _, err := n.NodeUnstageVolume(ctx, &csi.NodeUnstageVolumeRequest{VolumeId: "substrate-a-home", StagingTargetPath: testStaging}); err != nil {
		t.Fatal(err)
	}
	if len(h.mounts) != 0 || h.unstage != 1 {
		t.Fatalf("mounts = %v, unstages = %d", h.mounts, h.unstage)
	}
}

func TestNodePublishNeedsAStagedVolume(t *testing.T) {
	_, err := newNode(&fakeHost{mounts: map[string]string{}}).NodePublishVolume(context.Background(), publishRequest())
	if status.Code(err) != codes.FailedPrecondition {
		t.Fatalf("err = %v", err)
	}
}

func TestNodeConfinesPathsAndValidatesContext(t *testing.T) {
	n := newNode(&fakeHost{})
	ctx := context.Background()

	escape := stageRequest()
	escape.StagingTargetPath = "/var/lib/ate/../kubelet/x"
	noCapacity := stageRequest()
	noCapacity.VolumeContext = map[string]string{}
	badID := stageRequest()
	badID.VolumeId = "a/b"
	for name, req := range map[string]*csi.NodeStageVolumeRequest{
		"escape": escape, "no capacity": noCapacity, "bad id": badID,
	} {
		if _, err := n.NodeStageVolume(ctx, req); status.Code(err) != codes.InvalidArgument {
			t.Errorf("%s: err = %v", name, err)
		}
	}

	outside := publishRequest()
	outside.TargetPath = "/etc"
	if _, err := n.NodePublishVolume(ctx, outside); status.Code(err) != codes.InvalidArgument {
		t.Errorf("outside target: err = %v", err)
	}
}
