// Package warmer boots a throwaway actor of each devbox template on nodes that join after the gateway started, so
// the node pulls and unpacks the template's image (about 25s for a devbox image) before an instance resumes there.
//
// Substrate can't place an actor on a given node: it samples two eligible workers and takes the less loaded one.
// A new node's worker is empty, so it wins whenever it's sampled, and the warmer boots up to Attempts actors per
// cold node until one lands there. Actors run one at a time and are deleted once running, or on the next pass if
// that delete fails, so warming holds at most one worker slot; worker autoscaling doesn't count them
// (substrate.IsWarmActor).
package warmer

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"time"

	"github.com/go-logr/logr"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"k8s.io/apimachinery/pkg/labels"

	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/actors"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/core"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
)

const (
	defaultInterval       = 20 * time.Second
	defaultAttempts       = 3
	defaultAttemptTimeout = 3 * time.Minute
	cleanupTimeout        = 30 * time.Second
)

// Actors is the Substrate subset the warmer uses (*actors.Client).
type Actors interface {
	ListWorkers(ctx context.Context) ([]*ateapi.Worker, error)
	ListActors(ctx context.Context, atespace string) ([]*ateapi.Actor, error)
	GetActorTemplate(ctx context.Context, ref actors.Ref) (*ateapi.ActorTemplate, error)
	CreateActor(ctx context.Context, spec actors.Spec) (*ateapi.Actor, error)
	Resume(ctx context.Context, ref actors.Ref) error
	WaitState(ctx context.Context, ref actors.Ref, states ...ateapi.ActorState) (*ateapi.Actor, error)
	DeleteActor(ctx context.Context, ref actors.Ref) error
}

// Runners lists DevboxRunners (*core.KubeRunners).
type Runners interface {
	List(ctx context.Context) ([]*core.Runner, error)
}

type Config struct {
	Interval time.Duration
	// Attempts is how many warm actors a cold node gets to land one before the warmer gives up on it.
	Attempts       int
	AttemptTimeout time.Duration
}

type Deps struct {
	Actors  Actors
	Runners Runners
	Log     logr.Logger
	Now     func() time.Time
}

type Warmer struct {
	cfg  Config
	deps Deps

	// templates is keyed "<atespace>/<template>".
	templates map[string]*template
	seeded    bool
	seq       int
}

type template struct {
	selector labels.Selector
	limits   *ateapi.Resources
	// warm holds the nodes the template was warmed on, already ran on, existed on before the warmer started, or
	// was given up on.
	warm map[string]bool
	// tries counts the warm actors booted while a node was cold.
	tries map[string]int
}

func New(cfg Config, deps Deps) *Warmer {
	if cfg.Interval == 0 {
		cfg.Interval = defaultInterval
	}
	if cfg.Attempts == 0 {
		cfg.Attempts = defaultAttempts
	}
	if cfg.AttemptTimeout == 0 {
		cfg.AttemptTimeout = defaultAttemptTimeout
	}
	if deps.Now == nil {
		deps.Now = time.Now
	}
	return &Warmer{cfg: cfg, deps: deps, templates: map[string]*template{}}
}

// Run warms new nodes until ctx is done.
func (w *Warmer) Run(ctx context.Context) error {
	t := time.NewTicker(w.cfg.Interval)
	defer t.Stop()
	for {
		err := w.pass(ctx)
		if c := status.Code(errors.Unwrap(err)); c == codes.PermissionDenied || c == codes.Unimplemented {
			w.deps.Log.Info("can't list Substrate workers; node warming disabled", "error", err.Error())
			return nil
		}
		if err != nil && ctx.Err() == nil {
			w.deps.Log.Info("node warming pass failed", "error", err.Error())
		}
		select {
		case <-ctx.Done():
			return nil
		case <-t.C:
		}
	}
}

// pass warms every ready runner's current template on the nodes it hasn't been on. The first pass only records
// the nodes that already exist. Every pass first deletes the warm actors left behind, by a previous gateway or by
// a delete that failed.
func (w *Warmer) pass(ctx context.Context) error {
	workers, err := w.deps.Actors.ListWorkers(ctx)
	if err != nil {
		return fmt.Errorf("listing workers: %w", err)
	}
	runners, err := w.deps.Runners.List(ctx)
	if err != nil {
		return err
	}
	seen := map[string]bool{}
	listed := map[string][]*ateapi.Actor{}
	for _, r := range runners {
		if r.Atespace == "" || r.Template == "" || r.GoldenTag == "" {
			continue
		}
		key := r.Atespace + "/" + r.Template
		tmpl, err := w.template(ctx, key, r)
		if err != nil {
			w.deps.Log.Info("can't read the template to warm", "runner", r.Name, "template", r.Template, "error", err.Error())
			continue
		}
		seen[key] = true
		list, ok := listed[r.Atespace]
		if !ok {
			list = w.sweep(ctx, r.Atespace)
			listed[r.Atespace] = list
		}
		nodes := tmpl.nodesWithRoom(workers)
		if !w.seeded {
			for n := range nodes {
				tmpl.warm[n] = true
			}
			continue
		}
		cold := map[string]bool{}
		for n := range nodes {
			if !tmpl.warm[n] {
				cold[n] = true
			}
		}
		if len(cold) > 0 {
			w.warmRunner(ctx, r, tmpl, cold, list)
		}
	}
	for key := range w.templates {
		if !seen[key] {
			delete(w.templates, key)
		}
	}
	w.seeded = true
	return ctx.Err()
}

func (w *Warmer) template(ctx context.Context, key string, r *core.Runner) (*template, error) {
	if t, ok := w.templates[key]; ok {
		return t, nil
	}
	at, err := w.deps.Actors.GetActorTemplate(ctx, actors.Ref{Atespace: r.Atespace, Name: r.Template})
	if err != nil {
		return nil, err
	}
	t := &template{
		selector: labels.SelectorFromSet(at.GetWorkerSelector().GetMatchLabels()),
		limits:   at.GetResources().GetLimits(),
		warm:     map[string]bool{},
		tries:    map[string]int{},
	}
	w.templates[key] = t
	return t, nil
}

// nodesWithRoom are the nodes with an active worker that could take one of the template's actors now.
func (t *template) nodesWithRoom(workers []*ateapi.Worker) map[string]bool {
	nodes := map[string]bool{}
	for _, wk := range workers {
		st := wk.GetStatus()
		if st.GetState() != ateapi.WorkerState_WORKER_STATE_ACTIVE || st.GetRegisteredEpoch() == 0 || wk.GetNodeName() == "" {
			continue
		}
		if !t.selector.Matches(labels.Set(wk.GetLabels())) || !hasRoom(st, t.limits) {
			continue
		}
		nodes[wk.GetNodeName()] = true
	}
	return nodes
}

// hasRoom approximates Substrate's admission check, without the runtime's per-actor overhead.
func hasRoom(st *ateapi.WorkerStatus, limits *ateapi.Resources) bool {
	capacity, used := st.GetCapacity(), st.GetAllocated()
	if used.GetActors() >= capacity.GetActors() {
		return false
	}
	if c := capacity.GetCpuMillicores(); c > 0 && c-used.GetCpuMillicores() < limits.GetCpuMillicores() {
		return false
	}
	if m := capacity.GetMemoryBytes(); m > 0 && m-used.GetMemoryBytes() < limits.GetMemoryBytes() {
		return false
	}
	return true
}

// warmRunner boots warm actors of r's template until each cold node hosted one or ran out of attempts. list is
// the atespace's actors.
func (w *Warmer) warmRunner(ctx context.Context, r *core.Runner, tmpl *template, cold map[string]bool, list []*ateapi.Actor) {
	log := w.deps.Log.WithValues("runner", r.Name, "template", r.Template)
	for _, a := range list {
		if a.GetStatus().GetState() == ateapi.ActorState_ACTOR_STATE_RUNNING && a.GetActorTemplate().GetName() == r.Template {
			node := a.GetStatus().GetWorkerAssignment().GetNodeName()
			tmpl.warm[node] = true
			delete(cold, node)
		}
	}

	for len(cold) > 0 && ctx.Err() == nil {
		node, err := w.boot(ctx, r)
		for n := range cold {
			tmpl.tries[n]++
		}
		if err != nil {
			log.Info("warm actor failed; retrying next pass", "nodes", sorted(cold), "error", err.Error())
			break
		}
		tmpl.warm[node] = true
		if cold[node] {
			delete(cold, node)
			delete(tmpl.tries, node)
			log.Info("warmed node", "node", node)
		}
		for n := range cold {
			if tmpl.tries[n] >= w.cfg.Attempts {
				log.Info("no warm actor landed on node; giving up", "node", n, "attempts", tmpl.tries[n])
				tmpl.warm[n] = true
				delete(tmpl.tries, n)
				delete(cold, n)
			}
		}
	}
}

// boot runs one warm actor of r's template from its golden tag and returns the node it ran on. The actor has no
// egress policy, so it can't reach anything, and is always deleted.
func (w *Warmer) boot(ctx context.Context, r *core.Runner) (string, error) {
	w.seq++
	ref := actors.Ref{Atespace: r.Atespace, Name: fmt.Sprintf("%s%x-%d", substrate.WarmActorPrefix, w.deps.Now().Unix(), w.seq)}
	ctx, cancel := context.WithTimeout(ctx, w.cfg.AttemptTimeout)
	defer cancel()
	defer func() {
		cctx, ccancel := context.WithTimeout(context.WithoutCancel(ctx), cleanupTimeout)
		defer ccancel()
		if err := w.deps.Actors.DeleteActor(cctx, ref); err != nil {
			w.deps.Log.Info("could not delete the warm actor", "actor", ref.String(), "error", err.Error())
		}
	}()

	spec := actors.Spec{Ref: ref, Template: r.Template, SourceTag: r.GoldenTag}
	if r.HomeStorage.External() {
		spec.SourceTag, spec.Preview = "", true
	}
	if _, err := w.deps.Actors.CreateActor(ctx, spec); err != nil {
		return "", fmt.Errorf("creating warm actor %s: %w", ref, err)
	}
	if err := w.deps.Actors.Resume(ctx, ref); err != nil {
		return "", fmt.Errorf("resuming warm actor %s: %w", ref, err)
	}
	a, err := w.deps.Actors.WaitState(ctx, ref, ateapi.ActorState_ACTOR_STATE_RUNNING)
	if err != nil {
		return "", fmt.Errorf("waiting for warm actor %s: %w", ref, err)
	}
	node := a.GetStatus().GetWorkerAssignment().GetNodeName()
	if node == "" {
		return "", errors.New("the running warm actor reports no node")
	}
	return node, nil
}

// sweep deletes the warm actors in atespace and returns its other actors. Warm actors boot one at a time within a
// pass, so any it finds were left behind: by a gateway that stopped mid-boot, or by a delete that failed, as it
// does while a new node's atelet is still starting.
func (w *Warmer) sweep(ctx context.Context, atespace string) []*ateapi.Actor {
	list, err := w.deps.Actors.ListActors(ctx, atespace)
	if err != nil {
		w.deps.Log.Info("can't list actors to remove stale warm actors", "atespace", atespace, "error", err.Error())
		return nil
	}
	var rest []*ateapi.Actor
	for _, a := range list {
		name := a.GetMetadata().GetName()
		if !substrate.IsWarmActor(name) {
			rest = append(rest, a)
			continue
		}
		ref := actors.Ref{Atespace: atespace, Name: name}
		if err := w.deps.Actors.DeleteActor(ctx, ref); err != nil {
			w.deps.Log.Info("could not delete a stale warm actor", "actor", ref.String(), "error", err.Error())
		}
	}
	return rest
}

func sorted(set map[string]bool) []string {
	out := make([]string, 0, len(set))
	for k := range set {
		out = append(out, k)
	}
	slices.Sort(out)
	return out
}
