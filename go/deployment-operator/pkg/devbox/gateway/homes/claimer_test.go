package homes

import (
	"context"
	"maps"
	"testing"

	"github.com/go-logr/logr"
	"github.com/samber/lo"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/actors"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
)

// fakeActors holds templates and actors by name.
type fakeActors struct {
	templates map[string]*ateapi.ActorTemplate
	actors    map[string]*ateapi.Actor
}

func (f *fakeActors) GetActorTemplate(_ context.Context, ref actors.Ref) (*ateapi.ActorTemplate, error) {
	if t, ok := f.templates[ref.String()]; ok {
		return t, nil
	}
	return nil, status.Error(codes.NotFound, "no template")
}

func (f *fakeActors) GetActor(_ context.Context, ref actors.Ref) (*ateapi.Actor, error) {
	if a, ok := f.actors[ref.String()]; ok {
		return a, nil
	}
	return nil, status.Error(codes.NotFound, "no actor")
}

// claims records ClaimSeed calls as volume → seed.
type claims struct {
	Driver
	got     map[string]string
	missing map[string]bool
}

func (c *claims) ClaimSeed(_ context.Context, volumeID, seedID string) error {
	if c.missing[volumeID] {
		return status.Errorf(codes.NotFound, "volume %s doesn't exist", volumeID)
	}
	c.got[volumeID] = seedID
	return nil
}

func TestClaimerClaimsTheGoldenActorsHome(t *testing.T) {
	scheme := runtime.NewScheme()
	_ = v1alpha1.AddToScheme(scheme)
	juicefs := v1alpha1.DevboxHomeJuiceFS
	rev := func(name string, phase v1alpha1.DevboxRevisionPhase, seed string) v1alpha1.DevboxRevision {
		return v1alpha1.DevboxRevision{Name: name, Phase: phase, HomeStorage: &juicefs, HomeSeed: lo.EmptyableToPtr(seed)}
	}
	runner := &v1alpha1.DevboxRunner{ObjectMeta: metav1.ObjectMeta{Name: "r"}}
	runner.Status.Atespace = lo.ToPtr("ns")
	runner.Status.Revisions = []v1alpha1.DevboxRevision{
		rev("tmpl-r4", v1alpha1.DevboxRevisionBuilding, "golden.uid-4"),
		rev("tmpl-r3", v1alpha1.DevboxRevisionBuilding, "golden.uid-3"),
		rev("tmpl-r2", v1alpha1.DevboxRevisionReady, "golden.uid-2"),
		rev("tmpl-r1", v1alpha1.DevboxRevisionBuilding, ""),
	}
	snapshotHome := runner.DeepCopy()
	snapshotHome.Name = "snapshot"
	snapshotHome.Status.Revisions = []v1alpha1.DevboxRevision{{Name: "tmpl-s1", Phase: v1alpha1.DevboxRevisionBuilding, HomeSeed: lo.ToPtr("golden.uid-s1")}}

	home := func(uid string) *ateapi.ExternalVolumes {
		return &ateapi.ExternalVolumes{Volumes: []*ateapi.ExternalVolumeStatus{{Name: Volume, StorageVolumeId: "substrate-" + uid + "-home"}}}
	}
	fa := &fakeActors{templates: map[string]*ateapi.ActorTemplate{}, actors: map[string]*ateapi.Actor{}}
	for template, uid := range map[string]string{"tmpl-r4": "uid-4", "tmpl-r3": "uid-3", "tmpl-r2": "uid-2", "tmpl-s1": "uid-s1"} {
		fa.templates["ns/"+template] = &ateapi.ActorTemplate{Metadata: &ateapi.ResourceMetadata{Uid: uid}}
	}
	// r4's golden actor is resumed and has its home; r3's isn't resumed yet; r2 is past its golden boot.
	fa.actors["ns/uid-4"] = &ateapi.Actor{Status: &ateapi.ActorStatus{ExternalVolumes: home("golden-4")}}
	fa.actors["ns/uid-3"] = &ateapi.Actor{Status: &ateapi.ActorStatus{}}
	fa.actors["ns/uid-2"] = &ateapi.Actor{Status: &ateapi.ActorStatus{ExternalVolumes: home("golden-2")}}
	fa.actors["ns/uid-s1"] = &ateapi.Actor{Status: &ateapi.ActorStatus{ExternalVolumes: home("golden-s1")}}

	driver := &claims{got: map[string]string{}}
	c := &Claimer{
		Client: fake.NewClientBuilder().WithScheme(scheme).WithObjects(runner, snapshotHome).Build(),
		Actors: fa, Drivers: map[v1alpha1.DevboxHomeStorage]Driver{v1alpha1.DevboxHomeJuiceFS: driver}, Log: logr.Discard(),
	}
	if err := c.Pass(context.Background()); err != nil {
		t.Fatal(err)
	}
	if want := map[string]string{"substrate-golden-4-home": "golden.uid-4"}; !maps.Equal(driver.got, want) {
		t.Fatalf("claims = %v, want %v", driver.got, want)
	}

	// Substrate lists r3's home before the driver created it: nothing to claim yet, and no error.
	fa.actors["ns/uid-3"].Status.ExternalVolumes = home("golden-3")
	driver.missing = map[string]bool{"substrate-golden-3-home": true}
	delete(driver.got, "substrate-golden-4-home")
	if err := c.Pass(context.Background()); err != nil {
		t.Fatal(err)
	}
	if len(driver.got) != 0 {
		t.Fatalf("claims = %v, want none before the home exists", driver.got)
	}
	driver.missing = nil
	if err := c.Pass(context.Background()); err != nil {
		t.Fatal(err)
	}
	if want := map[string]string{"substrate-golden-3-home": "golden.uid-3"}; !maps.Equal(driver.got, want) {
		t.Fatalf("claims of the third pass = %v, want only the newly resumed golden actor's %v", driver.got, want)
	}
}
