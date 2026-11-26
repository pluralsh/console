//go:build devboxe2e

package controller

import (
	"context"
	"net"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"github.com/samber/lo"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
	"k8s.io/apimachinery/pkg/api/resource"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/homedriver"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/podcert"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
)

// TestDevboxJuiceFSHomesOnSubstrate checks instance updates of JuiceFS homes (external volumes) against a real
// Substrate with the agent-substrate chart's JuiceFS: two revisions whose templates name the runner's one
// StorageClass, golden homes claimed for their revision's seed, and new homes seeded from it, through the client
// the gateway uses (homedriver.Client). It finds the golden actor and its home as the gateway's homes.Claimer does,
// which it can't import (the gateway's actors package imports this one through egress), so it also pins the
// Substrate behaviour they rely on.
//
//   - each revision's golden boot installs the runtime into its home, which is captured into the revision's seed
//   - a new instance on either revision starts from the golden tag on a home cloned from its revision's seed
//   - an instance moves to the other revision, keeping its home
//   - Substrate names golden actors and home volumes the way the gateway expects
//
// It has to reach the JuiceFS controller as the devbox-gateway, so it runs in a pod of that ServiceAccount (see
// the work thread's artifacts/e2e/juicefs-run.sh):
//
//	go test -c -tags devboxe2e ./internal/controller/ && ./controller.test -test.run TestDevboxJuiceFSHomesOnSubstrate -test.v
//
// It needs what TestDevboxInstanceUpdatesOnSubstrate needs, plus E2E_JUICEFS_ADDRESS (the controller,
// devbox-juicefs.<ns>.svc:9820), E2E_POD_IDENTITY_DIR (the pod's podidentity credential bundle) and
// E2E_SERVICEDNS_CA_DIR (the servicedns trust bundle), and optionally E2E_JUICEFS_CLASS (devbox-juicefs).
func TestDevboxJuiceFSHomesOnSubstrate(t *testing.T) {
	e, cfg := startDevboxE2E(t, "e2e-jfs", "E2E_JUICEFS_ADDRESS", "E2E_POD_IDENTITY_DIR", "E2E_SERVICEDNS_CA_DIR")
	// External volumes are a Substrate preview feature, for every call that touches their templates.
	e.ctx = metadata.AppendToOutgoingContext(e.ctx, substrate.PreviewHeader, "true")
	ctx := e.ctx
	class := lo.CoalesceOrEmpty(os.Getenv("E2E_JUICEFS_CLASS"), v1alpha1.DevboxDefaultJuiceFSStorageClass)
	host, _, err := net.SplitHostPort(cfg["E2E_JUICEFS_ADDRESS"])
	if err != nil {
		t.Fatal(err)
	}
	jfsTLS, err := podcert.ClientTLS(filepath.Join(cfg["E2E_POD_IDENTITY_DIR"], "credential-bundle.pem"),
		filepath.Join(cfg["E2E_SERVICEDNS_CA_DIR"], "trust-bundle.pem"), host)
	if err != nil {
		t.Fatal(err)
	}
	jfsConn, err := grpc.NewClient(cfg["E2E_JUICEFS_ADDRESS"], grpc.WithTransportCredentials(credentials.NewTLS(jfsTLS)))
	if err != nil {
		t.Fatal(err)
	}
	defer jfsConn.Close()
	driver := homedriver.NewClient(jfsConn)

	runner := e2eRunner()
	size := resource.MustParse("5Gi")
	runner.Spec.Home = &v1alpha1.DevboxHome{Storage: lo.ToPtr(v1alpha1.DevboxHomeJuiceFS), Size: &size, StorageClassName: &class}
	seeds, uids := map[string]string{}, map[string]string{}
	for _, rev := range []struct{ name, runtime string }{{"rev-a", cfg["E2E_RUNTIME_A"]}, {"rev-b", cfg["E2E_RUNTIME_B"]}} {
		tmpl, _, err := (&DevboxRunnerReconciler{}).buildActorTemplate(runner, e.atespace, cfg["E2E_ENV_IMAGE"], rev.runtime)
		if err != nil {
			t.Fatal(err)
		}
		tmpl.Metadata.Name = rev.name
		created, err := e.api.CreateActorTemplate(ctx, tmpl, true)
		if err != nil {
			t.Fatalf("creating template %s: %v", rev.name, err)
		}
		uids[rev.name] = created.GetMetadata().GetUid()
		seeds[rev.name] = devboxGoldenHomeSeed(uids[rev.name])
	}

	home := func(a *ateapi.Actor) string {
		for _, v := range a.GetStatus().GetExternalVolumes().GetVolumes() {
			if v.GetName() == devboxHomeVolume {
				return v.GetStorageVolumeId()
			}
		}
		return ""
	}
	// homes.Claimer, polling every building revision: the golden actor is named after the template UID, and its home
	// exists once Substrate resumed it.
	var mu sync.Mutex
	claimed, claimErrs := map[string]string{}, map[string]error{}
	claimCtx, stopClaims := context.WithCancel(ctx)
	go func() {
		for claimCtx.Err() == nil {
			for name, uid := range uids {
				mu.Lock()
				done := claimed[name] != ""
				mu.Unlock()
				if done {
					continue
				}
				golden, err := e.c.GetActor(claimCtx, &ateapi.GetActorRequest{Actor: e.ref(uid)})
				if err != nil || home(golden) == "" {
					continue
				}
				err = driver.ClaimSeed(claimCtx, home(golden), seeds[name])
				mu.Lock()
				if err == nil {
					claimed[name] = home(golden)
				} else if status.Code(err) != codes.NotFound {
					claimErrs[name] = err
				}
				mu.Unlock()
			}
			time.Sleep(time.Second)
		}
	}()

	t.Run("golden boots capture each revision's home", func(t *testing.T) {
		start := time.Now()
		for _, name := range []string{"rev-a", "rev-b"} {
			tag, msg := e.golden(name)
			if tag == "" {
				t.Fatalf("template %s has no golden snapshot: %s", name, msg)
			}
			t.Logf("template %s: golden tag %s (%s)", name, tag, time.Since(start).Round(time.Second))
		}
		stopClaims()
		mu.Lock()
		defer mu.Unlock()
		for _, name := range []string{"rev-a", "rev-b"} {
			if claimed[name] == "" {
				t.Errorf("template %s's golden home was never claimed: %v", name, claimErrs[name])
				continue
			}
			t.Logf("template %s: golden home %s claimed for %s", name, claimed[name], seeds[name])
		}
	})

	// homes.Seed and homes.Verify, as the gateway's doProvision runs them for a new instance.
	start := func(t *testing.T, name, template string) {
		t.Helper()
		created, err := e.c.CreateActor(ctx, &ateapi.CreateActorRequest{Actor: &ateapi.Actor{
			Metadata:      &ateapi.ResourceMetadata{Atespace: e.atespace, Name: name},
			ActorTemplate: e.ref(template),
		}})
		if err != nil {
			t.Fatalf("creating %s: %v", name, err)
		}
		seeded := "substrate-" + created.GetMetadata().GetUid() + "-home"
		if err := driver.SeedVolume(ctx, seeded, seeds[template], size.Value()); err != nil {
			t.Fatalf("seeding %s from %s: %v", seeded, seeds[template], err)
		}
		e.resume(name, "first start on "+template, ateapi.ActorState_ACTOR_STATE_RUNNING)
		if got := home(e.wait(name, ateapi.ActorState_ACTOR_STATE_RUNNING)); got != seeded {
			t.Fatalf("Substrate gave %s the home %s, not the seeded %s", name, got, seeded)
		}
	}

	t.Run("new instances start on each revision's golden home", func(t *testing.T) {
		start(t, "new-a", "rev-a")
		start(t, "new-b", "rev-b")
	})

	t.Run("an instance moves to the other revision", func(t *testing.T) {
		before := home(e.wait("new-a", ateapi.ActorState_ACTOR_STATE_RUNNING))
		e.move("new-a", "rev-b", "resume on rev-b")
		if after := home(e.wait("new-a", ateapi.ActorState_ACTOR_STATE_RUNNING)); after != before {
			t.Fatalf("the home changed from %s to %s", before, after)
		}
	})

	t.Run("a new instance still starts on the revision instances moved to", func(t *testing.T) {
		start(t, "new-b2", "rev-b")
	})
}
