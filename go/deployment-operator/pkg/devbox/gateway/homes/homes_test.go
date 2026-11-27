package homes

import (
	"context"
	"errors"
	"testing"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/actors"
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

// actorHome is an ActorReader whose actor has home as its home volume after start.
type actorHome string

func (h actorHome) GetActor(_ context.Context, ref actors.Ref) (*ateapi.Actor, error) {
	a := &ateapi.Actor{Metadata: &ateapi.ResourceMetadata{Atespace: ref.Atespace, Name: ref.Name, Uid: "3f2a"}}
	if h != "" {
		a.Status = &ateapi.ActorStatus{ExternalVolumes: &ateapi.ExternalVolumes{Volumes: []*ateapi.ExternalVolumeStatus{{Name: Volume, StorageVolumeId: string(h)}}}}
	}
	return a, nil
}

var actor = &ateapi.Actor{Metadata: &ateapi.ResourceMetadata{Atespace: "ns", Name: "dbx-1", Uid: "3f2a"}}

func TestStart(t *testing.T) {
	ctx := context.Background()
	failed := errors.New("resume failed")
	for name, tc := range map[string]struct {
		errs    []error
		home    actorHome
		start   error
		want    error
		seeded  bool
		deleted bool
	}{
		// Substrate v1.0's actorVolumeID; a Substrate that names volumes otherwise is ErrVolumeNaming.
		"Substrate takes the seeded home":  {home: "substrate-3f2a-home", seeded: true},
		"a claimed seed is captured soon":  {errs: []error{status.Error(codes.FailedPrecondition, "not captured yet")}, home: "substrate-3f2a-home", seeded: true},
		"the seed was never captured":      {errs: []error{status.Error(codes.NotFound, "no seed")}, want: ErrSeedMissing},
		"the driver is unreachable":        {errs: []error{status.Error(codes.Unavailable, "refused")}, want: status.Error(codes.Unavailable, "refused")},
		"another volume name":              {home: "other-3f2a-home", seeded: true, want: ErrVolumeNaming, deleted: true},
		"the first resume fails":           {start: failed, seeded: true, want: failed, deleted: true},
		"it fails after Substrate took it": {home: "substrate-3f2a-home", start: failed, seeded: true, want: failed},
	} {
		t.Run(name, func(t *testing.T) {
			v := &volumes{errs: tc.errs, seeded: map[string]string{}}
			started := false
			err := Start(ctx, v, tc.home, actor, "golden.t", 1<<30, func() error { started = true; return tc.start })
			if tc.want == nil && err != nil || tc.want != nil && !errors.Is(err, tc.want) {
				t.Fatalf("Start = %v, want %v", err, tc.want)
			}
			if got := v.seeded["substrate-3f2a-home"] == "golden.t"; got != tc.seeded || started != tc.seeded {
				t.Fatalf("seeded = %v, started = %v, want %v", v.seeded, started, tc.seeded)
			}
			if got := len(v.deleted) == 1 && v.deleted[0] == "substrate-3f2a-home"; got != tc.deleted {
				t.Fatalf("deleted = %v, want the seeded home deleted: %v", v.deleted, tc.deleted)
			}
		})
	}
}
