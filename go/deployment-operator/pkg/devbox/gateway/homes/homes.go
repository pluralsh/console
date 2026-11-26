// Package homes seeds the external homes of devbox instances (spec.home.storage other than Snapshot).
//
// Every revision's template names the runner's StorageClass, so Substrate can move an instance between
// revisions, but a new instance's home must start from its own revision's golden home, which the golden memory
// snapshot expects. Substrate creates an actor's external volumes on its first resume from the StorageClass alone,
// so the gateway does the revision-specific part through the home driver's CSI controller:
//
//   - while a revision's golden boot runs, Claimer finds the golden actor (Substrate names it after the template
//     UID) and claims its home for the revision's seed; the driver captures the home into the seed when Substrate
//     deletes the golden actor after the golden tag
//   - Seed creates a new actor's home as a clone of that seed between CreateActor and the first resume, and
//     Verify checks after the resume that Substrate took that volume
package homes

import (
	"context"
	"errors"
	"fmt"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/actors"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/probe"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
)

// Volume is the template volume mounted at /home/dev.
const Volume = "home"

// Driver is a home driver's CSI controller (juicefs.Client).
type Driver interface {
	ClaimSeed(ctx context.Context, volumeID, seedID string) error
	SeedVolume(ctx context.Context, volumeID, seedID string, capacityBytes int64) error
	DeleteVolume(ctx context.Context, volumeID string) error
	SaveSeed(ctx context.Context, seedID, volumeID string) error
	DeleteSeed(ctx context.Context, seedID string) error
}

// VolumeID is the ID Substrate gives an actor's home when it creates it: substrate-<actor uid>-<volume>
// (actorVolumeID in Substrate's controlapi, unchanged since v0.x and not part of its API, so Verify checks it).
func VolumeID(actorUID string) string {
	return fmt.Sprintf("substrate-%s-%s", actorUID, Volume)
}

var (
	// ErrSeedMissing means the revision's golden home was never captured, so no actor can start on the revision.
	ErrSeedMissing = errors.New(probe.ErrHomeSeedMissing)
	// ErrVolumeNaming means Substrate gave an actor's home another ID than VolumeID, so the seeded home wasn't used.
	ErrVolumeNaming = errors.New("the home volume isn't named the way the devbox gateway expects from Substrate; the gateway needs updating for this Substrate version")
)

// captureWait bounds how long Seed waits for a claimed seed to be captured, which happens when Substrate deletes
// the golden actor just after the golden tag.
const captureWait = 2 * time.Minute

// Seed creates a new actor's home as a clone of seed before the actor's first resume, waiting for a claimed seed
// to be captured. A seed that was never claimed is ErrSeedMissing.
func Seed(ctx context.Context, driver Driver, actor *ateapi.Actor, seed string, capacityBytes int64) error {
	uid := actor.GetMetadata().GetUid()
	if uid == "" {
		return errors.New("the actor has no UID")
	}
	ctx, cancel := context.WithTimeout(ctx, captureWait)
	defer cancel()
	for {
		err := driver.SeedVolume(ctx, VolumeID(uid), seed, capacityBytes)
		switch status.Code(err) {
		case codes.OK:
			return nil
		case codes.NotFound:
			return fmt.Errorf("%w (seed %s)", ErrSeedMissing, seed)
		case codes.FailedPrecondition:
			select {
			case <-ctx.Done():
				return fmt.Errorf("%w (seed %s is claimed but wasn't captured in %s)", ErrSeedMissing, seed, captureWait)
			case <-time.After(2 * time.Second):
			}
		default:
			return fmt.Errorf("seeding the home of %s from %s: %w", actor.GetMetadata().GetName(), seed, err)
		}
	}
}

// Release deletes a home Seed created that Substrate never took, for an actor that failed before its first resume:
// Substrate deletes only the volumes it records on the actor.
func Release(ctx context.Context, driver Driver, actor *ateapi.Actor) error {
	if actors.ExternalVolumeID(actor, Volume) != "" {
		return nil
	}
	return driver.DeleteVolume(ctx, VolumeID(actor.GetMetadata().GetUid()))
}

// Verify checks, after the first resume, that the actor's home is the volume Seed created, and deletes that
// volume if Substrate made another.
func Verify(ctx context.Context, driver Driver, actor *ateapi.Actor) error {
	want := VolumeID(actor.GetMetadata().GetUid())
	got := actors.ExternalVolumeID(actor, Volume)
	if got == "" || got == want {
		return nil
	}
	if err := driver.DeleteVolume(ctx, want); err != nil {
		return fmt.Errorf("%w (home %s, seeded %s; deleting the seeded volume: %w)", ErrVolumeNaming, got, want, err)
	}
	return fmt.Errorf("%w (home %s, seeded %s)", ErrVolumeNaming, got, want)
}
