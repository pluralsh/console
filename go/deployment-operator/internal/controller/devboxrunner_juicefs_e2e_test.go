//go:build devboxe2e

package controller

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/samber/lo"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/metadata"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/juicefs"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/podcert"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
)

// TestDevboxJuiceFSHomesOnSubstrate checks instance updates of JuiceFS homes (external volumes) against a real
// Substrate with the agent-substrate chart's JuiceFS: two revisions whose templates name the runner's one
// StorageClass, golden homes claimed for their revision's seed, and new homes seeded from it. It makes the JuiceFS
// controller calls the gateway's homes.Claimer and homes.Seed make, which it can't import (the gateway's actors
// package imports this one through egress), so it also pins the Substrate behaviour they rely on.
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
	cfg := map[string]string{}
	for _, k := range []string{"E2E_ATE_ADDRESS", "E2E_ATE_CA", "E2E_ATE_TOKEN", "E2E_ENV_IMAGE", "E2E_RUNTIME_A", "E2E_RUNTIME_B",
		"E2E_JUICEFS_ADDRESS", "E2E_POD_IDENTITY_DIR", "E2E_SERVICEDNS_CA_DIR"} {
		if cfg[k] = os.Getenv(k); cfg[k] == "" {
			t.Skipf("%s is not set", k)
		}
	}
	class := lo.CoalesceOrEmpty(os.Getenv("E2E_JUICEFS_CLASS"), v1alpha1.DevboxDefaultJuiceFSStorageClass)
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
	host, _, err := net.SplitHostPort(cfg["E2E_JUICEFS_ADDRESS"])
	if err != nil {
		t.Fatal(err)
	}
	jfsTLS, err := podcert.ClientTLS(filepath.Join(cfg["E2E_POD_IDENTITY_DIR"], "credential-bundle.pem"),
		filepath.Join(cfg["E2E_SERVICEDNS_CA_DIR"], "trust-bundle.pem"), host)
	if err != nil {
		t.Fatal(err)
	}
	driver, err := juicefs.Dial(cfg["E2E_JUICEFS_ADDRESS"], jfsTLS)
	if err != nil {
		t.Fatal(err)
	}
	defer driver.Close()

	base, cancel := context.WithTimeout(context.Background(), 25*time.Minute)
	defer cancel()
	// External volumes are a Substrate preview feature, for every call that touches their templates.
	ctx := metadata.AppendToOutgoingContext(base, substrate.PreviewHeader, "true")
	e := &devboxE2E{t: t, ctx: ctx, c: ateapi.NewControlClient(conn), api: substrate.NewFromConn(conn), atespace: fmt.Sprintf("e2e-jfs-%d", time.Now().Unix())}
	if err := e.api.EnsureAtespace(ctx, e.atespace); err != nil {
		t.Fatal(err)
	}
	t.Logf("atespace %s", e.atespace)

	runner := &v1alpha1.DevboxRunner{ObjectMeta: metav1.ObjectMeta{Name: "e2e", UID: types.UID("e2e")}}
	runner.Spec.Agents = []v1alpha1.DevboxAgent{{Type: v1alpha1.DevboxAgentClaude, Default: lo.ToPtr(true)}, {Type: v1alpha1.DevboxAgentCodex}}
	runner.Spec.Resources = &v1alpha1.DevboxResources{CPU: lo.ToPtr(resource.MustParse("500m")), Memory: lo.ToPtr(resource.MustParse("1Gi"))}
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
	t.Run("golden boots capture each revision's home", func(t *testing.T) {
		for _, name := range []string{"rev-a", "rev-b"} {
			start := time.Now()
			// homes.Claimer: the golden actor is named after the template UID, and its home exists once it's resumed.
			claimed := ""
			for claimed == "" && time.Since(start) < 5*time.Minute {
				if golden, err := e.c.GetActor(ctx, &ateapi.GetActorRequest{Actor: e.ref(uids[name])}); err == nil && home(golden) != "" {
					if err := driver.ClaimSeed(ctx, home(golden), seeds[name]); err != nil {
						t.Fatalf("claiming the golden home of %s: %v", name, err)
					}
					claimed = home(golden)
				}
				time.Sleep(time.Second)
			}
			if claimed == "" {
				t.Fatalf("template %s's golden actor %s never got a home", name, uids[name])
			}
			t.Logf("golden home %s claimed for %s after %s", claimed, seeds[name], time.Since(start).Round(time.Second))
			tag, msg := e.golden(name)
			if tag == "" {
				t.Fatalf("template %s has no golden snapshot: %s", name, msg)
			}
			t.Logf("template %s: golden tag %s (%s)", name, tag, time.Since(start).Round(time.Second))
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
