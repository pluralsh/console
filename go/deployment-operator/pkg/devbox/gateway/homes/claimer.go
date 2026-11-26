package homes

import (
	"context"
	"errors"
	"time"

	"github.com/go-logr/logr"
	"github.com/samber/lo"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/actors"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
)

// Actors is the slice of Substrate the claimer reads (*actors.Client).
type Actors interface {
	GetActorTemplate(ctx context.Context, ref actors.Ref) (*ateapi.ActorTemplate, error)
	GetActor(ctx context.Context, ref actors.Ref) (*ateapi.Actor, error)
}

// Claimer claims the external home of every building revision's golden actor for the revision's seed. Claims are
// idempotent, so several gateways may run it.
type Claimer struct {
	Client client.Reader
	Actors Actors
	// Drivers are the home drivers by storage; revisions of a storage without one are skipped.
	Drivers  map[v1alpha1.DevboxHomeStorage]Driver
	Interval time.Duration
	Log      logr.Logger

	claimed map[string]bool
}

// Run claims until ctx is done.
func (c *Claimer) Run(ctx context.Context) error {
	interval := c.Interval
	if interval <= 0 {
		interval = 2 * time.Second
	}
	t := time.NewTicker(interval)
	defer t.Stop()
	for {
		if err := c.Pass(ctx); err != nil && ctx.Err() == nil {
			c.Log.Error(err, "claiming golden homes")
		}
		select {
		case <-ctx.Done():
			return nil
		case <-t.C:
		}
	}
}

// Pass claims what is claimable now.
func (c *Claimer) Pass(ctx context.Context) error {
	list := &v1alpha1.DevboxRunnerList{}
	if err := c.Client.List(ctx, list); err != nil {
		return err
	}
	if c.claimed == nil {
		c.claimed = map[string]bool{}
	}
	var errs []error
	for i := range list.Items {
		runner := &list.Items[i]
		atespace := lo.FromPtr(runner.Status.Atespace)
		if atespace == "" {
			continue
		}
		for _, rev := range runner.Status.Revisions {
			seed := lo.FromPtr(rev.HomeSeed)
			driver := c.Drivers[lo.FromPtr(rev.HomeStorage)]
			if rev.Phase != v1alpha1.DevboxRevisionBuilding || seed == "" || c.claimed[seed] || driver == nil {
				continue
			}
			if err := c.claim(ctx, driver, atespace, rev.Name, seed); err != nil {
				errs = append(errs, err)
			}
		}
	}
	return errors.Join(errs...)
}

// claim finds the golden actor of a template and claims its home once Substrate created it.
func (c *Claimer) claim(ctx context.Context, driver Driver, atespace, template, seed string) error {
	tmpl, err := c.Actors.GetActorTemplate(ctx, actors.Ref{Atespace: atespace, Name: template})
	if substrate.IsNotFound(err) {
		return nil
	}
	if err != nil {
		return err
	}
	// Substrate names a template's golden actor after the template's UID (docs/reference/api-guide.md, "Golden
	// snapshots").
	golden, err := c.Actors.GetActor(ctx, actors.Ref{Atespace: atespace, Name: tmpl.GetMetadata().GetUid()})
	if substrate.IsNotFound(err) {
		return nil
	}
	if err != nil {
		return err
	}
	volume := actors.ExternalVolumeID(golden, Volume)
	if volume == "" {
		// Substrate creates the home on the golden actor's first resume.
		return nil
	}
	// NotFound: Substrate listed the home before creating it, or deleted it already.
	if err := driver.ClaimSeed(ctx, volume, seed); substrate.IsNotFound(err) {
		return nil
	} else if err != nil {
		return err
	}
	c.claimed[seed] = true
	c.Log.Info("claimed the golden home", "atespace", atespace, "template", template, "volume", volume, "seed", seed)
	return nil
}
