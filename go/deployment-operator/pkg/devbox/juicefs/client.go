package juicefs

import (
	"context"

	"github.com/container-storage-interface/spec/lib/go/csi"
	"google.golang.org/grpc"
)

// Client is how the gateway saves the homes of snapshotted instances. It speaks the standard CSI controller calls,
// so the seeds are ordinary CSI snapshots and the driver needs no gateway-specific API.
type Client struct {
	controller csi.ControllerClient
}

func NewClient(conn grpc.ClientConnInterface) *Client {
	return &Client{controller: csi.NewControllerClient(conn)}
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
