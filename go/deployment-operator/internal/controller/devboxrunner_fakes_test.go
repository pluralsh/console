package controller

import (
	"context"
	"fmt"
	"sync"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/proto"
	"k8s.io/apimachinery/pkg/util/uuid"

	console "github.com/pluralsh/console/go/client"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/probe"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
)

// fakeSubstrate is an in-memory Control API keyed by atespace and name.
type fakeSubstrate struct {
	mu        sync.Mutex
	atespaces map[string]bool
	policies  map[string]map[string][]string
	templates map[string]map[string]*ateapi.ActorTemplate
	actors    map[string]map[string]*ateapi.Actor
	tags      map[string]map[string]*ateapi.Tag
	previews  map[string]bool
	workers   map[string]*ateapi.Worker
	// placeOnDrain is an actor count a worker gains as it is drained, as if a placement raced the drain.
	placeOnDrain map[string]int32
}

var _ substrate.API = &fakeSubstrate{}

// For makes the fake its own SubstrateClients, handing every runner the same API.
func (f *fakeSubstrate) For(context.Context, *v1alpha1.DevboxRunner) (substrate.API, error) {
	return f, nil
}

func newFakeSubstrate() *fakeSubstrate {
	return &fakeSubstrate{
		atespaces: map[string]bool{},
		policies:  map[string]map[string][]string{},
		templates: map[string]map[string]*ateapi.ActorTemplate{},
		actors:    map[string]map[string]*ateapi.Actor{},
		tags:      map[string]map[string]*ateapi.Tag{},
		previews:  map[string]bool{},
		workers:   map[string]*ateapi.Worker{},

		placeOnDrain: map[string]int32{},
	}
}

func (f *fakeSubstrate) ListWorkers(context.Context) ([]*ateapi.Worker, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := make([]*ateapi.Worker, 0, len(f.workers))
	for _, w := range f.workers {
		out = append(out, proto.Clone(w).(*ateapi.Worker))
	}
	return out, nil
}

func (f *fakeSubstrate) DrainWorker(_ context.Context, name string) (*ateapi.Worker, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	w, ok := f.workers[name]
	if !ok {
		return nil, notFound()
	}
	w.Status.State = ateapi.WorkerState_WORKER_STATE_DRAINING
	w.Status.Allocated.Actors += f.placeOnDrain[name]
	return proto.Clone(w).(*ateapi.Worker), nil
}

func notFound() error { return status.Error(codes.NotFound, "not found") }

func (f *fakeSubstrate) EnsureAtespace(_ context.Context, name string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.atespaces[name] = true
	return nil
}

func (f *fakeSubstrate) DeleteAtespace(_ context.Context, name string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	delete(f.atespaces, name)
	return nil
}

func (f *fakeSubstrate) EnsureAtespaceAccessPolicy(_ context.Context, atespace, role string, members ...string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.policies[atespace] == nil {
		f.policies[atespace] = map[string][]string{}
	}
	f.policies[atespace][role] = append(f.policies[atespace][role], members...)
	return nil
}

func (f *fakeSubstrate) CreateActorTemplate(_ context.Context, t *ateapi.ActorTemplate, preview bool) (*ateapi.ActorTemplate, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	ns, name := t.GetMetadata().GetAtespace(), t.GetMetadata().GetName()
	if existing, ok := f.templates[ns][name]; ok {
		return proto.Clone(existing).(*ateapi.ActorTemplate), nil
	}
	created := proto.Clone(t).(*ateapi.ActorTemplate)
	created.Metadata.Uid = string(uuid.NewUUID())
	if f.templates[ns] == nil {
		f.templates[ns] = map[string]*ateapi.ActorTemplate{}
	}
	f.templates[ns][name] = created
	f.previews[name] = preview
	return proto.Clone(created).(*ateapi.ActorTemplate), nil
}

func (f *fakeSubstrate) GetActorTemplate(_ context.Context, atespace, name string) (*ateapi.ActorTemplate, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	t, ok := f.templates[atespace][name]
	if !ok {
		return nil, notFound()
	}
	return proto.Clone(t).(*ateapi.ActorTemplate), nil
}

func (f *fakeSubstrate) ListActorTemplates(_ context.Context, atespace string) ([]*ateapi.ActorTemplate, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	var out []*ateapi.ActorTemplate
	for _, t := range f.templates[atespace] {
		out = append(out, proto.Clone(t).(*ateapi.ActorTemplate))
	}
	return out, nil
}

func (f *fakeSubstrate) DeleteActorTemplate(_ context.Context, atespace, name string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if t, ok := f.templates[atespace][name]; ok {
		delete(f.actors[atespace], t.GetMetadata().GetUid())
	}
	delete(f.templates[atespace], name)
	return nil
}

func (f *fakeSubstrate) ListActors(_ context.Context, atespace string) ([]*ateapi.Actor, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	var out []*ateapi.Actor
	for _, a := range f.actors[atespace] {
		out = append(out, proto.Clone(a).(*ateapi.Actor))
	}
	return out, nil
}

func (f *fakeSubstrate) DeleteActor(_ context.Context, atespace, name string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	delete(f.actors[atespace], name)
	return nil
}

func (f *fakeSubstrate) ListTags(_ context.Context, atespace string) ([]*ateapi.Tag, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	var out []*ateapi.Tag
	for _, t := range f.tags[atespace] {
		out = append(out, proto.Clone(t).(*ateapi.Tag))
	}
	return out, nil
}

func (f *fakeSubstrate) DeleteTag(_ context.Context, atespace, name string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	delete(f.tags[atespace], name)
	return nil
}

// finishGoldenBoot plays Substrate's template controller: it records the golden tag on the template.
func (f *fakeSubstrate) failGoldenBoot(atespace, template, msg string) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.templates[atespace][template].Status = &ateapi.ActorTemplateStatus{GoldenSnapshotStatus: &ateapi.GoldenSnapshotStatus{ErrorMessage: msg}}
}

func (f *fakeSubstrate) finishGoldenBoot(atespace, template string) string {
	f.mu.Lock()
	defer f.mu.Unlock()
	tag := template + "-golden"
	t := f.templates[atespace][template]
	t.Status = &ateapi.ActorTemplateStatus{GoldenSnapshotStatus: &ateapi.GoldenSnapshotStatus{GoldenTag: &ateapi.ObjectRef{Atespace: atespace, Name: tag}}}
	if f.tags[atespace] == nil {
		f.tags[atespace] = map[string]*ateapi.Tag{}
	}
	f.tags[atespace][tag] = &ateapi.Tag{
		Metadata: &ateapi.ResourceMetadata{Atespace: atespace, Name: tag},
		Status:   &ateapi.TagStatus{ActorTemplateUid: t.GetMetadata().GetUid()},
	}
	return tag
}

func (f *fakeSubstrate) addActor(atespace, name, template string, state ateapi.ActorState) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.actors[atespace] == nil {
		f.actors[atespace] = map[string]*ateapi.Actor{}
	}
	f.actors[atespace][name] = &ateapi.Actor{
		Metadata:      &ateapi.ResourceMetadata{Atespace: atespace, Name: name},
		ActorTemplate: &ateapi.ObjectRef{Atespace: atespace, Name: template},
		Status:        &ateapi.ActorStatus{State: state},
	}
}

func (f *fakeSubstrate) template(atespace, name string) *ateapi.ActorTemplate {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.templates[atespace][name]
}

func (f *fakeSubstrate) hasAtespace(name string) bool {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.atespaces[name]
}

// fakeDevboxConsole records calls to the console API.
type fakeDevboxConsole struct {
	mu              sync.Mutex
	devboxes        map[string]*console.DevboxFragment
	upserts         []console.DevboxAttributes
	heartbeats      []console.DevboxHeartbeatAttributes
	deleted         []string
	snapshotsRemain bool
	mints           []string
	tokenTTL        time.Duration
}

var _ DevboxConsoleClient = &fakeDevboxConsole{}

func newFakeDevboxConsole() *fakeDevboxConsole {
	return &fakeDevboxConsole{devboxes: map[string]*console.DevboxFragment{}}
}

func (f *fakeDevboxConsole) UpsertDevbox(_ context.Context, attrs console.DevboxAttributes) (*console.DevboxFragment, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.upserts = append(f.upserts, attrs)
	d, ok := f.devboxes[attrs.Name]
	if !ok {
		d = &console.DevboxFragment{ID: string(uuid.NewUUID()), Name: attrs.Name}
		f.devboxes[attrs.Name] = d
	}
	d.TemplateRevision = attrs.TemplateRevision
	d.ResolvedImage = attrs.ResolvedImage
	return d, nil
}

func (f *fakeDevboxConsole) HeartbeatDevbox(_ context.Context, _ string, attrs console.DevboxHeartbeatAttributes) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.heartbeats = append(f.heartbeats, attrs)
	return nil
}

func (f *fakeDevboxConsole) GetDevboxByName(_ context.Context, name string) (*console.DevboxFragment, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.devboxes[name], nil
}

func (f *fakeDevboxConsole) DeleteDevbox(_ context.Context, id string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.snapshotsRemain {
		return ErrDevboxSnapshotsRemain
	}
	f.deleted = append(f.deleted, id)
	for name, d := range f.devboxes {
		if d.ID == id {
			delete(f.devboxes, name)
		}
	}
	return nil
}

var _ DevboxProbeTokenMinter = &fakeDevboxConsole{}

func (f *fakeDevboxConsole) MintDevboxProbeToken(_ context.Context, devboxID string) (probe.Token, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.mints = append(f.mints, devboxID)
	ttl := f.tokenTTL
	if ttl == 0 {
		ttl = time.Hour
	}
	return probe.Token{Token: fmt.Sprintf("probe-%s-%d", devboxID, len(f.mints)), ExpiresAt: time.Now().Add(ttl)}, nil
}

func (f *fakeDevboxConsole) mintCount() int {
	f.mu.Lock()
	defer f.mu.Unlock()
	return len(f.mints)
}

func (f *fakeDevboxConsole) lastUpsert(name string) *console.DevboxAttributes {
	f.mu.Lock()
	defer f.mu.Unlock()
	for i := len(f.upserts) - 1; i >= 0; i-- {
		if f.upserts[i].Name == name {
			return &f.upserts[i]
		}
	}
	return nil
}

func (f *fakeDevboxConsole) lastHeartbeat() *console.DevboxHeartbeatAttributes {
	f.mu.Lock()
	defer f.mu.Unlock()
	if len(f.heartbeats) == 0 {
		return nil
	}
	return &f.heartbeats[len(f.heartbeats)-1]
}
