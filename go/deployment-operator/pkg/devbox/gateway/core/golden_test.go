package core

import (
	"context"
	"encoding/json"
	"errors"
	"slices"
	"testing"

	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/actors"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/actors/actorstest"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/egress"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/guest"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
)

func TestGoldenResolver(t *testing.T) {
	ate := actorstest.New()
	cfg, _ := json.Marshal(guest.Config{Runner: "platform", Repositories: []guest.Repository{
		{URL: "https://github.com/pluralsh/console"}, {URL: "https://gitlab.example.com/acme/api"},
	}})
	ate.Templates["ds-platform/platform-r2"] = &ateapi.ActorTemplate{
		Metadata:   &ateapi.ResourceMetadata{Atespace: "ds-platform", Name: "platform-r2", Uid: "uid-r2"},
		Containers: []*ateapi.Container{{Env: []*ateapi.EnvVar{{Name: guest.EnvVar, Value: string(cfg)}}}},
	}
	tmpl := &ateapi.ObjectRef{Atespace: "ds-platform", Name: "platform-r2"}
	ate.Actors["ds-platform/uid-r2"] = &ateapi.Actor{Metadata: &ateapi.ResourceMetadata{Name: "uid-r2"}, ActorTemplate: tmpl}
	ate.Actors["ds-platform/instance-1"] = &ateapi.Actor{Metadata: &ateapi.ResourceMetadata{Name: "instance-1"}, ActorTemplate: tmpl}

	runner := &Runner{Name: "platform", Atespace: "ds-platform", ConsoleID: "box-9", AllowedRepositories: []string{"github.com/pluralsh/console"}}
	r := &GoldenResolver{Runners: StaticRunners{"platform": runner}, Actors: actors.New(ateapi.NewControlClient(ate.Dial(t)))}
	ctx := context.Background()

	info, err := r.ResolveActor(ctx, "ds-platform/uid-r2")
	if err != nil {
		t.Fatal(err)
	}
	if !info.Golden || info.InstanceID != egress.GoldenInstanceID("platform") || info.BoxID != "box-9" {
		t.Fatalf("golden info = %+v", info)
	}
	if !slices.Equal(info.SCMHosts, []string{"github.com", "gitlab.example.com"}) {
		t.Errorf("SCM hosts = %v, want the template's repository hosts", info.SCMHosts)
	}
	if !slices.Equal(info.AllowedRepositories, runner.AllowedRepositories) {
		t.Errorf("allowed repositories = %v", info.AllowedRepositories)
	}

	for _, actor := range []string{"ds-platform/instance-1", "ds-platform/missing", "ds-other/uid-r2", "no-slash"} {
		if _, err := r.ResolveActor(ctx, actor); !errors.Is(err, egress.ErrUnknownActor) {
			t.Errorf("%s: err = %v, want ErrUnknownActor", actor, err)
		}
	}

	runner.ConsoleID = ""
	if _, err := r.ResolveActor(ctx, "ds-platform/uid-r2"); err == nil || errors.Is(err, egress.ErrUnknownActor) {
		t.Errorf("a runner console doesn't know yet: err = %v, want a retryable error", err)
	}
}
