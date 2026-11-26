// Package homes seeds the external homes (JuiceFS, ZeroFS) of devbox instances. Every revision's template names the
// runner's StorageClass, so instances move between revisions, but a new instance's home must start from its own
// revision's golden home, which the golden memory snapshot expects. Claimer claims each golden actor's home for its
// revision's seed while the golden boot runs, and Start creates new homes as copies of it before their first
// resume, through the home driver's CSI controller.
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

// Driver is a home driver's CSI controller (homedriver.Client).
type Driver interface {
	ClaimSeed(ctx context.Context, volumeID, seedID string) error
	SeedVolume(ctx context.Context, volumeID, seedID string, capacityBytes int64) error
	DeleteVolume(ctx context.Context, volumeID string) error
}

// ActorReader reads actors (*actors.Client).
type ActorReader interface {
	GetActor(ctx context.Context, ref actors.Ref) (*ateapi.Actor, error)
}

var (
	// ErrSeedMissing means the revision's golden home was never captured, so no actor can start on the revision.
	ErrSeedMissing = errors.New(probe.ErrHomeSeedMissing)
	// ErrVolumeNaming means Substrate gave an actor's home another ID than volumeID, so the seeded home wasn't used.
	ErrVolumeNaming = errors.New("the home volume isn't named the way the devbox gateway expects from Substrate; the gateway needs updating for this Substrate version")
)

const (
	// captureWait bounds how long Start waits for a claimed seed to be captured, which happens when Substrate
	// deletes the golden actor just after the golden tag; capturePoll is how often it asks.
	captureWait = 2 * time.Minute
	capturePoll = 2 * time.Second
	// checkTimeout bounds reading the actor and deleting an unused home after its first resume.
	checkTimeout = time.Minute
)

// volumeID is the ID Substrate gives an actor's home when it creates it: substrate-<actor uid>-<volume>
// (actorVolumeID in Substrate's controlapi, not part of its API, so Start checks it).
func volumeID(actorUID string) string {
	return fmt.Sprintf("substrate-%s-%s", actorUID, Volume)
}

// Start creates a new actor's home as a copy of seed, runs start (the actor's first resume, which makes Substrate
// take the volume) and checks that Substrate took the seeded home. The seeded home is deleted when Substrate didn't
// take it: Substrate deletes only the volumes it records on the actor.
func Start(ctx context.Context, driver Driver, reader ActorReader, actor *ateapi.Actor, seed string, capacityBytes int64, start func() error) error {
	md := actor.GetMetadata()
	if md.GetUid() == "" {
		return errors.New("the actor has no UID")
	}
	ref, seeded := actors.Ref{Atespace: md.GetAtespace(), Name: md.GetName()}, volumeID(md.GetUid())
	if err := seedVolume(ctx, driver, seeded, seed, capacityBytes); err != nil {
		return fmt.Errorf("seeding the home of %s from %s: %w", ref, seed, err)
	}
	startErr := start()
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), checkTimeout)
	defer cancel()
	got, err := reader.GetActor(ctx, ref)
	if err != nil {
		// Without the actor nothing is known about its home: a started actor keeps it, a failed one may leak it.
		if startErr != nil {
			return errors.Join(startErr, fmt.Errorf("reading actor %s: %w", ref, err))
		}
		return nil
	}
	// A home that isn't the seeded one is why a golden restore fails, so it is reported even when start failed.
	switch home := actors.ExternalVolumeID(got, Volume); {
	case home != "" && home != seeded:
		return errors.Join(fmt.Errorf("%w (home %s, seeded %s)", ErrVolumeNaming, home, seeded), driver.DeleteVolume(ctx, seeded))
	case home == "" && startErr != nil:
		return errors.Join(startErr, driver.DeleteVolume(ctx, seeded))
	}
	return startErr
}

// seedVolume creates volume as a copy of seed, waiting for a claimed seed to be captured. A seed that was never
// claimed is ErrSeedMissing.
func seedVolume(ctx context.Context, driver Driver, volume, seed string, capacityBytes int64) error {
	ctx, cancel := context.WithTimeout(ctx, captureWait)
	defer cancel()
	for {
		err := driver.SeedVolume(ctx, volume, seed, capacityBytes)
		switch status.Code(err) {
		case codes.OK:
			return nil
		case codes.NotFound:
			return fmt.Errorf("%w (seed %s)", ErrSeedMissing, seed)
		case codes.FailedPrecondition:
			select {
			case <-ctx.Done():
				return fmt.Errorf("%w (seed %s is claimed but wasn't captured in %s)", ErrSeedMissing, seed, captureWait)
			case <-time.After(capturePoll):
			}
		default:
			return err
		}
	}
}
