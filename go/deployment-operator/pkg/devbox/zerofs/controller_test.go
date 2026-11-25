package zerofs

import (
	"context"
	"testing"

	"github.com/container-storage-interface/spec/lib/go/csi"
	"github.com/go-logr/logr"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type fakeStore struct {
	deleted []string
}

func (f *fakeStore) DeletePrefix(_ context.Context, prefix string) (int, error) {
	f.deleted = append(f.deleted, prefix)
	return 3, nil
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
	c := newController(&fakeStore{})
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
	c := newController(&fakeStore{})
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
	c := newController(&fakeStore{})
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
		"seed": {&csi.CreateVolumeRequest{Name: "a", VolumeCapabilities: mountCap(),
			Parameters: map[string]string{ParamSeed: "rev-1"}}, codes.Unimplemented},
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
	store := &fakeStore{}
	c := newController(store)
	if _, err := c.DeleteVolume(context.Background(), &csi.DeleteVolumeRequest{VolumeId: "substrate-a-home"}); err != nil {
		t.Fatal(err)
	}
	if len(store.deleted) != 1 || store.deleted[0] != "devbox-homes/homes/substrate-a-home/" {
		t.Fatalf("deleted = %v", store.deleted)
	}
	if _, err := c.DeleteVolume(context.Background(), &csi.DeleteVolumeRequest{VolumeId: ".."}); status.Code(err) != codes.InvalidArgument {
		t.Fatalf("err = %v", err)
	}
}
