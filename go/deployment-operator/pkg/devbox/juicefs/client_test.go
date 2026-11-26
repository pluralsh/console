package juicefs

import (
	"context"
	"errors"
	"net"
	"os"
	"path/filepath"
	"testing"

	"github.com/container-storage-interface/spec/lib/go/csi"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/test/bufconn"
)

func newClient(t *testing.T, c *Controller) *Client {
	t.Helper()
	lis := bufconn.Listen(1 << 20)
	srv := grpc.NewServer()
	csi.RegisterControllerServer(srv, c)
	go func() { _ = srv.Serve(lis) }()
	t.Cleanup(srv.Stop)
	conn, err := grpc.NewClient("passthrough:///bufnet",
		grpc.WithContextDialer(func(ctx context.Context, _ string) (net.Conn, error) { return lis.DialContext(ctx) }),
		grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = conn.Close() })
	return NewClient(conn)
}

func TestClientSavesAndDeletesSeeds(t *testing.T) {
	c, _ := newController(t)
	client := newClient(t, c)
	ctx := context.Background()

	if _, err := createVolume(t, c, "substrate-box-home", nil); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(c.Root, "homes", "substrate-box-home", "warm"), []byte("cache"), 0o644); err != nil {
		t.Fatal(err)
	}
	for range 2 {
		if err := client.SaveSeed(ctx, "snap-1", "substrate-box-home"); err != nil {
			t.Fatal(err)
		}
	}
	if got, err := os.ReadFile(filepath.Join(c.Root, "seeds", "snap-1", "data", "warm")); err != nil || string(got) != "cache" {
		t.Fatalf("the seed is missing the home's files: %q, %v", got, err)
	}
	if err := client.DeleteSeed(ctx, "snap-1"); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(c.Root, "seeds", "snap-1")); !errors.Is(err, os.ErrNotExist) {
		t.Errorf("the seed is still there: %v", err)
	}
}

func TestClientClaimsAndSeedsGoldenHomes(t *testing.T) {
	c, _ := newController(t)
	client := newClient(t, c)
	ctx := context.Background()

	if _, err := createVolume(t, c, "substrate-golden-home", nil); err != nil {
		t.Fatal(err)
	}
	if _, err := createVolume(t, c, "substrate-other-home", nil); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(c.Root, "homes", "substrate-golden-home", "warm"), []byte("cache"), 0o644); err != nil {
		t.Fatal(err)
	}
	for range 2 {
		if err := client.ClaimSeed(ctx, "substrate-golden-home", "golden.t1"); err != nil {
			t.Fatal(err)
		}
	}
	wantCode(t, client.ClaimSeed(ctx, "substrate-other-home", "golden.t1"), codes.AlreadyExists)
	wantCode(t, client.SeedVolume(ctx, "substrate-box-home", "golden.t1", 1<<30), codes.FailedPrecondition)
	if _, err := c.DeleteVolume(ctx, &csi.DeleteVolumeRequest{VolumeId: "substrate-golden-home"}); err != nil {
		t.Fatal(err)
	}
	if err := client.SeedVolume(ctx, "substrate-box-home", "golden.t1", 1<<30); err != nil {
		t.Fatal(err)
	}
	if got, err := os.ReadFile(filepath.Join(c.Root, "homes", "substrate-box-home", "warm")); err != nil || string(got) != "cache" {
		t.Fatalf("the seeded home is missing the golden home's files: %q, %v", got, err)
	}
	if err := client.DeleteVolume(ctx, "substrate-box-home"); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(c.Root, "homes", "substrate-box-home")); !errors.Is(err, os.ErrNotExist) {
		t.Errorf("the seeded home is still there: %v", err)
	}
}
