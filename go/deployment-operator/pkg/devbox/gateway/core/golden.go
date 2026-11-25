package core

import (
	"context"
	"encoding/json"
	"fmt"
	"slices"
	"strings"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/actors"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/egress"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/guest"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
)

// AtespaceRunners finds the runner owning an atespace.
type AtespaceRunners interface {
	ByAtespace(ctx context.Context, atespace string) (*Runner, error)
}

// GoldenActors reads actors and their templates from Substrate.
type GoldenActors interface {
	GetActor(ctx context.Context, ref actors.Ref) (*ateapi.Actor, error)
	GetActorTemplate(ctx context.Context, ref actors.Ref) (*ateapi.ActorTemplate, error)
}

// GoldenResolver resolves the golden actors Substrate boots from a runner's templates (named after the template's
// UID, in the runner's atespace), so their egress can fetch SCM credentials to preclone the runner's repositories.
// The repositories come from the template's own guest config rather than the runner's spec, which may already
// describe a newer revision.
type GoldenResolver struct {
	Runners AtespaceRunners
	Actors  GoldenActors
}

func (r *GoldenResolver) ResolveActor(ctx context.Context, actorID string) (*egress.InstanceInfo, error) {
	atespace, name, ok := strings.Cut(actorID, "/")
	if !ok || atespace == "" || name == "" {
		return nil, egress.ErrUnknownActor
	}
	runner, err := r.Runners.ByAtespace(ctx, atespace)
	if err != nil {
		return nil, err
	}
	if runner == nil {
		return nil, egress.ErrUnknownActor
	}

	actor, err := r.Actors.GetActor(ctx, actors.Ref{Atespace: atespace, Name: name})
	if status.Code(err) == codes.NotFound {
		return nil, egress.ErrUnknownActor
	}
	if err != nil {
		return nil, fmt.Errorf("reading actor %s: %w", actorID, err)
	}
	tmplName := actor.GetActorTemplate().GetName()
	if tmplName == "" {
		return nil, egress.ErrUnknownActor
	}
	tmpl, err := r.Actors.GetActorTemplate(ctx, actors.Ref{Atespace: atespace, Name: tmplName})
	if status.Code(err) == codes.NotFound {
		return nil, egress.ErrUnknownActor
	}
	if err != nil {
		return nil, fmt.Errorf("reading actor template %s/%s: %w", atespace, tmplName, err)
	}
	if tmpl.GetMetadata().GetUid() != name {
		return nil, egress.ErrUnknownActor
	}
	cfg, err := templateGuestConfig(tmpl)
	if err != nil {
		return nil, fmt.Errorf("actor template %s/%s: %w", atespace, tmplName, err)
	}
	if runner.ConsoleID == "" {
		return nil, fmt.Errorf("devbox runner %s isn't registered with console yet", runner.Name)
	}

	repos := make([]string, 0, len(cfg.Repositories))
	for _, repo := range cfg.Repositories {
		repos = append(repos, repo.URL)
	}
	return &egress.InstanceInfo{
		InstanceID:          egress.GoldenInstanceID(runner.Name),
		BoxID:               runner.ConsoleID,
		Golden:              true,
		AllowedRepositories: slices.Clone(runner.AllowedRepositories),
		HTTPAllowlist:       slices.Clone(runner.HTTPAllowlist),
		SCMHosts:            egress.RepositoryHosts(repos),
	}, nil
}

// templateGuestConfig decodes the guest config a template passes its containers; templates without one have
// nothing to preclone.
func templateGuestConfig(tmpl *ateapi.ActorTemplate) (*guest.Config, error) {
	cfg := &guest.Config{}
	for _, c := range tmpl.GetContainers() {
		for _, env := range c.GetEnv() {
			if env.GetName() != guest.EnvVar {
				continue
			}
			if err := json.Unmarshal([]byte(env.GetValue()), cfg); err != nil {
				return nil, fmt.Errorf("decoding %s: %w", guest.EnvVar, err)
			}
			return cfg, nil
		}
	}
	return cfg, nil
}
