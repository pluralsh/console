// Package homedriver is the client of the devbox home drivers' CSI controllers (pkg/devbox/juicefs and
// pkg/devbox/zerofs) that the gateway seeds homes through.
package homedriver

import (
	"context"

	"github.com/container-storage-interface/spec/lib/go/csi"
	"google.golang.org/grpc"
)

// claimSeedParam is the home drivers' CreateVolume parameter that claims a seed for an existing volume
// (juicefs.ParamClaimSeed, zerofs.ParamClaimSeed).
const claimSeedParam = "claimSeed"

// Client is a home driver's CSI controller. It speaks only the standard CSI calls, with seeds as CSI snapshots,
// besides the claimSeed parameter.
type Client struct {
	controller csi.ControllerClient
}

func NewClient(conn grpc.ClientConnInterface) *Client {
	return &Client{controller: csi.NewControllerClient(conn)}
}

// ClaimSeed makes an existing volume, a golden actor's home, the source of seedID: the driver captures the volume
// into the seed when Substrate deletes it. A seed or volume taken by another claim is AlreadyExists, and claiming
// again is a no-op. The JuiceFS driver answers NotFound for a missing volume; the ZeroFS driver can't tell one,
// so the volume must be one Substrate created.
func (c *Client) ClaimSeed(ctx context.Context, volumeID, seedID string) error {
	_, err := c.controller.CreateVolume(ctx, &csi.CreateVolumeRequest{
		Name:               volumeID,
		VolumeCapabilities: volumeCapabilities(),
		Parameters:         map[string]string{claimSeedParam: seedID},
	})
	return err
}

// SeedVolume creates a volume as a copy of seedID, before Substrate creates it on the actor's first resume and
// finds it there. A seed that is claimed but not captured yet is FailedPrecondition, and one that was never
// claimed NotFound. The copy keeps the seed's owner and mode, so it needs none of the StorageClass's parameters.
func (c *Client) SeedVolume(ctx context.Context, volumeID, seedID string, capacityBytes int64) error {
	_, err := c.controller.CreateVolume(ctx, &csi.CreateVolumeRequest{
		Name:               volumeID,
		CapacityRange:      &csi.CapacityRange{RequiredBytes: capacityBytes},
		VolumeCapabilities: volumeCapabilities(),
		VolumeContentSource: &csi.VolumeContentSource{Type: &csi.VolumeContentSource_Snapshot{
			Snapshot: &csi.VolumeContentSource_SnapshotSource{SnapshotId: seedID},
		}},
	})
	return err
}

// SaveSeed clones a suspended actor's home into the seed seedID (the JuiceFS driver's CSI snapshot). Taking a seed
// that exists again is a no-op.
func (c *Client) SaveSeed(ctx context.Context, seedID, volumeID string) error {
	_, err := c.controller.CreateSnapshot(ctx, &csi.CreateSnapshotRequest{Name: seedID, SourceVolumeId: volumeID})
	return err
}

func (c *Client) DeleteSeed(ctx context.Context, seedID string) error {
	_, err := c.controller.DeleteSnapshot(ctx, &csi.DeleteSnapshotRequest{SnapshotId: seedID})
	return err
}

// DeleteVolume removes a volume SeedVolume created that Substrate didn't take.
func (c *Client) DeleteVolume(ctx context.Context, volumeID string) error {
	_, err := c.controller.DeleteVolume(ctx, &csi.DeleteVolumeRequest{VolumeId: volumeID})
	return err
}

// volumeCapabilities are what Substrate asks for: one filesystem, written from one node.
func volumeCapabilities() []*csi.VolumeCapability {
	return []*csi.VolumeCapability{{
		AccessType: &csi.VolumeCapability_Mount{Mount: &csi.VolumeCapability_MountVolume{}},
		AccessMode: &csi.VolumeCapability_AccessMode{Mode: csi.VolumeCapability_AccessMode_SINGLE_NODE_WRITER},
	}}
}
