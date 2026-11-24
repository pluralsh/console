//go:build devboxe2e

package controller

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/samber/lo"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
)

// TestDevboxInstanceUpdatesOnSubstrate runs the template the controller builds, and the moves the gateway makes
// between revisions of it, against a real Substrate (PROD-5487). Everything the design depends on is Substrate
// and gVisor behaviour that unit tests can only assume, so run this before bumping the agent-substrate chart:
//
//	go test -tags devboxe2e ./internal/controller/ -run TestDevboxInstanceUpdatesOnSubstrate -v -timeout 30m
//
// It needs, in the environment:
//
//	E2E_ATE_ADDRESS   ate-api-server, e.g. a port-forward at 127.0.0.1:8443 (TLS server name api.ate-system.svc)
//	E2E_ATE_CA        the servicedns.podcert.ate.dev trust bundle (PEM file)
//	E2E_ATE_TOKEN     a ServiceAccount token with audience api.ate-system.svc (file), of a global owner
//	E2E_ENV_IMAGE     an environment image pinned by digest whose ENTRYPOINT runs its own devbox-daemon
//	E2E_RUNTIME_A/_B  two devbox-runtime-core builds pinned by digest
//	E2E_SHELL         optional spec.runtime.shell
//
// and a WorkerPool labelled devboxes.plural.sh/runner.e2e=true.
func TestDevboxInstanceUpdatesOnSubstrate(t *testing.T) {
	cfg := map[string]string{}
	for _, k := range []string{"E2E_ATE_ADDRESS", "E2E_ATE_CA", "E2E_ATE_TOKEN", "E2E_ENV_IMAGE", "E2E_RUNTIME_A", "E2E_RUNTIME_B"} {
		if cfg[k] = os.Getenv(k); cfg[k] == "" {
			t.Skipf("%s is not set", k)
		}
	}
	ca, err := os.ReadFile(cfg["E2E_ATE_CA"])
	if err != nil {
		t.Fatal(err)
	}
	pool := x509.NewCertPool()
	pool.AppendCertsFromPEM(ca)
	conn, err := grpc.NewClient(cfg["E2E_ATE_ADDRESS"],
		grpc.WithTransportCredentials(credentials.NewTLS(&tls.Config{RootCAs: pool, ServerName: "api.ate-system.svc", MinVersion: tls.VersionTLS12})),
		grpc.WithPerRPCCredentials(e2eToken(cfg["E2E_ATE_TOKEN"])))
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 25*time.Minute)
	defer cancel()

	e := &devboxE2E{t: t, ctx: ctx, c: ateapi.NewControlClient(conn), api: substrate.NewFromConn(conn), atespace: fmt.Sprintf("e2e-%d", time.Now().Unix())}
	if err := e.api.EnsureAtespace(ctx, e.atespace); err != nil {
		t.Fatal(err)
	}
	t.Logf("atespace %s", e.atespace)

	runner := func(mutate ...func(*v1alpha1.DevboxRunner)) *v1alpha1.DevboxRunner {
		r := &v1alpha1.DevboxRunner{ObjectMeta: metav1.ObjectMeta{Name: "e2e", UID: types.UID("e2e")}}
		r.Spec.Resources = &v1alpha1.DevboxResources{CPU: lo.ToPtr(resource.MustParse("500m")), Memory: lo.ToPtr(resource.MustParse("1Gi"))}
		if shell := os.Getenv("E2E_SHELL"); shell != "" {
			r.Spec.Runtime = &v1alpha1.DevboxRuntime{Shell: &shell}
		}
		for _, m := range mutate {
			m(r)
		}
		return r
	}
	build := func(name, runtime string, r *v1alpha1.DevboxRunner) *ateapi.ActorTemplate {
		tmpl, _, err := (&DevboxRunnerReconciler{}).buildActorTemplate(r, e.atespace, cfg["E2E_ENV_IMAGE"], runtime)
		if err != nil {
			t.Fatal(err)
		}
		tmpl.Metadata.Name = name
		return tmpl
	}

	// What operators before the runtime sidecar built: the environment image alone, running its own daemon.
	old := build("old", cfg["E2E_RUNTIME_A"], runner())
	old.Containers = old.Containers[:1]
	old.Containers[0].Command = nil
	// Two releases of the daemon, a template change that keeps the runtime, and an environment image without the
	// shell the devbox container starts with.
	a := build("a", cfg["E2E_RUNTIME_A"], runner())
	a2 := build("a2", cfg["E2E_RUNTIME_A"], runner(func(r *v1alpha1.DevboxRunner) {
		r.Spec.Env = []v1alpha1.DevboxEnvVar{{Name: "E2E_TEMPLATE", Value: lo.ToPtr("a2")}}
	}))
	b := build("b", cfg["E2E_RUNTIME_B"], runner())
	broken := build("broken", cfg["E2E_RUNTIME_B"], runner(func(r *v1alpha1.DevboxRunner) {
		r.Spec.Runtime = &v1alpha1.DevboxRuntime{Shell: lo.ToPtr("/no/such/shell")}
	}))
	for _, tmpl := range []*ateapi.ActorTemplate{old, a, a2, b, broken} {
		if _, err := e.api.CreateActorTemplate(ctx, tmpl, false); err != nil {
			t.Fatalf("creating template %s: %v", tmpl.Metadata.Name, err)
		}
	}

	t.Run("golden boots", func(t *testing.T) {
		for _, name := range []string{"old", "a", "a2", "b"} {
			tag, msg := e.golden(name)
			if tag == "" {
				t.Fatalf("template %s has no golden snapshot: %s", name, msg)
			}
			t.Logf("template %s: golden tag %s", name, tag)
		}
		// A missing shell fails the golden boot quickly and says why.
		tag, msg := e.golden("broken")
		if tag != "" || msg == "" {
			t.Fatalf("the template without a shell built a golden snapshot (%s)", tag)
		}
		t.Logf("template broken: %s%s", msg, goldenFailureHint(runner(func(r *v1alpha1.DevboxRunner) {
			r.Spec.Runtime = &v1alpha1.DevboxRuntime{Shell: lo.ToPtr("/no/such/shell")}
		}), msg))
	})

	// One instance through everything a healthy fleet sees.
	t.Run("an instance from before the sidecar follows two daemon releases", func(t *testing.T) {
		e.create("i1", "old")
		e.resume("i1", "first start, from the golden snapshot", ateapi.ActorState_ACTOR_STATE_RUNNING)
		e.move("i1", "a", "migration to the sidecar template")
		e.suspend("i1")
		e.resume("i1", "plain resume on the sidecar template", ateapi.ActorState_ACTOR_STATE_RUNNING)
		e.move("i1", "b", "daemon release")
		e.move("i1", "a", "back to the previous daemon")
		for i := range 5 {
			e.move("i1", lo.Ternary(i%2 == 0, "a2", "a"), "template change, same runtime")
		}
		e.suspend("i1")
	})

	// What the gateway does when an instance doesn't start on the revision it was moved to. From the pre-sidecar
	// template this is the path every existing instance takes if the first sidecar revision is bad.
	for _, from := range []string{"old", "a"} {
		t.Run("a crash on the new revision rolls back to "+from, func(t *testing.T) {
			name := "crash-" + from
			e.create(name, from)
			e.resume(name, "first start", ateapi.ActorState_ACTOR_STATE_RUNNING)
			e.suspend(name)
			e.setTemplate(name, "broken")
			e.resume(name, "start on the broken revision", ateapi.ActorState_ACTOR_STATE_CRASHED)
			start := time.Now()
			if _, err := e.c.RevertActor(ctx, &ateapi.RevertActorRequest{Actor: e.ref(name)}); err != nil {
				t.Fatalf("reverting %s: %v", name, err)
			}
			e.wait(name, ateapi.ActorState_ACTOR_STATE_SUSPENDED)
			e.setTemplate(name, from)
			t.Logf("%s: reverted and repointed to %s in %s", name, from, time.Since(start).Round(time.Millisecond))
			e.resume(name, "resume after the rollback", ateapi.ActorState_ACTOR_STATE_RUNNING)
			e.suspend(name)
		})
	}

	// Moving back without a crash, for a daemon that starts but isn't usable.
	t.Run("a healthy instance moves back to the pre-sidecar template", func(t *testing.T) {
		e.create("back", "old")
		e.resume("back", "first start", ateapi.ActorState_ACTOR_STATE_RUNNING)
		e.move("back", "a", "migration to the sidecar template")
		e.move("back", "old", "back to the pre-sidecar template")
		e.suspend("back")
	})

	t.Run("a new instance starts from the sidecar template's golden snapshot", func(t *testing.T) {
		e.create("fresh", "b")
		e.resume("fresh", "first start, from the golden snapshot", ateapi.ActorState_ACTOR_STATE_RUNNING)
		e.suspend("fresh")
	})

	t.Run("substrate refuses what the gateway never does", func(t *testing.T) {
		e.resume("fresh", "resume", ateapi.ActorState_ACTOR_STATE_RUNNING)
		if err := e.trySetTemplate("fresh", "a"); err == nil {
			t.Fatal("a running actor changed template")
		} else {
			t.Logf("repointing a running actor: %v", err)
		}
		e.suspend("fresh")
	})
}

type devboxE2E struct {
	t        *testing.T
	ctx      context.Context
	c        ateapi.ControlClient
	api      *substrate.Client
	atespace string
}

type e2eToken string

func (f e2eToken) GetRequestMetadata(context.Context, ...string) (map[string]string, error) {
	token, err := os.ReadFile(string(f))
	if err != nil {
		return nil, err
	}
	return map[string]string{"authorization": "Bearer " + strings.TrimSpace(string(token))}, nil
}

func (e2eToken) RequireTransportSecurity() bool { return true }

func (e *devboxE2E) ref(name string) *ateapi.ObjectRef {
	return &ateapi.ObjectRef{Atespace: e.atespace, Name: name}
}

// golden waits for a template's golden snapshot and returns its tag, or the error that stopped it.
func (e *devboxE2E) golden(name string) (tag, failure string) {
	e.t.Helper()
	deadline := time.Now().Add(8 * time.Minute)
	for time.Now().Before(deadline) {
		tmpl, err := e.api.GetActorTemplate(e.ctx, e.atespace, name)
		if err != nil {
			e.t.Fatal(err)
		}
		st := tmpl.GetStatus().GetGoldenSnapshotStatus()
		if msg := st.GetErrorMessage(); msg != "" {
			return "", msg
		}
		if tag := st.GetGoldenTag().GetName(); tag != "" {
			return tag, ""
		}
		time.Sleep(2 * time.Second)
	}
	return "", "timed out"
}

func (e *devboxE2E) create(name, template string) {
	e.t.Helper()
	tag, msg := e.golden(template)
	if tag == "" {
		e.t.Fatalf("template %s: %s", template, msg)
	}
	_, err := e.c.CreateActor(e.ctx, &ateapi.CreateActorRequest{Actor: &ateapi.Actor{
		Metadata:      &ateapi.ResourceMetadata{Atespace: e.atespace, Name: name},
		ActorTemplate: e.ref(template),
		SourceTag:     e.ref(tag),
	}})
	if err != nil {
		e.t.Fatalf("creating %s: %v", name, err)
	}
}

func (e *devboxE2E) wait(name string, states ...ateapi.ActorState) *ateapi.Actor {
	e.t.Helper()
	deadline := time.Now().Add(3 * time.Minute)
	var last *ateapi.Actor
	for time.Now().Before(deadline) {
		a, err := e.c.GetActor(e.ctx, &ateapi.GetActorRequest{Actor: e.ref(name)})
		if err != nil {
			e.t.Fatal(err)
		}
		last = a
		if lo.Contains(states, a.GetStatus().GetState()) {
			return a
		}
		if a.GetStatus().GetState() == ateapi.ActorState_ACTOR_STATE_CRASHED {
			e.t.Fatalf("%s crashed: %s", name, a.GetStatus().GetCrash().String())
		}
		time.Sleep(100 * time.Millisecond)
	}
	e.t.Fatalf("%s is %s, want one of %v", name, last.GetStatus().GetState(), states)
	return nil
}

// resume resumes the actor like the gateway does, retrying while no worker has room.
func (e *devboxE2E) resume(name, what string, want ateapi.ActorState) {
	e.t.Helper()
	start := time.Now()
	for {
		_, err := e.c.ResumeActor(e.ctx, &ateapi.ResumeActorRequest{Actor: e.ref(name)})
		if err == nil || want == ateapi.ActorState_ACTOR_STATE_CRASHED {
			break
		}
		if !strings.Contains(err.Error(), "ResourceExhausted") || time.Since(start) > 2*time.Minute {
			e.t.Fatalf("%s: %s: %v", name, what, err)
		}
		time.Sleep(time.Second)
	}
	a := e.wait(name, want)
	e.t.Logf("%s: %s: %s after %s", name, what, a.GetStatus().GetState(), time.Since(start).Round(time.Millisecond))
	if want == ateapi.ActorState_ACTOR_STATE_CRASHED {
		e.t.Logf("%s: crash: %s", name, a.GetStatus().GetCrash().String())
	}
}

func (e *devboxE2E) suspend(name string) {
	e.t.Helper()
	start := time.Now()
	_, err := e.c.SuspendActor(e.ctx, &ateapi.SuspendActorRequest{Actor: e.ref(name),
		Options: &ateapi.SuspendOptions{Mode: ateapi.DurabilityMode_DURABILITY_MODE_SYNCHRONOUS}})
	if err != nil {
		e.t.Fatalf("suspending %s: %v", name, err)
	}
	e.wait(name, ateapi.ActorState_ACTOR_STATE_SUSPENDED)
	e.t.Logf("%s: suspended (synchronous) in %s", name, time.Since(start).Round(time.Millisecond))
}

// trySetTemplate is the gateway's actors.Client.SetTemplate.
func (e *devboxE2E) trySetTemplate(name, template string) error {
	a, err := e.c.GetActor(e.ctx, &ateapi.GetActorRequest{Actor: e.ref(name)})
	if err != nil {
		return err
	}
	a.ActorTemplate = e.ref(template)
	a.Status = nil
	_, err = e.c.UpdateActor(e.ctx, &ateapi.UpdateActorRequest{Actor: a})
	return err
}

func (e *devboxE2E) setTemplate(name, template string) {
	e.t.Helper()
	if err := e.trySetTemplate(name, template); err != nil {
		e.t.Fatalf("moving %s to template %s: %v", name, template, err)
	}
}

// move is the gateway's rebase of a running instance: synchronous suspend, repoint, resume.
func (e *devboxE2E) move(name, template, what string) {
	e.t.Helper()
	e.suspend(name)
	e.setTemplate(name, template)
	e.resume(name, what+" ("+template+")", ateapi.ActorState_ACTOR_STATE_RUNNING)
}
