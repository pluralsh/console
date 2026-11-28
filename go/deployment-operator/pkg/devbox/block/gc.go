package block

import (
	"context"
	"fmt"
	"strconv"
	"time"

	storagev1 "k8s.io/api/storage/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// LiveSeeds reports the seeds some StorageClass still names.
type LiveSeeds func(ctx context.Context) (map[string]bool, error)

// KubeLiveSeeds reads the seed parameter of this driver's StorageClasses. The operator deletes a revision's class
// when it collects the revision.
func KubeLiveSeeds(c client.Reader) LiveSeeds {
	return func(ctx context.Context) (map[string]bool, error) {
		var list storagev1.StorageClassList
		if err := c.List(ctx, &list); err != nil {
			return nil, fmt.Errorf("listing StorageClasses: %w", err)
		}
		live := map[string]bool{}
		for _, sc := range list.Items {
			if seed := sc.Parameters[ParamSeed]; sc.Provisioner == DriverName && seed != "" {
				live[seed] = true
			}
		}
		return live, nil
	}
}

// KubeGroupSize reads the size parameter of this driver's StorageClasses in a group.
func KubeGroupSize(c client.Reader) GroupSize {
	return func(ctx context.Context, group string) (int64, error) {
		var list storagev1.StorageClassList
		if err := c.List(ctx, &list); err != nil {
			return 0, fmt.Errorf("listing StorageClasses: %w", err)
		}
		var size int64
		for _, sc := range list.Items {
			if sc.Provisioner != DriverName || sc.Parameters[ParamGroup] != group {
				continue
			}
			v, err := strconv.ParseInt(sc.Parameters[ParamSize], 10, 64)
			if err != nil {
				continue
			}
			size = max(size, v)
		}
		return size, nil
	}
}

// CollectSeeds deletes the snapshots and records of seeds no StorageClass names any more, unless a volume still
// waits to be created from one.
func (c *Controller) CollectSeeds(ctx context.Context, liveSeeds LiveSeeds) error {
	live, err := liveSeeds(ctx)
	if err != nil {
		return err
	}
	seeds, err := c.Store.ListSeeds(ctx)
	if err != nil {
		return fmt.Errorf("listing seeds: %w", err)
	}
	volumes, err := c.Store.ListVolumes(ctx)
	if err != nil {
		return fmt.Errorf("listing volumes: %w", err)
	}
	pending := map[string]bool{}
	for _, v := range volumes {
		if v.DiskID == "" {
			pending[v.Seed] = true
		}
	}
	for _, s := range seeds {
		if live[s.Name] || pending[s.Name] {
			continue
		}
		if err := c.collectSeed(ctx, s.Name); err != nil {
			return err
		}
	}
	return nil
}

func (c *Controller) collectSeed(ctx context.Context, name string) error {
	defer c.seeds.lock(name)()
	s, err := c.Store.GetSeed(ctx, name)
	if err != nil || s == nil {
		return err
	}
	if s.SnapshotID != "" {
		if err := c.Disks.DeleteSnapshot(ctx, s.SnapshotID); err != nil {
			return fmt.Errorf("deleting the snapshot of seed %s: %w", name, err)
		}
	}
	if err := c.Store.DeleteSeed(ctx, name); err != nil {
		return fmt.Errorf("deleting seed %s: %w", name, err)
	}
	c.Log.Info("collected seed", "seed", name, "snapshot", s.SnapshotID)
	return nil
}

// RunCollection collects seeds, and what moves left behind, every interval until ctx ends.
func (c *Controller) RunCollection(ctx context.Context, liveSeeds LiveSeeds, interval time.Duration) error {
	t := time.NewTicker(interval)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-t.C:
			if err := c.CollectSeeds(ctx, liveSeeds); err != nil {
				c.Log.Error(err, "collecting seeds")
			}
			if err := c.CollectGarbage(ctx); err != nil {
				c.Log.Error(err, "collecting leftover disks and snapshots")
			}
		}
	}
}
