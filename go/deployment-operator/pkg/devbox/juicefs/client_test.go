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
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/test/bufconn"
)

func TestClientSavesAndDeletesSeeds(t *testing.T) {
	c, _ := newController(t)
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
	client := NewClient(conn)
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
