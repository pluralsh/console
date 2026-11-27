// Package prober is the gateway half of the agent probe handoff (pkg/devbox/probe): it watches the operator's
// probe request ConfigMaps, runs each probe in an actor resumed from the revision's golden tag and writes the
// result back.
//
// The probe actor is a pseudo-instance: it isn't a console instance, so its only credential is the box-scoped AI
// proxy token the operator minted, registered with egress as a static credential, and its egress policy allows
// nothing but the AI proxy host. Prober resolves its actors for egress (ResolveActor); chain it in front of the
// core with Chain.
package prober

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/go-logr/logr"
	"google.golang.org/protobuf/encoding/protojson"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/watch"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/actors"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/egress"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/homes"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/probe"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
)

const (
	defaultAttemptTimeout = 10 * time.Minute
	defaultAttempts       = 3
	defaultRetryDelay     = 15 * time.Second
	defaultResync         = time.Minute
	cleanupTimeout        = 30 * time.Second
	healthPollInterval    = 500 * time.Millisecond
)

// Actors is the Substrate subset the prober uses (*actors.Client).
type Actors interface {
	CreateActor(ctx context.Context, spec actors.Spec) (*ateapi.Actor, error)
	ApplyEgressPolicy(ctx context.Context, ref actors.Ref, rules []*ateapi.EgressRule) error
	Resume(ctx context.Context, ref actors.Ref) error
	WaitState(ctx context.Context, ref actors.Ref, states ...ateapi.ActorState) (*ateapi.Actor, error)
	GetActor(ctx context.Context, ref actors.Ref) (*ateapi.Actor, error)
	DeleteActor(ctx context.Context, ref actors.Ref) error
}

// Daemons reaches an actor's daemon (*router.Router).
type Daemons interface {
	Daemon(actor string) devboxv1.DaemonClient
}

// Credentials registers the probe token with egress (*egress.Service).
type Credentials interface {
	SetStaticCredential(instanceID, kind, token string, expiresAt time.Time) error
	Invalidate(instanceID string)
}

type Config struct {
	// Namespace holds the probe ConfigMaps and the token Secret (the operator namespace).
	Namespace string
	// Holder identifies this replica in claims, normally the pod name.
	Holder     string
	ConsoleURL string
	AIProxyURL string

	AttemptTimeout time.Duration
	Attempts       int
	RetryDelay     time.Duration
	// Resync re-lists pending requests, catching anything a dropped watch missed and abandoned claims.
	Resync time.Duration
}

type Deps struct {
	Client      client.WithWatch
	Actors      Actors
	Daemons     Daemons
	Credentials Credentials
	// Homes seed probe actors' external homes by storage (homedriver.Client); a revision with a home seed can't be
	// probed without its storage's.
	Homes map[v1alpha1.DevboxHomeStorage]homes.Driver
	Log   logr.Logger
	Now   func() time.Time
}

type Prober struct {
	cfg  Config
	deps Deps

	mu       sync.Mutex
	running  map[string]bool
	resolved map[string]*egress.InstanceInfo
	wg       sync.WaitGroup
}

var _ egress.ActorResolver = &Prober{}

func New(cfg Config, deps Deps) (*Prober, error) {
	if cfg.Namespace == "" {
		return nil, errors.New("prober: Namespace is required")
	}
	if cfg.AIProxyURL == "" {
		return nil, errors.New("prober: AIProxyURL is required")
	}
	if cfg.AttemptTimeout == 0 {
		cfg.AttemptTimeout = defaultAttemptTimeout
	}
	if cfg.Attempts == 0 {
		cfg.Attempts = defaultAttempts
	}
	if cfg.RetryDelay == 0 {
		cfg.RetryDelay = defaultRetryDelay
	}
	if cfg.Resync == 0 {
		cfg.Resync = defaultResync
	}
	if deps.Now == nil {
		deps.Now = time.Now
	}
	return &Prober{cfg: cfg, deps: deps, running: map[string]bool{}, resolved: map[string]*egress.InstanceInfo{}}, nil
}

// UseCredentials sets the egress service once it exists; egress needs the prober as a resolver first.
func (p *Prober) UseCredentials(c Credentials) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.deps.Credentials = c
}

func (p *Prober) credentials() Credentials {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.deps.Credentials
}

// InstanceID is the egress pseudo-instance of a probe request.
func InstanceID(configMap string) string { return "probe-" + configMap }

// ResolveActor resolves the actors of running probes; anything else is egress.ErrUnknownActor.
func (p *Prober) ResolveActor(_ context.Context, actorID string) (*egress.InstanceInfo, error) {
	p.mu.Lock()
	defer p.mu.Unlock()
	info, ok := p.resolved[actorID]
	if !ok {
		return nil, egress.ErrUnknownActor
	}
	cp := *info
	return &cp, nil
}

// Chain resolves an actor with the first resolver that knows it.
func Chain(resolvers ...egress.ActorResolver) egress.ActorResolver { return chain(resolvers) }

type chain []egress.ActorResolver

func (c chain) ResolveActor(ctx context.Context, actorID string) (*egress.InstanceInfo, error) {
	for _, r := range c {
		info, err := r.ResolveActor(ctx, actorID)
		if errors.Is(err, egress.ErrUnknownActor) || (err == nil && info == nil) {
			continue
		}
		return info, err
	}
	return nil, egress.ErrUnknownActor
}

// Run watches probe requests until ctx is done, then waits for running probes to clean up.
func (p *Prober) Run(ctx context.Context) error {
	defer p.wg.Wait()
	for ctx.Err() == nil {
		if err := p.watch(ctx); err != nil && ctx.Err() == nil {
			p.deps.Log.Info("probe watch failed; retrying", "error", err.Error())
			select {
			case <-ctx.Done():
			case <-time.After(5 * time.Second):
			}
		}
	}
	return nil
}

func (p *Prober) listOptions() []client.ListOption {
	return []client.ListOption{client.InNamespace(p.cfg.Namespace), client.MatchingLabels{probe.Label: probe.LabelRequest}}
}

// watch lists pending requests, then follows changes until the resync interval elapses or the watch ends.
func (p *Prober) watch(ctx context.Context) error {
	list := &corev1.ConfigMapList{}
	if err := p.deps.Client.List(ctx, list, p.listOptions()...); err != nil {
		return fmt.Errorf("listing probe requests: %w", err)
	}
	for i := range list.Items {
		p.consider(ctx, &list.Items[i])
	}

	w, err := p.deps.Client.Watch(ctx, &corev1.ConfigMapList{}, append(p.listOptions(), &client.ListOptions{Raw: &metav1.ListOptions{ResourceVersion: list.ResourceVersion}})...)
	if err != nil {
		return fmt.Errorf("watching probe requests: %w", err)
	}
	defer w.Stop()
	resync := time.NewTimer(p.cfg.Resync)
	defer resync.Stop()
	for {
		select {
		case <-ctx.Done():
			return nil
		case <-resync.C:
			return nil
		case ev, ok := <-w.ResultChan():
			if !ok {
				return nil
			}
			if ev.Type != watch.Added && ev.Type != watch.Modified {
				continue
			}
			if cm, ok := ev.Object.(*corev1.ConfigMap); ok {
				p.consider(ctx, cm)
			}
		}
	}
}

// consider claims and starts a pending request.
func (p *Prober) consider(ctx context.Context, cm *corev1.ConfigMap) {
	if cm.Annotations[probe.StateAnnotation] != "" {
		return
	}
	if holder, at, ok := probe.ParseClaim(cm.Annotations[probe.ClaimAnnotation]); ok && holder != p.cfg.Holder && p.deps.Now().Sub(at) < probe.ClaimTTL {
		return
	}
	p.mu.Lock()
	if p.running[cm.Name] {
		p.mu.Unlock()
		return
	}
	p.running[cm.Name] = true
	p.mu.Unlock()

	if err := p.claim(ctx, cm); err != nil {
		p.mu.Lock()
		delete(p.running, cm.Name)
		p.mu.Unlock()
		if !apierrors.IsConflict(err) && !apierrors.IsNotFound(err) {
			p.deps.Log.Info("could not claim probe request", "request", cm.Name, "error", err.Error())
		}
		return
	}
	p.wg.Add(1)
	go func() {
		defer p.wg.Done()
		defer func() {
			p.mu.Lock()
			delete(p.running, cm.Name)
			p.mu.Unlock()
		}()
		p.process(ctx, cm)
	}()
}

// claim marks cm as ours with an optimistic update, so concurrent replicas can't both run it.
func (p *Prober) claim(ctx context.Context, cm *corev1.ConfigMap) error {
	cm = cm.DeepCopy()
	if cm.Annotations == nil {
		cm.Annotations = map[string]string{}
	}
	cm.Annotations[probe.ClaimAnnotation] = probe.Claim(p.cfg.Holder, p.deps.Now())
	return p.deps.Client.Update(ctx, cm)
}

// permanentError fails a request without retrying.
type permanentError struct{ error }

func (p *Prober) process(ctx context.Context, cm *corev1.ConfigMap) {
	log := p.deps.Log.WithValues("request", cm.Name)
	var req probe.Request
	if err := json.Unmarshal([]byte(cm.Data[probe.RequestKey]), &req); err != nil {
		p.finish(ctx, cm.Name, nil, fmt.Errorf("unreadable %s: %w", probe.RequestKey, err))
		return
	}

	var lastErr error
	for attempt := 1; attempt <= p.cfg.Attempts; attempt++ {
		if attempt > 1 {
			select {
			case <-ctx.Done():
				return
			case <-time.After(p.cfg.RetryDelay):
			}
			if err := p.refreshClaim(ctx, cm.Name); err != nil {
				log.Info("lost the probe claim; giving up", "error", err.Error())
				return
			}
		}
		resp, err := p.attempt(ctx, cm.Name, &req)
		if ctx.Err() != nil {
			return
		}
		if err == nil {
			log.Info("agent probe finished", "agents", len(resp.GetAgents()), "attempt", attempt)
			p.finish(ctx, cm.Name, resp, nil)
			return
		}
		lastErr = err
		log.Info("agent probe attempt failed", "attempt", attempt, "error", err.Error())
		var perm permanentError
		if errors.As(err, &perm) {
			break
		}
	}
	p.finish(ctx, cm.Name, nil, lastErr)
}

func (p *Prober) refreshClaim(ctx context.Context, name string) error {
	cm := &corev1.ConfigMap{}
	if err := p.deps.Client.Get(ctx, client.ObjectKey{Name: name, Namespace: p.cfg.Namespace}, cm); err != nil {
		return err
	}
	if holder, _, _ := probe.ParseClaim(cm.Annotations[probe.ClaimAnnotation]); holder != p.cfg.Holder || cm.Annotations[probe.StateAnnotation] != "" {
		return fmt.Errorf("request is claimed by %q or finished", holder)
	}
	return p.claim(ctx, cm)
}

// attempt runs one probe in a fresh actor and always deletes it.
func (p *Prober) attempt(ctx context.Context, name string, req *probe.Request) (*devboxv1.ProbeAgentsResponse, error) {
	if req.Atespace == "" || req.ActorTemplate == "" || req.GoldenTag == "" {
		return nil, permanentError{errors.New("the request names no atespace, actor template or golden tag")}
	}
	spec := &devboxv1.ProbeAgentsRequest{}
	if len(req.Probe) > 0 {
		if err := (protojson.UnmarshalOptions{DiscardUnknown: true}).Unmarshal(req.Probe, spec); err != nil {
			return nil, permanentError{fmt.Errorf("unreadable probe spec: %w", err)}
		}
	}
	spec.Endpoints = &devboxv1.HarnessEndpoints{ConsoleUrl: p.cfg.ConsoleURL, AiProxyUrl: p.cfg.AIProxyURL}

	ctx, cancel := context.WithTimeout(ctx, p.cfg.AttemptTimeout)
	defer cancel()

	creds := p.credentials()
	if creds == nil {
		return nil, errors.New("egress isn't running yet")
	}
	driver := p.deps.Homes[v1alpha1.DevboxHomeStorage(req.HomeStorage)]
	if req.HomeSeed != "" && driver == nil {
		return nil, permanentError{fmt.Errorf("the gateway has no %s controller address to seed the probe's home", req.HomeStorage)}
	}
	ref := actors.Ref{Atespace: req.Atespace, Name: name}
	instanceID := InstanceID(name)
	aiHost := hostOf(p.cfg.AIProxyURL)
	var rules []*ateapi.EgressRule
	if req.TokenSecret != nil {
		tok, err := p.token(ctx, req.TokenSecret)
		if err != nil {
			return nil, err
		}
		if err := creds.SetStaticCredential(instanceID, egress.KindAIProxy, tok.Token, tok.ExpiresAt); err != nil {
			return nil, permanentError{err}
		}
		rules = actors.EgressRules(egress.Policy{Rules: []egress.Rule{{
			Host: aiHost, Scheme: egress.SchemeHTTPS, InjectHeader: "Authorization",
			SecretURI: egress.SecretURI(instanceID, egress.KindAIProxy, ""),
		}}})
	} else {
		rules = actors.EgressRules(egress.Policy{Rules: []egress.Rule{{Host: aiHost, Scheme: egress.SchemeHTTPS}}})
	}

	p.mu.Lock()
	p.resolved[ref.String()] = &egress.InstanceInfo{
		InstanceID:  instanceID,
		BoxID:       req.DevboxID,
		ConsoleHost: hostOf(p.cfg.ConsoleURL),
		AIProxyHost: aiHost,
	}
	p.mu.Unlock()
	defer func() {
		cctx, ccancel := context.WithTimeout(context.WithoutCancel(ctx), cleanupTimeout)
		defer ccancel()
		if err := p.deps.Actors.DeleteActor(cctx, ref); err != nil {
			p.deps.Log.Info("could not delete the probe actor", "actor", ref.String(), "error", err.Error())
		}
		p.mu.Lock()
		delete(p.resolved, ref.String())
		p.mu.Unlock()
		creds.Invalidate(instanceID)
	}()

	actorSpec := actors.Spec{Ref: ref, Template: req.ActorTemplate, SourceTag: req.GoldenTag}
	if req.ExternalHome {
		actorSpec.SourceTag, actorSpec.Preview = "", true
	}
	actor, err := p.deps.Actors.CreateActor(ctx, actorSpec)
	if err != nil {
		return nil, fmt.Errorf("creating probe actor %s: %w", ref, err)
	}
	start := func() error {
		if err := p.deps.Actors.ApplyEgressPolicy(ctx, ref, rules); err != nil {
			return fmt.Errorf("applying the probe egress policy: %w", err)
		}
		if err := p.deps.Actors.Resume(ctx, ref); err != nil {
			return fmt.Errorf("resuming probe actor %s: %w", ref, err)
		}
		if _, err := p.deps.Actors.WaitState(ctx, ref, ateapi.ActorState_ACTOR_STATE_RUNNING); err != nil {
			return fmt.Errorf("waiting for probe actor %s: %w", ref, err)
		}
		return nil
	}
	if req.HomeSeed != "" {
		err = homes.Start(ctx, driver, p.deps.Actors, actor, req.HomeSeed, req.HomeBytes, start)
	} else {
		err = start()
	}
	if errors.Is(err, homes.ErrSeedMissing) || errors.Is(err, homes.ErrVolumeNaming) {
		return nil, permanentError{err}
	} else if err != nil {
		return nil, err
	}
	daemon := p.deps.Daemons.Daemon(ref.String())
	if err := waitServing(ctx, daemon); err != nil {
		return nil, fmt.Errorf("waiting for the probe daemon: %w", err)
	}
	resp, err := daemon.ProbeAgents(ctx, spec)
	if err != nil {
		return nil, fmt.Errorf("probing agents: %w", err)
	}
	return resp, nil
}

func (p *Prober) token(ctx context.Context, ref *probe.TokenRef) (probe.Token, error) {
	secret := &corev1.Secret{}
	if err := p.deps.Client.Get(ctx, client.ObjectKey{Name: ref.Name, Namespace: p.cfg.Namespace}, secret); err != nil {
		return probe.Token{}, fmt.Errorf("reading probe token Secret %s: %w", ref.Name, err)
	}
	raw, ok := secret.Data[ref.Key]
	if !ok {
		return probe.Token{}, fmt.Errorf("probe token Secret %s has no key %s", ref.Name, ref.Key)
	}
	var tok probe.Token
	if err := json.Unmarshal(raw, &tok); err != nil || tok.Token == "" {
		return probe.Token{}, fmt.Errorf("unreadable probe token %s/%s", ref.Name, ref.Key)
	}
	if !p.deps.Now().Before(tok.ExpiresAt) {
		return probe.Token{}, fmt.Errorf("probe token %s/%s expired; waiting for the operator to re-mint it", ref.Name, ref.Key)
	}
	return tok, nil
}

// finish writes the outcome to the request, retrying on conflicts.
func (p *Prober) finish(ctx context.Context, name string, resp *devboxv1.ProbeAgentsResponse, probeErr error) {
	for range 5 {
		cm := &corev1.ConfigMap{}
		if err := p.deps.Client.Get(ctx, client.ObjectKey{Name: name, Namespace: p.cfg.Namespace}, cm); err != nil {
			if !apierrors.IsNotFound(err) {
				p.deps.Log.Info("could not read the probe request to write its result", "request", name, "error", err.Error())
			}
			return
		}
		if cm.Annotations == nil {
			cm.Annotations = map[string]string{}
		}
		if cm.Data == nil {
			cm.Data = map[string]string{}
		}
		if probeErr != nil {
			cm.Annotations[probe.StateAnnotation] = probe.StateFailed
			cm.Data[probe.ErrorKey] = probeErr.Error()
		} else {
			out, err := protojson.Marshal(resp)
			if err != nil {
				cm.Annotations[probe.StateAnnotation] = probe.StateFailed
				cm.Data[probe.ErrorKey] = fmt.Sprintf("encoding the probe result: %s", err)
			} else {
				cm.Annotations[probe.StateAnnotation] = probe.StateDone
				cm.Data[probe.ResultKey] = string(out)
			}
		}
		err := p.deps.Client.Update(ctx, cm)
		if err == nil || !apierrors.IsConflict(err) {
			if err != nil {
				p.deps.Log.Info("could not write the probe result", "request", name, "error", err.Error())
			}
			return
		}
	}
}

// waitServing waits for the daemon to answer Health. It doesn't wait for Ready: the probe never initializes the
// daemon, and an uninitialized daemon stays "booting".
func waitServing(ctx context.Context, d devboxv1.DaemonClient) error {
	t := time.NewTicker(healthPollInterval)
	defer t.Stop()
	for {
		hctx, cancel := context.WithTimeout(ctx, 5*time.Second)
		_, err := d.Health(hctx, &devboxv1.HealthRequest{})
		cancel()
		if err == nil {
			return nil
		}
		select {
		case <-ctx.Done():
			return errors.Join(ctx.Err(), err)
		case <-t.C:
		}
	}
}

func hostOf(raw string) string {
	u, err := url.Parse(raw)
	if err != nil || u.Host == "" {
		return strings.ToLower(strings.TrimSuffix(raw, "/"))
	}
	return strings.ToLower(u.Hostname())
}
