package block

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"time"

	"github.com/container-storage-interface/spec/lib/go/csi"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// ControllerPublishVolume makes the volume's disk available on the node: its first attach creates the disk where
// the node can reach it, a later attach to a node it can't reach moves it there first, and each attach grows it to
// its group's size. The publish context tells the node plugin where on the node the disk is mounted.
func (c *Controller) ControllerPublishVolume(ctx context.Context, req *csi.ControllerPublishVolumeRequest) (*csi.ControllerPublishVolumeResponse, error) {
	name, node := req.GetVolumeId(), req.GetNodeId()
	if !validID(name) {
		return nil, status.Errorf(codes.InvalidArgument, "invalid volume id %q", name)
	}
	if node == "" {
		return nil, status.Error(codes.InvalidArgument, "a node id is required")
	}
	if err := validateCapabilities([]*csi.VolumeCapability{req.GetVolumeCapability()}); err != nil {
		return nil, err
	}
	if _, err := c.checkedProvider(); err != nil {
		return nil, err
	}

	defer c.volumes.lock(name)()
	rec, err := c.Store.GetVolume(ctx, name)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "reading volume %s: %v", name, err)
	}
	if rec == nil {
		return nil, status.Errorf(codes.NotFound, "volume %s doesn't exist", name)
	}

	if rec.DiskID != "" && rec.Node != "" && rec.Node != node {
		// Still on the last node: released there, or Substrate lost that node without detaching. It detaches first,
		// so a move snapshots it unmounted.
		if err := c.Disks.Detach(ctx, rec.DiskID, rec.Node); err != nil {
			return nil, err
		}
		rec.Node, rec.DetachAt = "", time.Time{}
		if err := c.Store.PutVolume(ctx, rec); err != nil {
			return nil, status.Errorf(codes.Internal, "recording the detach of volume %s: %v", name, err)
		}
	}

	if rec.DiskID == "" {
		if err := c.createDisk(ctx, rec, node); err != nil {
			return nil, err
		}
	} else {
		reachable, err := c.Disks.Reachable(ctx, rec.DiskID, node)
		if err != nil {
			return nil, err
		}
		if !reachable {
			if err := c.move(ctx, rec, node); err != nil {
				return nil, err
			}
		}
		c.grow(ctx, rec)
	}

	if rec.Node != node {
		c.makeRoom(ctx, name, node)
	}
	source, err := c.Disks.Attach(ctx, rec.DiskID, node)
	if err != nil {
		return nil, err
	}
	if rec.Node != node || !rec.DetachAt.IsZero() {
		rec.Node, rec.DetachAt = node, time.Time{}
		if err := c.Store.PutVolume(ctx, rec); err != nil {
			return nil, status.Errorf(codes.Internal, "recording the attachment of volume %s: %v", name, err)
		}
	}
	c.Log.Info("attached volume", "volume", name, "disk", rec.DiskID, "node", node)
	return &csi.ControllerPublishVolumeResponse{PublishContext: map[string]string{PublishContextSource: source}}, nil
}

// ControllerUnpublishVolume releases the volume's disk from the node Substrate names or else the one it was last
// attached to. With a DetachDelay the disk stays attached there until DetachReleased detaches it, or a publish
// takes it back or moves it; otherwise it's unmounted and detached now. The node plugin synced the filesystem when
// it unstaged the volume, so a disk left attached holds everything the box wrote.
func (c *Controller) ControllerUnpublishVolume(ctx context.Context, req *csi.ControllerUnpublishVolumeRequest) (*csi.ControllerUnpublishVolumeResponse, error) {
	name, node := req.GetVolumeId(), req.GetNodeId()
	if !validID(name) {
		return nil, status.Errorf(codes.InvalidArgument, "invalid volume id %q", name)
	}
	defer c.volumes.lock(name)()
	rec, err := c.Store.GetVolume(ctx, name)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "reading volume %s: %v", name, err)
	}
	if rec == nil || rec.DiskID == "" {
		return &csi.ControllerUnpublishVolumeResponse{}, nil
	}
	if node == "" {
		node = rec.Node
	}
	if c.DetachDelay > 0 && node != "" && node == rec.Node {
		if rec.DetachAt.IsZero() {
			rec.DetachAt = time.Now().Add(c.DetachDelay)
			if err := c.Store.PutVolume(ctx, rec); err != nil {
				return nil, status.Errorf(codes.Internal, "recording the release of volume %s: %v", name, err)
			}
		}
		c.Log.Info("released volume", "volume", name, "disk", rec.DiskID, "node", node, "detachAt", rec.DetachAt)
		return &csi.ControllerUnpublishVolumeResponse{}, nil
	}
	if err := c.Disks.Detach(ctx, rec.DiskID, node); err != nil {
		return nil, err
	}
	if rec.Node == node || node == "" {
		rec.Node, rec.DetachAt = "", time.Time{}
		if err := c.Store.PutVolume(ctx, rec); err != nil {
			return nil, status.Errorf(codes.Internal, "recording volume %s: %v", name, err)
		}
	}
	c.Log.Info("detached volume", "volume", name, "disk", rec.DiskID, "node", node)
	return &csi.ControllerUnpublishVolumeResponse{}, nil
}

// DetachReleased detaches the disks released longer ago than DetachDelay.
func (c *Controller) DetachReleased(ctx context.Context, now time.Time) error {
	volumes, err := c.Store.ListVolumes(ctx)
	if err != nil {
		return fmt.Errorf("listing volumes: %w", err)
	}
	var errs []error
	for _, v := range volumes {
		if !v.DetachAt.IsZero() && !now.Before(v.DetachAt) {
			errs = append(errs, c.detachReleased(ctx, v.Name, now))
		}
	}
	return errors.Join(errs...)
}

func (c *Controller) detachReleased(ctx context.Context, name string, now time.Time) error {
	defer c.volumes.lock(name)()
	return c.detachReleasedLocked(ctx, name, now)
}

// makeRoom detaches disks released on node, longest released first, while it has no attach slot left for
// another: Substrate places boxes without counting disks, and released ones add to a node's running boxes'. It
// skips volumes another call holds, so two attaches never wait on each other, and only logs failures, since the
// attach reports whether there was room. Holds the attaching volume's lock.
func (c *Controller) makeRoom(ctx context.Context, attaching, node string) {
	free, err := c.Disks.Free(ctx, node)
	if err != nil {
		c.Log.Error(err, "counting the node's free attach slots", "node", node)
		return
	}
	if free != 0 {
		return
	}
	volumes, err := c.Store.ListVolumes(ctx)
	if err != nil {
		c.Log.Error(err, "listing volumes released on the node", "node", node)
		return
	}
	var released []*VolumeRecord
	for _, v := range volumes {
		if v.Name != attaching && v.Node == node && !v.DetachAt.IsZero() {
			released = append(released, v)
		}
	}
	slices.SortFunc(released, func(a, b *VolumeRecord) int { return a.DetachAt.Compare(b.DetachAt) })
	for _, v := range released {
		unlock, ok := c.volumes.tryLock(v.Name)
		if !ok {
			continue
		}
		err := c.detachReleasedLocked(ctx, v.Name, time.Time{})
		unlock()
		if err != nil {
			c.Log.Error(err, "detaching a released disk to make room", "volume", v.Name, "node", node)
			continue
		}
		return
	}
}

// detachReleasedLocked detaches the volume's released disk if it was due by now; a zero now detaches it regardless.
// Holds the volume's lock.
func (c *Controller) detachReleasedLocked(ctx context.Context, name string, now time.Time) error {
	rec, err := c.Store.GetVolume(ctx, name)
	if err != nil || rec == nil || rec.DetachAt.IsZero() || (!now.IsZero() && now.Before(rec.DetachAt)) {
		return err
	}
	if rec.DiskID != "" && rec.Node != "" {
		if err := c.Disks.Detach(ctx, rec.DiskID, rec.Node); err != nil {
			return fmt.Errorf("detaching volume %s from node %s: %w", name, rec.Node, err)
		}
	}
	node := rec.Node
	rec.Node, rec.DetachAt = "", time.Time{}
	if err := c.Store.PutVolume(ctx, rec); err != nil {
		return fmt.Errorf("recording the detach of volume %s: %w", name, err)
	}
	c.Log.Info("detached volume", "volume", name, "disk", rec.DiskID, "node", node, "released", true)
	return nil
}

// RunDetaches detaches released disks every interval until ctx ends.
func (c *Controller) RunDetaches(ctx context.Context, interval time.Duration) error {
	t := time.NewTicker(interval)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-t.C:
			if err := c.DetachReleased(ctx, time.Now()); err != nil {
				c.Log.Error(err, "detaching released disks")
			}
		}
	}
}

// diskName is the name of a volume's disk of a generation.
func diskName(volume string, generation int) string {
	if generation == 0 {
		return upstreamName(volume)
	}
	return upstreamName(fmt.Sprintf("%s-m%d", volume, generation))
}

// createDisk creates the volume's disk where node can reach it, at its group's size, which may have grown since
// the volume was recorded, and from its seed's snapshot when it has one. The disk's name only depends on the
// volume, so a disk still being provisioned when the call gives up is found again. Holds the volume's lock.
func (c *Controller) createDisk(ctx context.Context, rec *VolumeRecord, node string) error {
	if want, err := c.groupSize(ctx, rec); err != nil {
		c.Log.Error(err, "reading the size of the volume's group", "volume", rec.Name, "group", rec.Group)
	} else {
		rec.CapacityBytes = max(rec.CapacityBytes, want)
	}
	disk := diskName(rec.Name, rec.Generation)
	size, err := c.Disks.Create(ctx, disk, DiskSpec{CapacityBytes: rec.CapacityBytes, Params: rec.Params, Node: node, Snapshot: rec.SnapshotID})
	if err != nil {
		return err
	}
	rec.DiskID, rec.CapacityBytes = disk, max(rec.CapacityBytes, size)
	if err := c.Store.PutVolume(ctx, rec); err != nil {
		return status.Errorf(codes.Internal, "recording the disk of volume %s: %v", rec.Name, err)
	}
	c.Log.Info("created disk", "volume", rec.Name, "disk", disk, "node", node, "snapshot", rec.SnapshotID, "size", rec.CapacityBytes)
	return nil
}

// grow grows the volume's disk to its group's size. A disk that can't grow yet still attaches at its size, so a
// failure only logs. Holds the volume's lock.
func (c *Controller) grow(ctx context.Context, rec *VolumeRecord) {
	want, err := c.groupSize(ctx, rec)
	if err != nil {
		c.Log.Error(err, "reading the size of the volume's group", "volume", rec.Name, "group", rec.Group)
		return
	}
	if want <= rec.CapacityBytes {
		return
	}
	if err := c.Disks.Expand(ctx, rec.DiskID, want); err != nil {
		c.Log.Error(err, "growing disk", "volume", rec.Name, "disk", rec.DiskID, "from", rec.CapacityBytes, "to", want)
		return
	}
	rec.CapacityBytes = want
	if err := c.Store.PutVolume(ctx, rec); err != nil {
		c.Log.Error(err, "recording a grown disk", "volume", rec.Name, "disk", rec.DiskID)
		return
	}
	c.Log.Info("grew disk", "volume", rec.Name, "disk", rec.DiskID, "size", want)
}

func (c *Controller) groupSize(ctx context.Context, rec *VolumeRecord) (int64, error) {
	if rec.Group == "" || c.GroupSize == nil {
		return 0, nil
	}
	return c.GroupSize(ctx, rec.Group)
}

// move recreates the volume's disk where node can reach it, from a snapshot of the disk, and leaves the old disk
// and the snapshot as garbage. The snapshot can take longer than an attach should wait, so an attach that gives
// up returns Unavailable and the next one picks the move up where it stopped: each step is recorded, and disks
// and snapshots are idempotent on their names. Holds the volume's lock.
func (c *Controller) move(ctx context.Context, rec *VolumeRecord, node string) error {
	if rec.Move == nil {
		rec.Move = &Move{Snapshot: upstreamName(fmt.Sprintf("devbox-move-%s-%d", rec.Name, rec.Generation+1))}
		if err := c.Store.PutVolume(ctx, rec); err != nil {
			return status.Errorf(codes.Internal, "recording the move of volume %s: %v", rec.Name, err)
		}
		c.Log.Info("moving disk", "volume", rec.Name, "disk", rec.DiskID, "to", node)
	}
	if !rec.Move.Ready {
		wait := c.MoveWait
		if wait <= 0 {
			wait = DefaultMoveWait
		}
		sctx, cancel := context.WithTimeout(ctx, wait)
		err := c.snapshot(sctx, rec.Move.Snapshot, rec.DiskID)
		cancel()
		if status.Code(err) == codes.DeadlineExceeded && ctx.Err() == nil {
			return status.Errorf(codes.Unavailable, "volume %s is moving to node %s; its snapshot isn't ready yet", rec.Name, node)
		}
		if err != nil {
			return err
		}
		rec.Move.Ready = true
		if err := c.Store.PutVolume(ctx, rec); err != nil {
			return status.Errorf(codes.Internal, "recording the move of volume %s: %v", rec.Name, err)
		}
	}
	generation := rec.Generation + 1
	disk := diskName(rec.Name, generation)
	size, err := c.Disks.Create(ctx, disk, DiskSpec{CapacityBytes: rec.CapacityBytes, Params: rec.Params, Node: node, Snapshot: rec.Move.Snapshot})
	if err != nil {
		return err
	}
	old := rec.DiskID
	rec.Garbage = append(rec.Garbage, Garbage{Disk: old}, Garbage{Snapshot: rec.Move.Snapshot})
	rec.DiskID, rec.CapacityBytes, rec.Generation, rec.Node, rec.Move = disk, max(rec.CapacityBytes, size), generation, "", nil
	rec.Garbage = c.deleteGarbage(ctx, rec.Garbage)
	if err := c.Store.PutVolume(ctx, rec); err != nil {
		return status.Errorf(codes.Internal, "recording the moved disk of volume %s: %v", rec.Name, err)
	}
	c.Log.Info("moved disk", "volume", rec.Name, "from", old, "disk", disk, "node", node)
	return nil
}

// abandonMove turns a move in progress into garbage. Holds the volume's lock.
func (c *Controller) abandonMove(_ context.Context, rec *VolumeRecord) error {
	if rec.Move == nil {
		return nil
	}
	rec.Garbage = append(rec.Garbage, Garbage{Snapshot: rec.Move.Snapshot})
	rec.Move = nil
	return nil
}

// deleteGarbage deletes what it can of garbage and returns the rest. Deleting a disk detaches it first from
// wherever a move left it attached.
func (c *Controller) deleteGarbage(ctx context.Context, garbage []Garbage) []Garbage {
	var left []Garbage
	for _, g := range garbage {
		var err error
		switch {
		case g.Disk != "":
			err = c.Disks.Delete(ctx, g.Disk)
		case g.Snapshot != "":
			err = c.Disks.DeleteSnapshot(ctx, g.Snapshot)
		}
		if err != nil {
			c.Log.Error(err, "deleting leftovers", "disk", g.Disk, "snapshot", g.Snapshot)
			left = append(left, g)
		}
	}
	return left
}

// CollectGarbage deletes what moves left behind and couldn't delete at the time.
func (c *Controller) CollectGarbage(ctx context.Context) error {
	volumes, err := c.Store.ListVolumes(ctx)
	if err != nil {
		return fmt.Errorf("listing volumes: %w", err)
	}
	var errs []error
	for _, v := range volumes {
		if len(v.Garbage) == 0 {
			continue
		}
		errs = append(errs, c.collectVolumeGarbage(ctx, v.Name))
	}
	return errors.Join(errs...)
}

func (c *Controller) collectVolumeGarbage(ctx context.Context, name string) error {
	defer c.volumes.lock(name)()
	rec, err := c.Store.GetVolume(ctx, name)
	if err != nil || rec == nil || len(rec.Garbage) == 0 {
		return err
	}
	left := c.deleteGarbage(ctx, rec.Garbage)
	if len(left) == len(rec.Garbage) {
		return nil
	}
	rec.Garbage = left
	return c.Store.PutVolume(ctx, rec)
}
