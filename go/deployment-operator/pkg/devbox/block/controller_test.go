package block

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/container-storage-interface/spec/lib/go/csi"
	"github.com/go-logr/logr"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type fakeDisk struct {
	DiskSpec
	zone string
	size int64
}

type createCall struct {
	name string
	spec DiskSpec
}

// fakeDisks plays the provider: disks live in their first node's zone, and attach anywhere in it.
type fakeDisks struct {
	zones     map[string]string // node -> zone
	creates   []createCall
	expands   map[string]int64
	disks     map[string]*fakeDisk
	attached  map[string]string // disk -> node
	deleted   []string
	failDel   map[string]int  // disk -> deletes that fail
	snapshots map[string]int  // snapshot -> polls until ready
	stuck     map[string]bool // snapshot -> never ready
	snapDel   []string
}

func newFakeDisks() *fakeDisks {
	return &fakeDisks{
		zones:   map[string]string{"node-a": "us-east-2a", "node-a2": "us-east-2a", "node-b": "us-east-2b"},
		expands: map[string]int64{}, disks: map[string]*fakeDisk{}, attached: map[string]string{}, failDel: map[string]int{},
		snapshots: map[string]int{}, stuck: map[string]bool{},
	}
}

func (f *fakeDisks) zone(node string) (string, error) {
	z, ok := f.zones[node]
	if !ok {
		return "", status.Errorf(codes.NotFound, "node %s doesn't exist", node)
	}
	return z, nil
}

func (f *fakeDisks) Create(_ context.Context, name string, spec DiskSpec) (int64, error) {
	if d, ok := f.disks[name]; ok {
		return d.size, nil
	}
	z, err := f.zone(spec.Node)
	if err != nil {
		return 0, err
	}
	f.creates = append(f.creates, createCall{name, spec})
	f.disks[name] = &fakeDisk{DiskSpec: spec, zone: z, size: spec.CapacityBytes}
	return spec.CapacityBytes, nil
}

func (f *fakeDisks) Reachable(_ context.Context, disk, node string) (bool, error) {
	d, ok := f.disks[disk]
	if !ok {
		return false, status.Errorf(codes.NotFound, "no disk %s", disk)
	}
	z, err := f.zone(node)
	return z == d.zone, err
}

func (f *fakeDisks) Attach(_ context.Context, disk, node string) (string, error) {
	if _, ok := f.disks[disk]; !ok {
		return "", status.Errorf(codes.NotFound, "no disk %s", disk)
	}
	if n, ok := f.attached[disk]; ok && n != node {
		return "", status.Errorf(codes.FailedPrecondition, "disk %s is attached to %s", disk, n)
	}
	f.attached[disk] = node
	return "pods/uid/volumes/kubernetes.io~csi/pv-" + disk + "/mount", nil
}

func (f *fakeDisks) Detach(_ context.Context, disk, node string) error {
	if n, ok := f.attached[disk]; ok && (node == "" || n == node) {
		delete(f.attached, disk)
	}
	return nil
}

func (f *fakeDisks) Delete(_ context.Context, disk string) error {
	if f.failDel[disk] > 0 {
		f.failDel[disk]--
		return status.Error(codes.Unavailable, "disk is still attached")
	}
	f.deleted = append(f.deleted, disk)
	delete(f.disks, disk)
	delete(f.attached, disk)
	return nil
}

func (f *fakeDisks) Snapshot(_ context.Context, name, disk string) (bool, error) {
	if _, ok := f.disks[disk]; !ok {
		return false, status.Errorf(codes.NotFound, "no disk %s", disk)
	}
	left := f.snapshots[name]
	if left > 0 {
		f.snapshots[name] = left - 1
	}
	return left == 0 && !f.stuck[name], nil
}

func (f *fakeDisks) DeleteSnapshot(_ context.Context, name string) error {
	f.snapDel = append(f.snapDel, name)
	return nil
}

func (f *fakeDisks) Expand(_ context.Context, disk string, size int64) error {
	f.expands[disk] = size
	f.disks[disk].size = size
	return nil
}

var testProvider = &Provider{Name: "disk.example.com", SnapshotClass: "snaps"}

func newController(d *fakeDisks) *Controller {
	c := &Controller{Disks: d, Store: &MemoryStore{}, DefaultCapacity: 20 << 30, PollInterval: 1, Log: logr.Discard()}
	c.SetProvider(testProvider)
	return c
}

func mountCaps() []*csi.VolumeCapability { return []*csi.VolumeCapability{mountCapability()} }

func create(t *testing.T, c *Controller, name string, params map[string]string) (*csi.CreateVolumeResponse, error) {
	t.Helper()
	return c.CreateVolume(context.Background(), &csi.CreateVolumeRequest{
		Name:               name,
		CapacityRange:      &csi.CapacityRange{RequiredBytes: 10 << 30},
		VolumeCapabilities: mountCaps(),
		Parameters:         params,
	})
}

func publish(c *Controller, name, node string) (*csi.ControllerPublishVolumeResponse, error) {
	return c.ControllerPublishVolume(context.Background(), &csi.ControllerPublishVolumeRequest{
		VolumeId: name, NodeId: node, VolumeCapability: mountCapability(),
	})
}

func unpublish(t *testing.T, c *Controller, name, node string) {
	t.Helper()
	if _, err := c.ControllerUnpublishVolume(context.Background(), &csi.ControllerUnpublishVolumeRequest{VolumeId: name, NodeId: node}); err != nil {
		t.Fatal(err)
	}
}

func deleteVolume(t *testing.T, c *Controller, name string) {
	t.Helper()
	if _, err := c.DeleteVolume(context.Background(), &csi.DeleteVolumeRequest{VolumeId: name}); err != nil {
		t.Fatal(err)
	}
}

func TestDiskIsCreatedWhereTheFirstAttachCanReachIt(t *testing.T) {
	d := newFakeDisks()
	c := newController(d)

	resp, err := create(t, c, "substrate-a1-home", map[string]string{ParamUID: "1000", ParamGID: "1000", "type": "gp3", "volumeInitializationRate": "300"})
	if err != nil {
		t.Fatal(err)
	}
	if got := resp.GetVolume().GetVolumeId(); got != "substrate-a1-home" {
		t.Fatalf("Substrate should see the volume name as its id, got %q", got)
	}
	if ctx := resp.GetVolume().GetVolumeContext(); ctx[ParamUID] != "1000" || ctx[contextCapacity] != fmt.Sprint(10<<30) {
		t.Fatalf("volume context %v should carry the owner and capacity", ctx)
	}
	if len(d.creates) != 0 {
		t.Fatal("no disk should exist before the first attach")
	}

	pub, err := publish(c, "substrate-a1-home", "node-b")
	if err != nil {
		t.Fatal(err)
	}
	if len(d.creates) != 1 {
		t.Fatalf("the first attach should create one disk, got %d", len(d.creates))
	}
	disk := diskName("substrate-a1-home", 0)
	call := d.creates[0]
	if call.name != disk || call.spec.Node != "node-b" || call.spec.CapacityBytes != 10<<30 {
		t.Fatalf("disk should be created for the attaching node, got %+v", call)
	}
	if p := call.spec.Params; p["type"] != "gp3" || p["volumeInitializationRate"] != "300" || p[ParamUID] != "" || p[ParamGID] != "" {
		t.Fatalf("provider parameters %v should keep only the provider's", p)
	}
	if d.attached[disk] != "node-b" {
		t.Fatalf("disk should be attached to the node, got %v", d.attached)
	}
	if src := pub.GetPublishContext()[PublishContextSource]; src != "pods/uid/volumes/kubernetes.io~csi/pv-"+disk+"/mount" {
		t.Fatalf("publish context should say where the disk is mounted, got %v", pub.GetPublishContext())
	}
	unpublish(t, c, "substrate-a1-home", "node-b")
	if _, ok := d.attached[disk]; ok {
		t.Fatal("unpublish should detach the disk")
	}

	if _, err := publish(c, "substrate-a1-home", "node-unknown"); status.Code(err) != codes.NotFound {
		t.Fatalf("a node that doesn't exist should be NotFound, got %v", err)
	}

	if _, err := create(t, c, "substrate-a1-home", map[string]string{"type": "io2"}); err != nil {
		t.Fatal(err)
	}
	deleteVolume(t, c, "substrate-a1-home")
	if len(d.deleted) != 1 || d.deleted[0] != disk {
		t.Fatalf("delete should remove the disk, got %v", d.deleted)
	}
	if rec, _ := c.Store.GetVolume(context.Background(), "substrate-a1-home"); rec != nil {
		t.Fatal("delete should remove the record")
	}
}

func TestNothingIsServedUntilTheProviderPasses(t *testing.T) {
	c := newController(newFakeDisks())
	c.SetProvider(nil)
	if _, err := create(t, c, "substrate-p-home", nil); status.Code(err) != codes.Unavailable {
		t.Fatalf("an unchecked provider should be Unavailable, got %v", err)
	}
	c.SetProvider(&Provider{Name: "disk.example.com", Problems: []string{"can't snapshot disks"}})
	if err := c.Ready(); err == nil {
		t.Fatal("a provider with problems isn't ready")
	}
	if _, err := create(t, c, "substrate-p-home", nil); status.Code(err) != codes.Unavailable {
		t.Fatalf("a failing provider should be Unavailable, got %v", err)
	}
}

func TestAttachInTheSameZoneReusesTheDisk(t *testing.T) {
	d := newFakeDisks()
	c := newController(d)
	if _, err := create(t, c, "substrate-z-home", nil); err != nil {
		t.Fatal(err)
	}
	if _, err := publish(c, "substrate-z-home", "node-a"); err != nil {
		t.Fatal(err)
	}
	unpublish(t, c, "substrate-z-home", "node-a")
	if _, err := publish(c, "substrate-z-home", "node-a2"); err != nil {
		t.Fatal(err)
	}
	if len(d.creates) != 1 || d.attached[diskName("substrate-z-home", 0)] != "node-a2" {
		t.Fatalf("a node in the disk's zone attaches it without moving, got creates %v attached %v", d.creates, d.attached)
	}
}

func TestAttachToAnotherZoneMovesTheDiskThroughASnapshot(t *testing.T) {
	d := newFakeDisks()
	c := newController(d)
	c.MoveWait = 20 * time.Millisecond
	ctx := context.Background()
	if _, err := create(t, c, "substrate-m-home", map[string]string{"type": "gp3"}); err != nil {
		t.Fatal(err)
	}
	if _, err := publish(c, "substrate-m-home", "node-b"); err != nil {
		t.Fatal(err)
	}
	old := diskName("substrate-m-home", 0)
	// node-b went away without a detach, so the old disk is still attached there.
	snapshot := upstreamName("devbox-move-substrate-m-home-1")
	d.stuck[snapshot] = true
	if _, err := publish(c, "substrate-m-home", "node-a"); status.Code(err) != codes.Unavailable {
		t.Fatalf("an attach waiting for the move's snapshot should be Unavailable, got %v", err)
	}
	if rec, _ := c.Store.GetVolume(ctx, "substrate-m-home"); rec.Move == nil || rec.DiskID != old {
		t.Fatalf("the move should be recorded and the disk kept until it's done, got %+v", rec)
	}

	d.stuck[snapshot] = false
	d.failDel[old] = 1
	pub, err := publish(c, "substrate-m-home", "node-a")
	if err != nil {
		t.Fatal(err)
	}
	moved := diskName("substrate-m-home", 1)
	last := d.creates[len(d.creates)-1]
	switch {
	case last.name != moved:
		t.Fatalf("the moved disk should be named for its generation, got %q", last.name)
	case last.spec.Snapshot != snapshot:
		t.Fatalf("the moved disk should start from the move's snapshot, got %q", last.spec.Snapshot)
	case last.spec.Node != "node-a":
		t.Fatal("the moved disk should be created for the new node")
	case last.spec.Params["type"] != "gp3":
		t.Fatal("the moved disk keeps the volume's parameters")
	case d.attached[moved] != "node-a" || pub.GetPublishContext()[PublishContextSource] == "":
		t.Fatalf("the moved disk should be attached, got %v", d.attached)
	}
	rec, _ := c.Store.GetVolume(ctx, "substrate-m-home")
	if rec.Move != nil || rec.Generation != 1 || len(rec.Garbage) != 1 || rec.Garbage[0].Disk != old {
		t.Fatalf("the old disk should be left as garbage until it can be deleted, got %+v", rec)
	}
	if len(d.snapDel) != 1 || d.snapDel[0] != snapshot {
		t.Fatalf("the move's snapshot should be deleted, got %v", d.snapDel)
	}

	if err := c.CollectGarbage(ctx); err != nil {
		t.Fatal(err)
	}
	if rec, _ := c.Store.GetVolume(ctx, "substrate-m-home"); len(rec.Garbage) != 0 {
		t.Fatalf("the collector should delete the old disk, got %+v", rec.Garbage)
	}
	if _, ok := d.disks[old]; ok {
		t.Fatal("the old disk should be gone")
	}
}

func TestDeletingAMovingVolumeDeletesItsSnapshot(t *testing.T) {
	d := newFakeDisks()
	c := newController(d)
	c.MoveWait = time.Millisecond
	if _, err := create(t, c, "substrate-d-home", nil); err != nil {
		t.Fatal(err)
	}
	if _, err := publish(c, "substrate-d-home", "node-b"); err != nil {
		t.Fatal(err)
	}
	unpublish(t, c, "substrate-d-home", "node-b")
	d.stuck[upstreamName("devbox-move-substrate-d-home-1")] = true
	if _, err := publish(c, "substrate-d-home", "node-a"); status.Code(err) != codes.Unavailable {
		t.Fatalf("want Unavailable, got %v", err)
	}
	deleteVolume(t, c, "substrate-d-home")
	if len(d.snapDel) != 1 || len(d.disks) != 0 {
		t.Fatalf("deleting the volume should delete its disk and the move's snapshot, got disks %v snapshots %v", d.disks, d.snapDel)
	}
}

func TestDiskGrowsToItsGroupsSizeAtAttach(t *testing.T) {
	d := newFakeDisks()
	c := newController(d)
	size := int64(30 << 30)
	c.GroupSize = func(_ context.Context, group string) (int64, error) {
		if group != "ns" {
			return 0, nil
		}
		return size, nil
	}
	if _, err := create(t, c, "substrate-s-home", map[string]string{ParamGroup: "ns", ParamSize: "1"}); err != nil {
		t.Fatal(err)
	}
	if _, err := publish(c, "substrate-s-home", "node-a"); err != nil {
		t.Fatal(err)
	}
	disk := diskName("substrate-s-home", 0)
	if got := d.creates[0].spec.CapacityBytes; got != 30<<30 {
		t.Fatalf("a new disk should be created at its group's size, got %d", got)
	}
	if p := d.creates[0].spec.Params; p[ParamGroup] != "" || p[ParamSize] != "" {
		t.Fatalf("group and size aren't the provider's, got %v", p)
	}
	unpublish(t, c, "substrate-s-home", "node-a")

	size = 40 << 30
	if _, err := publish(c, "substrate-s-home", "node-a"); err != nil {
		t.Fatal(err)
	}
	if d.expands[disk] != 40<<30 {
		t.Fatalf("the disk should grow to the group's new size, got %v", d.expands)
	}
	unpublish(t, c, "substrate-s-home", "node-a")
	delete(d.expands, disk)
	if _, err := publish(c, "substrate-s-home", "node-a"); err != nil {
		t.Fatal(err)
	}
	if len(d.expands) != 0 {
		t.Fatal("a grown disk isn't grown again")
	}
	if rec, _ := c.Store.GetVolume(context.Background(), "substrate-s-home"); rec.CapacityBytes != 40<<30 {
		t.Fatalf("the grown size should be recorded, got %d", rec.CapacityBytes)
	}
}

func TestDeletingAVolumeNeverAttachedDeletesNoDisk(t *testing.T) {
	d := newFakeDisks()
	c := newController(d)
	if _, err := create(t, c, "substrate-x-home", nil); err != nil {
		t.Fatal(err)
	}
	deleteVolume(t, c, "substrate-x-home")
	deleteVolume(t, c, "substrate-x-home")
	if len(d.deleted) != 0 {
		t.Fatalf("no disk to delete, got %v", d.deleted)
	}
}

func TestUnpublishFromANodeThatIsGoneUsesTheLastNode(t *testing.T) {
	d := newFakeDisks()
	c := newController(d)
	if _, err := create(t, c, "substrate-g-home", nil); err != nil {
		t.Fatal(err)
	}
	if _, err := publish(c, "substrate-g-home", "node-a"); err != nil {
		t.Fatal(err)
	}
	unpublish(t, c, "substrate-g-home", "")
	if _, ok := d.attached[diskName("substrate-g-home", 0)]; ok {
		t.Fatal("disk should be detached from the node it was last attached to")
	}
}

func TestAttachElsewhereDetachesFromTheLostNodeFirst(t *testing.T) {
	d := newFakeDisks()
	c := newController(d)
	if _, err := create(t, c, "substrate-l-home", nil); err != nil {
		t.Fatal(err)
	}
	if _, err := publish(c, "substrate-l-home", "node-a"); err != nil {
		t.Fatal(err)
	}
	if _, err := publish(c, "substrate-l-home", "node-a2"); err != nil {
		t.Fatalf("an attach after the last node was lost should take the disk over: %v", err)
	}
	if d.attached[diskName("substrate-l-home", 0)] != "node-a2" {
		t.Fatalf("disk should be attached to the new node, got %v", d.attached)
	}
}

func TestSeedIsCapturedFromTheGoldenVolumeAndSeedsLaterDisks(t *testing.T) {
	d := newFakeDisks()
	c := newController(d)
	seed := map[string]string{ParamSeed: "ns.tmpl-1"}

	if _, err := create(t, c, "substrate-golden-home", seed); err != nil {
		t.Fatal(err)
	}
	if _, err := create(t, c, "substrate-early-home", seed); status.Code(err) != codes.FailedPrecondition {
		t.Fatalf("a volume before the seed is captured should fail with FailedPrecondition, got %v", err)
	}
	if _, err := publish(c, "substrate-golden-home", "node-a"); err != nil {
		t.Fatal(err)
	}
	if d.creates[0].spec.Snapshot != "" {
		t.Fatal("the golden disk starts empty")
	}
	unpublish(t, c, "substrate-golden-home", "node-a")

	d.snapshots[snapshotName("ns.tmpl-1")] = 2
	deleteVolume(t, c, "substrate-golden-home")
	s, _ := c.Store.GetSeed(context.Background(), "ns.tmpl-1")
	if !s.captured() || s.SnapshotID != snapshotName("ns.tmpl-1") {
		t.Fatalf("the seed should be captured once its snapshot is ready, got %+v", s)
	}
	if len(d.deleted) != 1 {
		t.Fatal("the golden disk should be deleted after its snapshot is taken")
	}

	if _, err := create(t, c, "substrate-b1-home", seed); err != nil {
		t.Fatal(err)
	}
	if _, err := publish(c, "substrate-b1-home", "node-b"); err != nil {
		t.Fatal(err)
	}
	if src := d.creates[1].spec.Snapshot; src != snapshotName("ns.tmpl-1") {
		t.Fatalf("a later disk should start from the seed's snapshot, got %q", src)
	}
}

func TestGoldenVolumeNeverAttachedReleasesItsSeed(t *testing.T) {
	c := newController(newFakeDisks())
	seed := map[string]string{ParamSeed: "ns.tmpl-2"}
	if _, err := create(t, c, "substrate-golden-home", seed); err != nil {
		t.Fatal(err)
	}
	deleteVolume(t, c, "substrate-golden-home")
	if s, _ := c.Store.GetSeed(context.Background(), "ns.tmpl-2"); s != nil {
		t.Fatalf("the claim should be released, got %+v", s)
	}
	if _, err := create(t, c, "substrate-next-home", seed); err != nil {
		t.Fatalf("the next volume should claim the seed: %v", err)
	}
	rec, _ := c.Store.GetVolume(context.Background(), "substrate-next-home")
	if !rec.Golden {
		t.Fatal("the next volume should be the seed's golden volume")
	}
}

func TestCollectSeedsDeletesSeedsNoClassNames(t *testing.T) {
	d := newFakeDisks()
	c := newController(d)
	ctx := context.Background()
	for _, s := range []*SeedRecord{
		{Name: "ns.live", Claim: "v1", SnapshotID: "snap-live"},
		{Name: "ns.dead", Claim: "v2", SnapshotID: "snap-dead"},
		{Name: "ns.pending", Claim: "v3", SnapshotID: "snap-pending"},
	} {
		if err := c.Store.PutSeed(ctx, s); err != nil {
			t.Fatal(err)
		}
	}
	if err := c.Store.PutVolume(ctx, &VolumeRecord{Name: "substrate-p-home", Seed: "ns.pending", SnapshotID: "snap-pending"}); err != nil {
		t.Fatal(err)
	}
	live := func(context.Context) (map[string]bool, error) { return map[string]bool{"ns.live": true}, nil }
	if err := c.CollectSeeds(ctx, live); err != nil {
		t.Fatal(err)
	}
	if len(d.snapDel) != 1 || d.snapDel[0] != "snap-dead" {
		t.Fatalf("only the dead seed's snapshot should be deleted, got %v", d.snapDel)
	}
	for name, want := range map[string]bool{"ns.live": true, "ns.dead": false, "ns.pending": true} {
		if s, _ := c.Store.GetSeed(ctx, name); (s != nil) != want {
			t.Fatalf("seed %s kept = %v, want %v", name, s != nil, want)
		}
	}
}
