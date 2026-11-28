package block

import (
	"context"
	"errors"
	"fmt"
	"sync/atomic"
	"time"

	"github.com/container-storage-interface/spec/lib/go/csi"
	"github.com/go-logr/logr"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

const (
	// snapshotTimeout bounds capturing a seed. It runs detached from the request, so a caller that times out and
	// retries waits for the same snapshot under the seed's lock instead of starting another.
	snapshotTimeout = time.Hour

	// DefaultMoveWait is how long an attach waits for a moving disk's snapshot before asking the caller to retry.
	DefaultMoveWait = time.Minute
)

// GroupSize reports the largest size, in bytes, any StorageClass of a group asks for; 0 when none does.
type GroupSize func(ctx context.Context, group string) (int64, error)

// Controller is the CSI controller service Substrate calls. It runs as a single replica, so its locks serialize
// every operation on a volume or seed. Seed locks are taken before volume locks.
type Controller struct {
	csi.UnimplementedControllerServer

	Disks Disks
	Store Store
	// GroupSize sizes disks at attach. Nil: disks keep their size.
	GroupSize GroupSize
	// DefaultCapacity sizes a volume created without a capacity.
	DefaultCapacity int64
	// PollInterval is how often a pending snapshot is checked.
	PollInterval time.Duration
	// MoveWait is how long an attach waits for a moving disk's snapshot. Defaults to DefaultMoveWait.
	MoveWait time.Duration
	// DetachDelay is how long a disk Substrate detaches stays attached to its node, so a box resumed there within
	// it skips the detach and the attach, each of which takes the provider 10-20s. 0 detaches at once.
	DetachDelay time.Duration
	Log         logr.Logger

	provider atomic.Pointer[Provider]
	volumes  keyedLock
	seeds    keyedLock
}

// SetProvider records the latest preflight. Until one passes, the controller creates and attaches nothing.
func (c *Controller) SetProvider(p *Provider) { c.provider.Store(p) }

// Ready reports whether the latest preflight passed, nil when it did.
func (c *Controller) Ready() error {
	p := c.provider.Load()
	switch {
	case p == nil:
		return errors.New("the provider hasn't been checked yet")
	case !p.OK():
		return fmt.Errorf("provider %s can't serve homes: %s", p.Name, p.Preflight())
	}
	return nil
}

func (c *Controller) checkedProvider() (*Provider, error) {
	if err := c.Ready(); err != nil {
		return nil, status.Error(codes.Unavailable, err.Error())
	}
	return c.provider.Load(), nil
}

func (c *Controller) ControllerGetCapabilities(context.Context, *csi.ControllerGetCapabilitiesRequest) (*csi.ControllerGetCapabilitiesResponse, error) {
	rpc := func(t csi.ControllerServiceCapability_RPC_Type) *csi.ControllerServiceCapability {
		return &csi.ControllerServiceCapability{Type: &csi.ControllerServiceCapability_Rpc{Rpc: &csi.ControllerServiceCapability_RPC{Type: t}}}
	}
	return &csi.ControllerGetCapabilitiesResponse{Capabilities: []*csi.ControllerServiceCapability{
		rpc(csi.ControllerServiceCapability_RPC_CREATE_DELETE_VOLUME),
		rpc(csi.ControllerServiceCapability_RPC_PUBLISH_UNPUBLISH_VOLUME),
	}}, nil
}

// CreateVolume records the volume; its disk is created on the first attach, once its node is known. A volume of a
// seeded StorageClass claims the seed or is recorded to start from the seed's snapshot. Idempotent on the name: an
// existing volume is returned as it is.
func (c *Controller) CreateVolume(ctx context.Context, req *csi.CreateVolumeRequest) (*csi.CreateVolumeResponse, error) {
	name := req.GetName()
	if !validID(name) {
		return nil, status.Errorf(codes.InvalidArgument, "invalid volume name %q", name)
	}
	if err := validateCapabilities(req.GetVolumeCapabilities()); err != nil {
		return nil, err
	}
	if req.GetVolumeContentSource() != nil {
		return nil, status.Error(codes.Unimplemented, "block homes start from their seed, not a snapshot or volume")
	}
	seed := req.GetParameters()[ParamSeed]
	if seed != "" && !validID(seed) {
		return nil, status.Errorf(codes.InvalidArgument, "parameter %s=%q isn't a valid seed id", ParamSeed, seed)
	}
	capacity := req.GetCapacityRange().GetRequiredBytes()
	if capacity == 0 {
		capacity = req.GetCapacityRange().GetLimitBytes()
	}
	if capacity == 0 {
		capacity = c.DefaultCapacity
	}
	if capacity <= 0 {
		return nil, status.Error(codes.InvalidArgument, "a capacity is required")
	}
	owner, err := parseOwner(req.GetParameters())
	if err != nil {
		return nil, err
	}
	if _, err := c.checkedProvider(); err != nil {
		return nil, err
	}

	if seed != "" {
		defer c.seeds.lock(seed)()
	}
	defer c.volumes.lock(name)()
	rec, err := c.Store.GetVolume(ctx, name)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "reading volume %s: %v", name, err)
	}
	if rec == nil {
		rec = &VolumeRecord{
			Name:          name,
			CapacityBytes: capacity,
			Params:        upstreamParams(req.GetParameters()),
			Seed:          seed,
			Group:         req.GetParameters()[ParamGroup],
		}
		if seed != "" {
			if err := c.seedVolume(ctx, rec); err != nil {
				return nil, err
			}
		}
		if err := c.Store.PutVolume(ctx, rec); err != nil {
			return nil, status.Errorf(codes.Internal, "recording volume %s: %v", name, err)
		}
		c.Log.Info("recorded volume", "volume", name, "seed", seed, "golden", rec.Golden, "snapshot", rec.SnapshotID)
	}
	volumeContext := owner.context()
	volumeContext[contextCapacity] = formatInt(rec.CapacityBytes)
	return &csi.CreateVolumeResponse{Volume: &csi.Volume{
		VolumeId:      name,
		CapacityBytes: rec.CapacityBytes,
		VolumeContext: volumeContext,
	}}, nil
}

// seedVolume makes a new volume its seed's golden volume, or points it at the seed's snapshot once the seed is
// captured. Holds the seed's lock.
func (c *Controller) seedVolume(ctx context.Context, rec *VolumeRecord) error {
	s, err := c.Store.GetSeed(ctx, rec.Seed)
	if err != nil {
		return status.Errorf(codes.Internal, "reading seed %s: %v", rec.Seed, err)
	}
	switch {
	case s.captured():
		rec.SnapshotID = s.SnapshotID
		return nil
	case s != nil && s.Claim != "" && s.Claim != rec.Name:
		return status.Errorf(codes.FailedPrecondition, "seed %s isn't captured from volume %s yet", rec.Seed, s.Claim)
	}
	if err := c.Store.PutSeed(ctx, &SeedRecord{Name: rec.Seed, Claim: rec.Name}); err != nil {
		return status.Errorf(codes.Internal, "claiming seed %s: %v", rec.Seed, err)
	}
	rec.Golden = true
	c.Log.Info("volume claims seed", "volume", rec.Name, "seed", rec.Seed)
	return nil
}

// DeleteVolume deletes the volume's disk and record, first capturing a golden volume's disk as its seed: Substrate
// deletes the golden actor, suspended, right after the golden tag, so the disk is the state the tag's memory
// snapshot saw. Substrate detaches a volume before deleting it, though its disk may still be attached through
// DetachDelay; deleting the disk's anchor and claim detaches it.
func (c *Controller) DeleteVolume(ctx context.Context, req *csi.DeleteVolumeRequest) (*csi.DeleteVolumeResponse, error) {
	name := req.GetVolumeId()
	if !validID(name) {
		return nil, status.Errorf(codes.InvalidArgument, "invalid volume id %q", name)
	}
	rec, err := c.Store.GetVolume(ctx, name)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "reading volume %s: %v", name, err)
	}
	if rec == nil {
		return &csi.DeleteVolumeResponse{}, nil
	}
	if rec.Golden {
		defer c.seeds.lock(rec.Seed)()
	}
	defer c.volumes.lock(name)()
	if rec, err = c.Store.GetVolume(ctx, name); err != nil {
		return nil, status.Errorf(codes.Internal, "reading volume %s: %v", name, err)
	} else if rec == nil {
		return &csi.DeleteVolumeResponse{}, nil
	}
	if rec.Golden {
		if rec.DiskID != "" && rec.Node != "" {
			// Released but still attached; the seed is captured from the disk unmounted.
			if err := c.Disks.Detach(ctx, rec.DiskID, rec.Node); err != nil {
				return nil, err
			}
			rec.Node, rec.DetachAt = "", time.Time{}
			if err := c.Store.PutVolume(ctx, rec); err != nil {
				return nil, status.Errorf(codes.Internal, "recording the detach of volume %s: %v", name, err)
			}
		}
		if err := c.captureSeed(ctx, rec); err != nil {
			return nil, err
		}
	}
	if err := c.abandonMove(ctx, rec); err != nil {
		return nil, err
	}
	if rec.DiskID != "" {
		if err := c.Disks.Delete(ctx, rec.DiskID); err != nil {
			return nil, err
		}
	}
	if left := c.deleteGarbage(ctx, rec.Garbage); len(left) > 0 {
		rec.DiskID, rec.Garbage = "", left
		if err := c.Store.PutVolume(ctx, rec); err != nil {
			return nil, status.Errorf(codes.Internal, "recording the leftovers of volume %s: %v", name, err)
		}
		return nil, status.Errorf(codes.Unavailable, "volume %s left %d disks or snapshots that couldn't be deleted yet", name, len(left))
	}
	if err := c.Store.DeleteVolume(ctx, name); err != nil {
		return nil, status.Errorf(codes.Internal, "deleting the record of volume %s: %v", name, err)
	}
	c.Log.Info("deleted volume", "volume", name, "disk", rec.DiskID)
	return &csi.DeleteVolumeResponse{}, nil
}

// captureSeed snapshots a golden volume's disk as its seed unless that happened already. A golden volume that was
// never attached has no disk, so it gives up its claim and the seed's next volume claims it instead. Holds both
// locks.
func (c *Controller) captureSeed(ctx context.Context, rec *VolumeRecord) error {
	s, err := c.Store.GetSeed(ctx, rec.Seed)
	if err != nil {
		return status.Errorf(codes.Internal, "reading seed %s: %v", rec.Seed, err)
	}
	if s.captured() {
		return nil
	}
	if rec.DiskID == "" {
		c.Log.Info("golden volume was never attached, so its seed isn't captured", "volume", rec.Name, "seed", rec.Seed)
		if s != nil && s.Claim == rec.Name {
			if err := c.Store.DeleteSeed(ctx, rec.Seed); err != nil {
				return status.Errorf(codes.Internal, "releasing seed %s: %v", rec.Seed, err)
			}
		}
		return nil
	}
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), snapshotTimeout)
	defer cancel()
	snapshot := snapshotName(rec.Seed)
	if err := c.snapshot(ctx, snapshot, rec.DiskID); err != nil {
		return err
	}
	if err := c.Store.PutSeed(ctx, &SeedRecord{Name: rec.Seed, Claim: rec.Name, SnapshotID: snapshot}); err != nil {
		return status.Errorf(codes.Internal, "marking seed %s as captured: %v", rec.Seed, err)
	}
	c.Log.Info("captured seed", "seed", rec.Seed, "volume", rec.Name, "snapshot", snapshot)
	return nil
}

// snapshot snapshots disk under name and waits until the snapshot can seed new disks. Snapshots are idempotent on
// the name, so asking again reports the same snapshot's progress.
func (c *Controller) snapshot(ctx context.Context, name, disk string) error {
	interval := c.PollInterval
	if interval <= 0 {
		interval = 5 * time.Second
	}
	for {
		ready, err := c.Disks.Snapshot(ctx, name, disk)
		if err != nil {
			return err
		}
		if ready {
			return nil
		}
		select {
		case <-ctx.Done():
			return status.Errorf(codes.DeadlineExceeded, "snapshot %s of disk %s isn't ready: %v", name, disk, ctx.Err())
		case <-time.After(interval):
		}
	}
}

func snapshotName(seed string) string { return upstreamName("devbox-seed-" + seed) }

func (c *Controller) ValidateVolumeCapabilities(_ context.Context, req *csi.ValidateVolumeCapabilitiesRequest) (*csi.ValidateVolumeCapabilitiesResponse, error) {
	if id := req.GetVolumeId(); !validID(id) {
		return nil, status.Errorf(codes.InvalidArgument, "invalid volume id %q", id)
	}
	if err := validateCapabilities(req.GetVolumeCapabilities()); err != nil {
		return &csi.ValidateVolumeCapabilitiesResponse{Message: err.Error()}, nil
	}
	return &csi.ValidateVolumeCapabilitiesResponse{Confirmed: &csi.ValidateVolumeCapabilitiesResponse_Confirmed{
		VolumeCapabilities: req.GetVolumeCapabilities(),
	}}, nil
}

func mountCapability() *csi.VolumeCapability {
	return &csi.VolumeCapability{
		AccessType: &csi.VolumeCapability_Mount{Mount: &csi.VolumeCapability_MountVolume{FsType: "ext4"}},
		AccessMode: &csi.VolumeCapability_AccessMode{Mode: csi.VolumeCapability_AccessMode_SINGLE_NODE_WRITER},
	}
}

func validateCapabilities(caps []*csi.VolumeCapability) error {
	if len(caps) == 0 {
		return status.Error(codes.InvalidArgument, "volume capabilities are required")
	}
	for _, c := range caps {
		if c.GetMount() == nil {
			return status.Error(codes.InvalidArgument, "only filesystem volumes are supported")
		}
		if fsType := c.GetMount().GetFsType(); fsType != "" && fsType != "ext4" {
			return status.Errorf(codes.InvalidArgument, "filesystem %s isn't supported, only ext4", fsType)
		}
		switch c.GetAccessMode().GetMode() {
		case csi.VolumeCapability_AccessMode_SINGLE_NODE_WRITER,
			csi.VolumeCapability_AccessMode_SINGLE_NODE_SINGLE_WRITER,
			csi.VolumeCapability_AccessMode_SINGLE_NODE_MULTI_WRITER,
			csi.VolumeCapability_AccessMode_SINGLE_NODE_READER_ONLY:
		default:
			return status.Errorf(codes.InvalidArgument, "access mode %s isn't supported", c.GetAccessMode().GetMode())
		}
	}
	return nil
}
