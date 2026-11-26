package homes

import (
	"context"
	"errors"
	"strings"
	"testing"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/probe"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
)

// volumes records the volumes a driver seeded and deleted, and fails the next seedings with errs.
type volumes struct {
	Driver
	errs    []error
	seeded  map[string]string
	deleted []string
}

func (v *volumes) SeedVolume(_ context.Context, volumeID, seedID string, _ int64) error {
	if len(v.errs) > 0 {
		err := v.errs[0]
		v.errs = v.errs[1:]
		return err
	}
	v.seeded[volumeID] = seedID
	return nil
}

func (v *volumes) DeleteVolume(_ context.Context, volumeID string) error {
	v.deleted = append(v.deleted, volumeID)
	return nil
}

func actorWithHome(uid, home string) *ateapi.Actor {
	a := &ateapi.Actor{Metadata: &ateapi.ResourceMetadata{Name: "dbx-1", Uid: uid}}
	if home != "" {
		a.Status = &ateapi.ActorStatus{ExternalVolumes: &ateapi.ExternalVolumes{Volumes: []*ateapi.ExternalVolumeStatus{{Name: Volume, StorageVolumeId: home}}}}
	}
	return a
}

func TestSeedNamesTheVolumeSubstrateCreates(t *testing.T) {
	// Substrate v1.0's actorVolumeID; a Substrate that names volumes otherwise fails Verify.
	if got := VolumeID("3f2a"); got != "substrate-3f2a-home" {
		t.Fatalf("VolumeID = %s", got)
	}
	v := &volumes{seeded: map[string]string{}}
	if err := Seed(context.Background(), v, actorWithHome("3f2a", ""), "golden.t", 1<<30); err != nil {
		t.Fatal(err)
	}
	if v.seeded["substrate-3f2a-home"] != "golden.t" {
		t.Fatalf("seeded = %v", v.seeded)
	}

	v.errs = []error{status.Error(codes.NotFound, "the source of volume substrate-3f2a-home doesn't exist")}
	err := Seed(context.Background(), v, actorWithHome("3f2a", ""), "golden.t", 1<<30)
	if !errors.Is(err, ErrSeedMissing) || !strings.Contains(err.Error(), probe.ErrHomeSeedMissing) {
		t.Fatalf("seeding from a missing seed: %v, want ErrSeedMissing", err)
	}
}

// Substrate deletes the golden actor, which captures its home, just after the golden tag.
func TestSeedWaitsForTheSeedToBeCaptured(t *testing.T) {
	v := &volumes{seeded: map[string]string{}, errs: []error{status.Error(codes.FailedPrecondition, "seed golden.t isn't captured yet")}}
	if err := Seed(context.Background(), v, actorWithHome("3f2a", ""), "golden.t", 1<<30); err != nil {
		t.Fatal(err)
	}
	if v.seeded["substrate-3f2a-home"] != "golden.t" {
		t.Fatalf("seeded = %v", v.seeded)
	}

	v.errs = []error{status.Error(codes.Unavailable, "connection refused")}
	if err := Seed(context.Background(), v, actorWithHome("4b1c", ""), "golden.t", 1<<30); err == nil || errors.Is(err, ErrSeedMissing) {
		t.Fatalf("an unreachable driver: %v, want a retryable error", err)
	}
}

func TestReleaseDeletesOnlyAHomeSubstrateDidNotTake(t *testing.T) {
	v := &volumes{}
	if err := Release(context.Background(), v, actorWithHome("3f2a", "substrate-3f2a-home")); err != nil {
		t.Fatal(err)
	}
	if err := Release(context.Background(), v, actorWithHome("4b1c", "")); err != nil {
		t.Fatal(err)
	}
	if len(v.deleted) != 1 || v.deleted[0] != "substrate-4b1c-home" {
		t.Fatalf("deleted = %v, want only the home Substrate never recorded", v.deleted)
	}
}

func TestVerifyDeletesAHomeSubstrateDidNotTake(t *testing.T) {
	v := &volumes{}
	if err := Verify(context.Background(), v, actorWithHome("3f2a", "substrate-3f2a-home")); err != nil {
		t.Fatal(err)
	}
	err := Verify(context.Background(), v, actorWithHome("3f2a", "other-3f2a-home"))
	if !errors.Is(err, ErrVolumeNaming) {
		t.Fatalf("Verify = %v, want ErrVolumeNaming", err)
	}
	if len(v.deleted) != 1 || v.deleted[0] != "substrate-3f2a-home" {
		t.Fatalf("deleted = %v, want the seeded volume", v.deleted)
	}
}
