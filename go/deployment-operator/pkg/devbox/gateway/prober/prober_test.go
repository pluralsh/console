package prober

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/go-logr/logr"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/encoding/protojson"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/actors"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/actors/actorstest"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/egress"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/probe"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
)

const (
	ns       = "plrl-deploy-operator"
	atespace = "devbox-platform-abc"
)

type fakeDaemon struct {
	devboxv1.DaemonClient
	p *probeFixture
}

func (d fakeDaemon) Health(context.Context, *devboxv1.HealthRequest, ...grpc.CallOption) (*devboxv1.HealthResponse, error) {
	return &devboxv1.HealthResponse{Status: "booting"}, nil
}

func (d fakeDaemon) ProbeAgents(ctx context.Context, in *devboxv1.ProbeAgentsRequest, _ ...grpc.CallOption) (*devboxv1.ProbeAgentsResponse, error) {
	d.p.mu.Lock()
	d.p.probeReqs = append(d.p.probeReqs, in)
	d.p.mu.Unlock()
	// Egress resolves the probe actor while it runs.
	info, err := d.p.prober.ResolveActor(ctx, atespace+"/"+d.p.cmName)
	if err != nil || info.InstanceID != InstanceID(d.p.cmName) {
		return nil, status.Errorf(codes.Internal, "probe actor not resolvable: %v %v", info, err)
	}
	out := &devboxv1.ProbeAgentsResponse{}
	for _, a := range in.GetAgents() {
		out.Agents = append(out.Agents, &devboxv1.AgentCatalogEntry{Type: a.GetType(), ProbeStatus: devboxv1.ProbeStatus_PROBE_STATUS_OK})
	}
	return out, nil
}

type fakeCreds struct {
	mu          sync.Mutex
	static      map[string]string
	invalidated []string
}

func (c *fakeCreds) SetStaticCredential(instanceID, kind, token string, _ time.Time) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.static[instanceID+"/"+kind] = token
	return nil
}

func (c *fakeCreds) Invalidate(instanceID string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.invalidated = append(c.invalidated, instanceID)
}

type probeFixture struct {
	mu        sync.Mutex
	client    client.WithWatch
	substrate *actorstest.Server
	creds     *fakeCreds
	prober    *Prober
	cmName    string
	probeReqs []*devboxv1.ProbeAgentsRequest
}

func newProbeFixture(t *testing.T, holder string, objs ...client.Object) *probeFixture {
	t.Helper()
	scheme := runtime.NewScheme()
	if err := corev1.AddToScheme(scheme); err != nil {
		t.Fatal(err)
	}
	f := &probeFixture{
		client:    fake.NewClientBuilder().WithScheme(scheme).WithObjects(objs...).Build(),
		substrate: actorstest.New(),
		creds:     &fakeCreds{static: map[string]string{}},
		cmName:    probe.ConfigMapName("platform", 1),
	}
	p, err := New(Config{
		Namespace:  ns,
		Holder:     holder,
		ConsoleURL: "https://console.example.com",
		AIProxyURL: "https://console.example.com/ext/v1/ai",
		RetryDelay: time.Millisecond,
		Resync:     50 * time.Millisecond,
	}, Deps{
		Client:      f.client,
		Actors:      actors.New(ateapi.NewControlClient(f.substrate.Dial(t))).WithPollInterval(time.Millisecond),
		Daemons:     daemons{f},
		Credentials: f.creds,
		Log:         logr.Discard(),
	})
	if err != nil {
		t.Fatal(err)
	}
	f.prober = p
	return f
}

type daemons struct{ f *probeFixture }

func (d daemons) Daemon(string) devboxv1.DaemonClient { return fakeDaemon{p: d.f} }

func (f *probeFixture) run(t *testing.T) {
	t.Helper()
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() {
		_ = f.prober.Run(ctx)
		close(done)
	}()
	t.Cleanup(func() {
		cancel()
		<-done
	})
}

func (f *probeFixture) get(t *testing.T) *corev1.ConfigMap {
	t.Helper()
	cm := &corev1.ConfigMap{}
	if err := f.client.Get(context.Background(), client.ObjectKey{Name: f.cmName, Namespace: ns}, cm); err != nil {
		t.Fatal(err)
	}
	return cm
}

func (f *probeFixture) waitState(t *testing.T) *corev1.ConfigMap {
	t.Helper()
	deadline := time.Now().Add(10 * time.Second)
	for time.Now().Before(deadline) {
		if cm := f.get(t); cm.Annotations[probe.StateAnnotation] != "" {
			return cm
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatal("probe request never finished")
	return nil
}

func requestObjects(t *testing.T, annotations map[string]string) []client.Object {
	t.Helper()
	name := probe.ConfigMapName("platform", 1)
	spec, _ := protojson.Marshal(&devboxv1.ProbeAgentsRequest{Agents: []*devboxv1.AgentProbeSpec{{Type: devboxv1.AgentType_AGENT_TYPE_CLAUDE, IsDefault: true}}})
	req, _ := json.Marshal(probe.Request{
		Runner: "platform", Atespace: atespace, ActorTemplate: "platform-r1", Revision: 1,
		GoldenTag: "platform-r1-golden", DevboxID: "box-1", Probe: spec,
		TokenSecret: &probe.TokenRef{Name: probe.TokenSecretName, Key: name},
	})
	tok, _ := json.Marshal(probe.Token{Token: "plrl-dbx-probe", ExpiresAt: time.Now().Add(time.Hour)})
	return []client.Object{
		&corev1.ConfigMap{
			ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: ns, Annotations: annotations,
				Labels: map[string]string{probe.Label: probe.LabelRequest, probe.RunnerLabel: "platform", probe.RevisionLabel: "1"}},
			Data: map[string]string{probe.RequestKey: string(req)},
		},
		&corev1.Secret{ObjectMeta: metav1.ObjectMeta{Name: probe.TokenSecretName, Namespace: ns}, Data: map[string][]byte{name: tok}},
	}
}

func TestProberRunsRequestAndWritesResult(t *testing.T) {
	f := newProbeFixture(t, "gw-0", requestObjects(t, nil)...)
	f.run(t)
	cm := f.waitState(t)

	if cm.Annotations[probe.StateAnnotation] != probe.StateDone {
		t.Fatalf("state %q, error %q", cm.Annotations[probe.StateAnnotation], cm.Data[probe.ErrorKey])
	}
	res := &devboxv1.ProbeAgentsResponse{}
	if err := protojson.Unmarshal([]byte(cm.Data[probe.ResultKey]), res); err != nil || len(res.GetAgents()) != 1 {
		t.Fatalf("result %q: %v", cm.Data[probe.ResultKey], err)
	}
	if holder, _, ok := probe.ParseClaim(cm.Annotations[probe.ClaimAnnotation]); !ok || holder != "gw-0" {
		t.Fatalf("claim %q", cm.Annotations[probe.ClaimAnnotation])
	}

	f.mu.Lock()
	reqs := f.probeReqs
	f.mu.Unlock()
	if len(reqs) != 1 || reqs[0].GetEndpoints().GetAiProxyUrl() != "https://console.example.com/ext/v1/ai" || len(reqs[0].GetAgents()) != 1 {
		t.Fatalf("ProbeAgents requests: %v", reqs)
	}
	id := InstanceID(f.cmName)
	f.creds.mu.Lock()
	tok, invalidated := f.creds.static[id+"/"+egress.KindAIProxy], f.creds.invalidated
	f.creds.mu.Unlock()
	if tok != "plrl-dbx-probe" || len(invalidated) != 1 || invalidated[0] != id {
		t.Fatalf("static credential %q, invalidated %v", tok, invalidated)
	}

	calls := strings.Join(f.substrate.CallsSnapshot(), "\n")
	for _, want := range []string{"CreateActor " + atespace + "/" + f.cmName, "CreateActorEgressPolicy", "ResumeActor", "DeleteActor " + atespace + "/" + f.cmName} {
		if !strings.Contains(calls, want) {
			t.Errorf("Substrate calls miss %q:\n%s", want, calls)
		}
	}
	if f.substrate.State(atespace, f.cmName) != ateapi.ActorState_ACTOR_STATE_UNSPECIFIED {
		t.Error("the probe actor must be deleted")
	}
	if _, err := f.prober.ResolveActor(context.Background(), atespace+"/"+f.cmName); !errors.Is(err, egress.ErrUnknownActor) {
		t.Errorf("finished probe actors must not resolve: %v", err)
	}
}

func TestProberAppliesAIProxyOnlyPolicy(t *testing.T) {
	f := newProbeFixture(t, "gw-0", requestObjects(t, nil)...)
	var policy *ateapi.EgressPolicy
	f.prober.deps.Actors = recordPolicy{Actors: f.prober.deps.Actors, got: &policy}
	f.run(t)
	f.waitState(t)

	rules := policy.GetRules()
	if len(rules) != 1 {
		t.Fatalf("want one rule, got %v", rules)
	}
	https := rules[0].GetHttps()
	if https == nil || len(https.GetHostnames()) != 1 || https.GetHostnames()[0] != "console.example.com" {
		t.Fatalf("rule %v", rules[0])
	}
	if !strings.Contains(rules[0].String(), egress.SecretURI(InstanceID(f.cmName), egress.KindAIProxy, "")) {
		t.Fatalf("the AI proxy rule must inject the probe token: %v", rules[0])
	}
}

type recordPolicy struct {
	Actors
	got **ateapi.EgressPolicy
}

func (r recordPolicy) ApplyEgressPolicy(ctx context.Context, ref actors.Ref, rules []*ateapi.EgressRule) error {
	*r.got = &ateapi.EgressPolicy{Rules: rules}
	return r.Actors.ApplyEgressPolicy(ctx, ref, rules)
}

func TestProberRespectsLiveClaimsAndTakesOverStaleOnes(t *testing.T) {
	live := probe.Claim("gw-other", time.Now())
	f := newProbeFixture(t, "gw-0", requestObjects(t, map[string]string{probe.ClaimAnnotation: live})...)
	f.run(t)
	time.Sleep(200 * time.Millisecond)
	if cm := f.get(t); cm.Annotations[probe.StateAnnotation] != "" || cm.Annotations[probe.ClaimAnnotation] != live {
		t.Fatalf("a live claim of another replica must be left alone: %v", cm.Annotations)
	}

	stale := probe.Claim("gw-dead", time.Now().Add(-probe.ClaimTTL-time.Minute))
	f2 := newProbeFixture(t, "gw-0", requestObjects(t, map[string]string{probe.ClaimAnnotation: stale})...)
	f2.run(t)
	if cm := f2.waitState(t); cm.Annotations[probe.StateAnnotation] != probe.StateDone {
		t.Fatalf("an abandoned claim should be taken over: %v", cm.Annotations)
	}
}

func TestProberFailsAfterRetries(t *testing.T) {
	f := newProbeFixture(t, "gw-0", requestObjects(t, nil)...)
	f.substrate.FailResume = status.Error(codes.Unavailable, "no workers")
	f.run(t)
	cm := f.waitState(t)
	if cm.Annotations[probe.StateAnnotation] != probe.StateFailed || !strings.Contains(cm.Data[probe.ErrorKey], "no workers") {
		t.Fatalf("state %q error %q", cm.Annotations[probe.StateAnnotation], cm.Data[probe.ErrorKey])
	}
	resumes := 0
	for _, c := range f.substrate.CallsSnapshot() {
		if strings.HasPrefix(c, "ResumeActor") {
			resumes++
		}
	}
	if resumes != defaultAttempts {
		t.Fatalf("want %d attempts, got %d", defaultAttempts, resumes)
	}
}

func TestProberFailsWithoutRetryOnBadRequest(t *testing.T) {
	objs := requestObjects(t, nil)
	cm := objs[0].(*corev1.ConfigMap)
	cm.Data[probe.RequestKey] = `{"runner":"platform"}`
	f := newProbeFixture(t, "gw-0", objs...)
	f.run(t)
	got := f.waitState(t)
	if got.Annotations[probe.StateAnnotation] != probe.StateFailed || !strings.Contains(got.Data[probe.ErrorKey], "golden tag") {
		t.Fatalf("state %q error %q", got.Annotations[probe.StateAnnotation], got.Data[probe.ErrorKey])
	}
	if calls := f.substrate.CallsSnapshot(); len(calls) != 0 {
		t.Fatalf("a bad request must not reach Substrate: %v", calls)
	}
}

type staticResolver map[string]*egress.InstanceInfo

func (s staticResolver) ResolveActor(_ context.Context, id string) (*egress.InstanceInfo, error) {
	if info, ok := s[id]; ok {
		return info, nil
	}
	return nil, egress.ErrUnknownActor
}

func TestChain(t *testing.T) {
	c := Chain(staticResolver{"a/1": {InstanceID: "probe"}}, staticResolver{"a/2": {InstanceID: "inst"}})
	for id, want := range map[string]string{"a/1": "probe", "a/2": "inst"} {
		info, err := c.ResolveActor(context.Background(), id)
		if err != nil || info.InstanceID != want {
			t.Fatalf("%s: %v %v", id, info, err)
		}
	}
	if _, err := c.ResolveActor(context.Background(), "a/3"); !errors.Is(err, egress.ErrUnknownActor) {
		t.Fatalf("unknown actor: %v", err)
	}
}
