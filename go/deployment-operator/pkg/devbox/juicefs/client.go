package juicefs

import (
	"context"
	"crypto/tls"
	"fmt"

	"github.com/container-storage-interface/spec/lib/go/csi"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
)

// Client is how the gateway saves the homes of snapshotted instances. It speaks the standard CSI controller calls,
// so the seeds are ordinary CSI snapshots and the driver needs no gateway-specific API.
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
