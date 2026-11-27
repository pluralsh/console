package block

import (
	"context"
	"testing"

	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func TestKubeStoreRoundTrips(t *testing.T) {
	ctx := context.Background()
	s := &KubeStore{Client: fake.NewClientBuilder().Build(), Namespace: "ate-system"}

	if rec, err := s.GetVolume(ctx, "substrate-a-home"); rec != nil || err != nil {
		t.Fatalf("a missing record should be nil, nil, got %v, %v", rec, err)
	}
	want := &VolumeRecord{
		Name: "substrate-a-home", CapacityBytes: 1 << 30, Params: map[string]string{"type": "gp3"}, Seed: "ns.t", DiskID: "devbox-1",
		Move: &Move{Snapshot: "devbox-move"}, Garbage: []Garbage{{Disk: "devbox-0"}},
	}
	if err := s.PutVolume(ctx, want); err != nil {
		t.Fatal(err)
	}
	want.Node = "node-a"
	if err := s.PutVolume(ctx, want); err != nil {
		t.Fatal(err)
	}
	got, err := s.GetVolume(ctx, "substrate-a-home")
	if err != nil || got.Node != "node-a" || got.Params["type"] != "gp3" || got.Move.Snapshot != "devbox-move" || got.Garbage[0].Disk != "devbox-0" {
		t.Fatalf("got %+v, %v", got, err)
	}
	if err := s.PutSeed(ctx, &SeedRecord{Name: "ns.t", Claim: "substrate-a-home"}); err != nil {
		t.Fatal(err)
	}
	vols, _ := s.ListVolumes(ctx)
	seeds, _ := s.ListSeeds(ctx)
	if len(vols) != 1 || len(seeds) != 1 {
		t.Fatalf("lists should keep volumes and seeds apart, got %d volumes and %d seeds", len(vols), len(seeds))
	}
	if err := s.DeleteVolume(ctx, "substrate-a-home"); err != nil {
		t.Fatal(err)
	}
	if err := s.DeleteVolume(ctx, "substrate-a-home"); err != nil {
		t.Fatal("deleting twice should succeed")
	}
}
