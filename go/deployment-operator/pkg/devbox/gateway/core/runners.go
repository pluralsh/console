package core

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"sync"
	"time"

	"google.golang.org/protobuf/types/known/durationpb"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/egress"
)

// Runner is what the gateway needs from a DevboxRunner.
type Runner struct {
	Name     string
	Atespace string
	// ConsoleID is the runner's console Devbox (status.id), which golden boots fetch credentials as.
	ConsoleID string
	// Template, Revision and GoldenTag describe the revision new instances start from.
	Template    string
	Revision    int64
	GoldenTag   string
	ImageDigest string
	// DaemonVersion is the devbox-daemon of Revision's runtime sidecar; empty when the daemon is the image's own.
	DaemonVersion string
	// Home is the current revision's home volume.
	Home Home
	// Revisions maps every revision that still exists to its template and golden tag.
	Revisions map[int64]RunnerRevision
	// UpdateOnResume is the runner's instance update policy: a suspended instance behind Revision moves to it
	// when it is resumed.
	UpdateOnResume bool

	AllowedRepositories []string
	// Repositories are the URLs golden boots preclone; instances refetch them on boot.
	Repositories       []string
	HTTPAllowlist      []egress.AllowEntry
	CloudIdentities    []*devboxv1.CloudIdentity
	CloudIdentityHosts []string
	IdlePolicy         *devboxv1.IdlePolicy
	Autonomy           *devboxv1.AutonomyPolicy
	// Env is the runner's resolved secret env vars, sent with every Initialize.
	Env map[string]string
}

type RunnerRevision struct {
	Template  string
	GoldenTag string
	Home      Home
}

// Home is a revision's home volume: a durable dir in the instance's snapshots (Storage Snapshot), or an external
// volume of a StorageClass.
type Home struct {
	Storage v1alpha1.DevboxHomeStorage
	// Class and Bytes are an external home's StorageClass and capacity. Class is empty for revisions from before
	// the runner-wide class, which had a class of their own.
	Class string
	Bytes int64
	// Seed is the seed of the revision's golden home, which new instances' homes are cloned from.
	Seed string
}

// sameVolume reports whether Substrate sees the two homes as the same template volume, which it requires to move
// an actor between templates.
func (h Home) sameVolume(o Home) bool {
	if !h.Storage.External() && !o.Storage.External() {
		return true
	}
	return h.Storage == o.Storage && h.Class != "" && h.Class == o.Class && h.Bytes == o.Bytes
}

// revisionTarget is a revision an instance can be moved to.
type revisionTarget struct {
	revision      int64
	template      string
	imageDigest   string
	daemonVersion string
	home          Home
}

// errHomeNotMovable is moving an instance to a revision whose home is another volume than the instance's: another
// storage, StorageClass or size, or a revision from before external homes had one class for every revision.
// Substrate refuses to move an actor to a template with other volumes.
var errHomeNotMovable = errors.New("its home volume differs between the revisions (storage, StorageClass or size), so it can't move; create a new instance to use the new revision")

// movable reports whether an instance on revision from can move to to: Substrate only moves an actor between
// templates with the same volumes.
func (r *Runner) movable(from int64, to revisionTarget) error {
	if !r.Revisions[from].Home.sameVolume(to.home) {
		return errHomeNotMovable
	}
	return nil
}

// target resolves the revision instances move to, which is the runner's current one; revision is zero or names
// it. A newer revision hasn't passed its probe, and an older one would undo an update (and the onResume policy
// would move the instance forward again).
func (r *Runner) target(revision int64) (revisionTarget, error) {
	if r.Revision == 0 || r.Template == "" {
		return revisionTarget{}, fmt.Errorf("%w: %s", ErrRunnerNotReady, r.Name)
	}
	if revision != 0 && revision != r.Revision {
		return revisionTarget{}, fmt.Errorf("devbox runner %s serves revision %d, instances can't be moved to revision %d", r.Name, r.Revision, revision)
	}
	return revisionTarget{revision: r.Revision, template: r.Template, imageDigest: r.ImageDigest, daemonVersion: r.DaemonVersion,
		home: r.Home}, nil
}

// ErrRunnerNotReady means the runner has no ready revision to start instances from.
var ErrRunnerNotReady = errors.New("devbox runner has no ready revision")

// Runners looks up DevboxRunners by name.
type Runners interface {
	Get(ctx context.Context, name string) (*Runner, error)
}

// StaticRunners serves fixed runners (tests and local development).
type StaticRunners map[string]*Runner

func (s StaticRunners) Get(_ context.Context, name string) (*Runner, error) {
	if r, ok := s[name]; ok {
		return r, nil
	}
	return nil, fmt.Errorf("devbox runner %q not found", name)
}

func (s StaticRunners) ByAtespace(_ context.Context, atespace string) (*Runner, error) {
	for _, r := range s {
		if r.Atespace == atespace {
			return r, nil
		}
	}
	return nil, nil
}

// KubeRunners reads DevboxRunners (cluster-scoped) with a short cache.
type KubeRunners struct {
	Client client.Reader
	// Namespace holds v1alpha1.DevboxRunnerEnvSecret; empty disables secret env.
	Namespace string
	TTL       time.Duration

	mu    sync.Mutex
	cache map[string]cachedRunner
	// atespaces maps atespaces to runner names as of listedAt.
	atespaces map[string]string
	listedAt  time.Time
}

type cachedRunner struct {
	runner *Runner
	at     time.Time
}

func (k *KubeRunners) ttl() time.Duration {
	if k.TTL <= 0 {
		return 15 * time.Second
	}
	return k.TTL
}

func (k *KubeRunners) Get(ctx context.Context, name string) (*Runner, error) {
	ttl := k.ttl()
	k.mu.Lock()
	if c, ok := k.cache[name]; ok && time.Since(c.at) < ttl {
		k.mu.Unlock()
		return c.runner, nil
	}
	k.mu.Unlock()

	obj := &v1alpha1.DevboxRunner{}
	if err := k.Client.Get(ctx, client.ObjectKey{Name: name}, obj); err != nil {
		return nil, fmt.Errorf("reading devbox runner %s: %w", name, err)
	}
	r := RunnerFromCRD(obj)
	if obj.Spec.SecretEnv() && k.Namespace != "" {
		env, err := k.secretEnv(ctx, name)
		if err != nil {
			return nil, err
		}
		r.Env = env
	}
	k.mu.Lock()
	if k.cache == nil {
		k.cache = map[string]cachedRunner{}
	}
	k.cache[name] = cachedRunner{runner: r, at: time.Now()}
	k.mu.Unlock()
	return r, nil
}

// secretEnv reads the runner's entry from the controller's mirror Secret. A missing Secret or entry means the
// controller hasn't resolved it (or couldn't, which it reports on the runner's Env condition).
func (k *KubeRunners) secretEnv(ctx context.Context, runner string) (map[string]string, error) {
	secret := &corev1.Secret{}
	if err := k.Client.Get(ctx, client.ObjectKey{Namespace: k.Namespace, Name: v1alpha1.DevboxRunnerEnvSecret}, secret); err != nil {
		if apierrors.IsNotFound(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("reading env for devbox runner %s: %w", runner, err)
	}
	raw, ok := secret.Data[runner]
	if !ok {
		return nil, nil
	}
	env := map[string]string{}
	if err := json.Unmarshal(raw, &env); err != nil {
		return nil, fmt.Errorf("decoding env for devbox runner %s: %w", runner, err)
	}
	return env, nil
}

// ByAtespace returns the runner whose templates and actors live in atespace, or nil when none does. Runners are
// relisted at most once per TTL, so actors outside any runner's atespace don't each cost a list.
func (k *KubeRunners) ByAtespace(ctx context.Context, atespace string) (*Runner, error) {
	k.mu.Lock()
	name, ok := k.atespaces[atespace]
	stale := time.Since(k.listedAt) >= k.ttl()
	k.mu.Unlock()
	if !ok && stale {
		list := &v1alpha1.DevboxRunnerList{}
		if err := k.Client.List(ctx, list); err != nil {
			return nil, fmt.Errorf("listing devbox runners: %w", err)
		}
		atespaces := map[string]string{}
		for _, obj := range list.Items {
			if a := deref(obj.Status.Atespace); a != "" {
				atespaces[a] = obj.Name
			}
		}
		k.mu.Lock()
		k.atespaces, k.listedAt = atespaces, time.Now()
		k.mu.Unlock()
		name, ok = atespaces[atespace]
	}
	if !ok {
		return nil, nil
	}
	r, err := k.Get(ctx, name)
	if err != nil {
		if apierrors.IsNotFound(errors.Unwrap(err)) {
			return nil, nil
		}
		return nil, err
	}
	if r.Atespace != atespace {
		return nil, nil
	}
	return r, nil
}

// Invalidate drops a cached runner.
func (k *KubeRunners) Invalidate(name string) {
	k.mu.Lock()
	defer k.mu.Unlock()
	delete(k.cache, name)
}

// RunnerFromCRD converts a DevboxRunner.
func RunnerFromCRD(obj *v1alpha1.DevboxRunner) *Runner {
	st := obj.Status
	r := &Runner{
		Name:                obj.Name,
		Atespace:            deref(st.Atespace),
		ConsoleID:           deref(st.ID),
		Template:            deref(st.TemplateName),
		ImageDigest:         digestOf(deref(st.ResolvedImage)),
		Revisions:           map[int64]RunnerRevision{},
		AllowedRepositories: obj.Spec.AllowedRepositories,
		UpdateOnResume:      obj.InstanceUpdateMode() == v1alpha1.DevboxInstanceUpdateOnResume,
	}
	if st.TemplateRevision != nil {
		r.Revision = *st.TemplateRevision
	}
	for _, rev := range st.Revisions {
		home := homeOf(rev)
		r.Revisions[rev.Revision] = RunnerRevision{Template: rev.Name, GoldenTag: deref(rev.GoldenTag), Home: home}
		if rev.Revision == r.Revision {
			r.GoldenTag = deref(rev.GoldenTag)
			r.DaemonVersion = deref(rev.DaemonVersion)
			r.Home = home
			if r.Template == "" {
				r.Template = rev.Name
			}
			if d := digestOf(rev.Image); d != "" {
				r.ImageDigest = d
			}
		}
	}
	for _, repo := range obj.Spec.Repositories {
		r.Repositories = append(r.Repositories, repo.URL)
	}
	for _, e := range obj.Spec.HTTPAllowlist {
		entry := egress.AllowEntry{Host: e.Host}
		if e.Port != nil {
			entry.Port = *e.Port
		}
		if e.Passthrough != nil {
			entry.Passthrough = *e.Passthrough
		}
		r.HTTPAllowlist = append(r.HTTPAllowlist, entry)
	}
	for _, h := range obj.Spec.EgressPresetHosts() {
		r.HTTPAllowlist = append(r.HTTPAllowlist, egress.AllowEntry{Host: h, Port: 443})
	}
	for _, ci := range obj.Spec.CloudIdentities {
		id := &devboxv1.CloudIdentity{Name: ci.Name, IsDefault: ci.Default != nil && *ci.Default}
		switch {
		case ci.AWS != nil:
			aws := &devboxv1.AwsIdentity{RoleArn: ci.AWS.RoleArn, SessionPolicy: deref(ci.AWS.SessionPolicy)}
			if ci.AWS.DurationSeconds != nil {
				aws.DurationSeconds = *ci.AWS.DurationSeconds
			}
			id.Cloud = &devboxv1.CloudIdentity_Aws{Aws: aws}
			r.CloudIdentityHosts = append(r.CloudIdentityHosts, "sts.amazonaws.com")
		case ci.GCP != nil:
			id.Cloud = &devboxv1.CloudIdentity_Gcp{Gcp: &devboxv1.GcpIdentity{WorkloadIdentityProvider: ci.GCP.WorkloadIdentityProvider, ServiceAccount: ci.GCP.ServiceAccount}}
			r.CloudIdentityHosts = append(r.CloudIdentityHosts, "sts.googleapis.com", "iamcredentials.googleapis.com")
		case ci.Azure != nil:
			id.Cloud = &devboxv1.CloudIdentity_Azure{Azure: &devboxv1.AzureIdentity{TenantId: ci.Azure.TenantID, ClientId: ci.Azure.ClientID}}
			r.CloudIdentityHosts = append(r.CloudIdentityHosts, "login.microsoftonline.com")
		}
		r.CloudIdentityHosts = append(r.CloudIdentityHosts, ci.ExtraHosts...)
		r.CloudIdentities = append(r.CloudIdentities, id)
	}
	if p := obj.Spec.IdlePolicy; p != nil {
		ip := &devboxv1.IdlePolicy{}
		if p.ActivityWindow != nil {
			ip.ActivityWindow = durationpb.New(p.ActivityWindow.Duration)
		}
		if p.GracePeriod != nil {
			ip.GracePeriod = durationpb.New(p.GracePeriod.Duration)
		}
		if p.MaxDeferral != nil {
			ip.MaxDeferral = durationpb.New(p.MaxDeferral.Duration)
		}
		if p.MaxContinuousAwake != nil {
			ip.MaxContinuousAwake = durationpb.New(p.MaxContinuousAwake.Duration)
		}
		if p.CompleteAfter != nil {
			ip.CompleteAfter = durationpb.New(p.CompleteAfter.Duration)
		}
		if p.CPUThreshold != nil {
			if v, err := strconv.ParseFloat(strings.TrimSuffix(*p.CPUThreshold, "%"), 64); err == nil {
				ip.CpuThresholdPercent = v
			}
		}
		r.IdlePolicy = ip
	}
	def, maxLevel := obj.Spec.AutonomyPolicy()
	r.Autonomy = &devboxv1.AutonomyPolicy{Default: AutonomyOf(def), Max: AutonomyOf(maxLevel)}
	return r
}

// AutonomyOf converts a CRD autonomy level.
func AutonomyOf(l v1alpha1.DevboxAutonomyLevel) devboxv1.Autonomy {
	switch l {
	case v1alpha1.DevboxAutonomyManual:
		return devboxv1.Autonomy_AUTONOMY_MANUAL
	case v1alpha1.DevboxAutonomyFull:
		return devboxv1.Autonomy_AUTONOMY_FULL
	default:
		return devboxv1.Autonomy_AUTONOMY_AUTO
	}
}

func deref[T any](p *T) T {
	var zero T
	if p == nil {
		return zero
	}
	return *p
}

func digestOf(image string) string {
	if _, d, ok := strings.Cut(image, "@"); ok {
		return d
	}
	return ""
}

func homeOf(rev v1alpha1.DevboxRevision) Home {
	h := Home{Storage: deref(rev.HomeStorage), Class: deref(rev.HomeStorageClass), Seed: deref(rev.HomeSeed)}
	if rev.HomeSize != nil {
		h.Bytes = rev.HomeSize.Value()
	}
	return h
}
