package juicefs

import (
	"context"
	"crypto/tls"
	"fmt"

	"github.com/container-storage-interface/spec/lib/go/csi"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
)

// Client is how the gateway seeds homes: it claims a golden actor's home as its revision's seed, seeds a new
// instance's home from it, and saves the homes of snapshotted instances. It speaks the standard CSI controller
// calls, so the seeds are ordinary CSI snapshots and the driver needs no gateway-specific API besides the seed
// parameter.
type Client struct {
	conn       *grpc.ClientConn
	controller csi.ControllerClient
}

func Dial(address string, tlsConfig *tls.Config) (*Client, error) {
	conn, err := grpc.NewClient(address, grpc.WithTransportCredentials(credentials.NewTLS(tlsConfig)))
	if err != nil {
		return nil, fmt.Errorf("dialing the juicefs controller: %w", err)
	}
	return &Client{conn: conn, controller: csi.NewControllerClient(conn)}, nil
}

// NewClient wraps an existing connection, for tests.
func NewClient(conn grpc.ClientConnInterface) *Client {
	return &Client{controller: csi.NewControllerClient(conn)}
}

func (c *Client) Close() error {
	if c.conn == nil {
		return nil
	}
	return c.conn.Close()
}

// SaveSeed clones a suspended actor's home into the seed seedID. Taking a seed that exists again is a no-op.
func (c *Client) SaveSeed(ctx context.Context, seedID, volumeID string) error {
	_, err := c.controller.CreateSnapshot(ctx, &csi.CreateSnapshotRequest{Name: seedID, SourceVolumeId: volumeID})
	return err
}

func (c *Client) DeleteSeed(ctx context.Context, seedID string) error {
	_, err := c.controller.DeleteSnapshot(ctx, &csi.DeleteSnapshotRequest{SnapshotId: seedID})
	return err
}

// ClaimSeed makes an existing volume, a golden actor's home, the source of seedID: the driver captures the volume
// into the seed when Substrate deletes it. A missing volume is NotFound, and a seed or volume taken by another
// claim is AlreadyExists. Claiming again is a no-op.
func (c *Client) ClaimSeed(ctx context.Context, volumeID, seedID string) error {
	_, err := c.controller.CreateVolume(ctx, &csi.CreateVolumeRequest{
		Name:               volumeID,
		VolumeCapabilities: volumeCapabilities(),
		Parameters:         map[string]string{ParamClaimSeed: seedID},
	})
	return err
}

// SeedVolume creates a volume as a clone of seedID, before Substrate creates it on the actor's first resume and
// finds it there. A seed that is claimed but not captured yet is FailedPrecondition, and one that was never
// claimed NotFound. The clone keeps the seed's owner and mode, so it needs none of the StorageClass's parameters.
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
