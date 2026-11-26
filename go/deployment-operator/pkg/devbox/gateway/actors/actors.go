// Package actors is the gateway's Substrate client (DBX-32): the actor lifecycle, egress policies, tags and
// worker drain state, on top of the vendored substrate.ateapi.v1 bindings in pkg/devbox/substrate/ateapi.
//
// pkg/devbox/substrate (the operator's client) covers atespaces and templates; this package covers what only the
// gateway does. Every call is idempotent: creates return the existing object on AlreadyExists and deletes treat
// NotFound as success.
package actors

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"

	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/egress"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/egress/rules"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
)

const (
	// EgressPolicyName is the name of an actor's singleton egress policy.
	EgressPolicyName = "default"

	pageSize     = 500
	pollInterval = time.Second
	capacityWait = time.Minute
)

// Ref names an actor or tag.
type Ref struct {
	Atespace string
	Name     string
}

func (r Ref) String() string { return r.Atespace + "/" + r.Name }

func (r Ref) object() *ateapi.ObjectRef { return &ateapi.ObjectRef{Atespace: r.Atespace, Name: r.Name} }

// ParseRef parses "<atespace>/<name>", the actor ID format egress uses. A bare name takes defaultAtespace.
func ParseRef(s, defaultAtespace string) Ref {
	if atespace, name, ok := strings.Cut(s, "/"); ok {
		return Ref{Atespace: atespace, Name: name}
	}
	return Ref{Atespace: defaultAtespace, Name: s}
}

// Client wraps substrate.ateapi.v1.Control.
type Client struct {
	control      ateapi.ControlClient
	conn         *grpc.ClientConn
	poll         time.Duration
	backoff      time.Duration
	capacityWait time.Duration
}

// Dial connects to ate-api-server like substrate.Dial: TLS with the servicedns CA bundle, plus the projected
// ServiceAccount token re-read on every call.
func Dial(cfg substrate.Config) (*Client, error) {
	if cfg.Address == "" {
		cfg.Address = substrate.DefaultAddress
	}
	if cfg.ServerName == "" {
		cfg.ServerName = strings.Split(cfg.Address, ":")[0]
	}
	pool := x509.NewCertPool()
	ca, err := os.ReadFile(cfg.CAFile)
	if err != nil {
		return nil, fmt.Errorf("reading substrate CA bundle: %w", err)
	}
	if !pool.AppendCertsFromPEM(ca) {
		return nil, fmt.Errorf("no certificates in substrate CA bundle %s", cfg.CAFile)
	}
	conn, err := grpc.NewClient(cfg.Address,
		grpc.WithTransportCredentials(credentials.NewTLS(&tls.Config{RootCAs: pool, ServerName: cfg.ServerName, MinVersion: tls.VersionTLS12})),
		grpc.WithPerRPCCredentials(tokenFile(cfg.TokenFile)),
	)
	if err != nil {
		return nil, err
	}
	c := New(ateapi.NewControlClient(conn))
	c.conn = conn
	return c, nil
}

// New wraps an existing Control client.
func New(control ateapi.ControlClient) *Client {
	return &Client{control: control, poll: pollInterval, backoff: retryBackoff, capacityWait: capacityWait}
}

// WithPollInterval sets how often the Wait* helpers poll and, at most, how long Suspend and Resume back off
// between attempts; tests shorten it.
func (c *Client) WithPollInterval(d time.Duration) *Client {
	c.poll = d
	c.backoff = min(c.backoff, d)
	return c
}

// WithCapacityWait sets how long Resume keeps trying while no worker has room; tests shorten it.
func (c *Client) WithCapacityWait(d time.Duration) *Client {
	c.capacityWait = d
	return c
}

func (c *Client) Close() error {
	if c.conn == nil {
		return nil
	}
	return c.conn.Close()
}

type tokenFile string

func (t tokenFile) GetRequestMetadata(context.Context, ...string) (map[string]string, error) {
	token, err := os.ReadFile(string(t))
	if err != nil {
		return nil, fmt.Errorf("reading substrate token: %w", err)
	}
	return map[string]string{"authorization": "Bearer " + strings.TrimSpace(string(token))}, nil
}

func (tokenFile) RequireTransportSecurity() bool { return true }

func ignoreNotFound(err error) error {
	if substrate.IsNotFound(err) {
		return nil
	}
	return err
}

// ---- actors ----

// Spec describes an actor to create.
type Spec struct {
	Ref Ref
	// Template is the ActorTemplate name, in Ref.Atespace.
	Template string
	// SourceTag seeds the actor's first resume from a tag (golden or snapshot), in Ref.Atespace. Empty takes the
	// template's golden tag.
	SourceTag string
	// Preview opts the call into Substrate preview features, which templates with external volumes need.
	Preview bool
}

// CreateActor creates a suspended actor, or returns the existing one.
func (c *Client) CreateActor(ctx context.Context, spec Spec) (*ateapi.Actor, error) {
	if spec.Preview {
		ctx = metadata.AppendToOutgoingContext(ctx, substrate.PreviewHeader, "true")
	}
	actor := &ateapi.Actor{
		Metadata:      &ateapi.ResourceMetadata{Atespace: spec.Ref.Atespace, Name: spec.Ref.Name},
		ActorTemplate: &ateapi.ObjectRef{Atespace: spec.Ref.Atespace, Name: spec.Template},
	}
	if spec.SourceTag != "" {
		actor.SourceTag = &ateapi.ObjectRef{Atespace: spec.Ref.Atespace, Name: spec.SourceTag}
	}
	created, err := c.control.CreateActor(ctx, &ateapi.CreateActorRequest{Actor: actor})
	if substrate.IsAlreadyExists(err) {
		return c.GetActor(ctx, spec.Ref)
	}
	return created, err
}

func (c *Client) GetActor(ctx context.Context, ref Ref) (*ateapi.Actor, error) {
	return c.control.GetActor(ctx, &ateapi.GetActorRequest{Actor: ref.object()})
}

func (c *Client) GetActorTemplate(ctx context.Context, ref Ref) (*ateapi.ActorTemplate, error) {
	return c.control.GetActorTemplate(ctx, &ateapi.GetActorTemplateRequest{ActorTemplate: ref.object()})
}

// SetTemplate points a (suspended) actor at another template; its next resume restores volume data and
// cold-boots (filesystem fidelity).
func (c *Client) SetTemplate(ctx context.Context, ref Ref, template string) error {
	actor, err := c.GetActor(ctx, ref)
	if err != nil {
		return err
	}
	if actor.GetActorTemplate().GetName() == template {
		return nil
	}
	actor.ActorTemplate = &ateapi.ObjectRef{Atespace: ref.Atespace, Name: template}
	actor.Status = nil
	_, err = c.control.UpdateActor(ctx, &ateapi.UpdateActorRequest{Actor: actor})
	return err
}

// Substrate's actor workflows are re-entrant: a suspend or resume that failed midway leaves the actor SUSPENDING or
// RESUMING, and calling the same RPC again finishes it. An operation in flight holds the actor's lease, and others
// get Aborted until it ends. Suspend and Resume converge on that: they retry until the actor reaches the state or
// ctx ends, repairing whatever an interrupted operation left behind.
const (
	retryBackoff    = 2 * time.Second
	maxRetryBackoff = 15 * time.Second
)

// retryable is an error another attempt can get past: an operation in flight, or Substrate or the worker briefly
// unreachable (it can place a restore on a worker that just went away).
func retryable(err error) bool {
	switch status.Code(err) {
	case codes.Aborted, codes.Unavailable:
		return true
	}
	return false
}

// converge runs step until it reports done, backing off between attempts. step returns done, or the error to
// end with when it isn't retryable; the last error is returned when ctx ends.
func (c *Client) converge(ctx context.Context, step func() (bool, error)) error {
	backoff := c.backoff
	for {
		done, err := step()
		if done {
			return nil
		}
		if err != nil && !retryable(err) {
			return err
		}
		select {
		case <-ctx.Done():
			return errors.Join(err, ctx.Err())
		case <-time.After(backoff):
		}
		backoff = min(backoff*2, maxRetryBackoff)
	}
}

// Suspend suspends an actor and finishes one an earlier suspend left SUSPENDING. Synchronous suspends return once
// the snapshot is durable (needed before eviction and tagging); asynchronous ones once the actor is suspended
// locally.
func (c *Client) Suspend(ctx context.Context, ref Ref, synchronous bool) error {
	return c.converge(ctx, func() (bool, error) {
		err := c.suspendOnce(ctx, ref, synchronous)
		if err == nil {
			return true, nil
		}
		if status.Code(err) == codes.FailedPrecondition {
			a, gerr := c.GetActor(ctx, ref)
			switch {
			case gerr != nil:
				return false, gerr
			case a.GetStatus().GetState() == ateapi.ActorState_ACTOR_STATE_SUSPENDED:
				return true, nil
			case transient(a.GetStatus().GetState()):
				// another operation is moving it; check again once it's done
				return false, status.Error(codes.Aborted, err.Error())
			}
		}
		return false, err
	})
}

func (c *Client) suspendOnce(ctx context.Context, ref Ref, synchronous bool) error {
	mode := ateapi.DurabilityMode_DURABILITY_MODE_ASYNCHRONOUS
	if synchronous {
		mode = ateapi.DurabilityMode_DURABILITY_MODE_SYNCHRONOUS
	}
	_, err := c.control.SuspendActor(ctx, &ateapi.SuspendActorRequest{Actor: ref.object(), Options: &ateapi.SuspendOptions{Mode: mode}})
	return err
}

// transient states end on their own, or when the operation that left them is re-entered.
func transient(s ateapi.ActorState) bool {
	switch s {
	case ateapi.ActorState_ACTOR_STATE_RESUMING, ateapi.ActorState_ACTOR_STATE_SUSPENDING, ateapi.ActorState_ACTOR_STATE_REVERTING:
		return true
	}
	return false
}

// Resume resumes an actor, first finishing a suspend that was interrupted and reverting a crashed actor to its
// last snapshot. It returns once Substrate accepted the resume; WaitState waits for RUNNING. When no worker has
// room it keeps trying for capacityWait, which outlasts a warm actor holding a pool's last slot.
func (c *Client) Resume(ctx context.Context, ref Ref) error {
	var full time.Time
	return c.converge(ctx, func() (bool, error) {
		_, err := c.control.ResumeActor(ctx, &ateapi.ResumeActorRequest{Actor: ref.object()})
		if err == nil {
			return true, nil
		}
		if status.Code(err) == codes.ResourceExhausted {
			if full.IsZero() {
				full = time.Now()
			}
			if time.Since(full) < c.capacityWait {
				return false, status.Error(codes.Aborted, err.Error())
			}
			return false, err
		}
		if status.Code(err) != codes.FailedPrecondition && !retryable(err) {
			return false, err
		}
		a, gerr := c.GetActor(ctx, ref)
		if gerr != nil {
			return false, err
		}
		// a retry re-enters the resume, so a RESUMING actor whose resume died gets finished rather than waited on
		again := status.Error(codes.Aborted, err.Error())
		switch st := a.GetStatus().GetState(); {
		case st == ateapi.ActorState_ACTOR_STATE_RUNNING:
			return true, nil
		case st == ateapi.ActorState_ACTOR_STATE_SUSPENDING:
			// a suspend that didn't finish; re-entering it lands the actor SUSPENDED
			if serr := c.suspendOnce(ctx, ref, false); serr != nil && !retryable(serr) {
				return false, serr
			}
			return false, again
		case st == ateapi.ActorState_ACTOR_STATE_CRASHED:
			if rerr := c.Revert(ctx, ref); rerr != nil && !retryable(rerr) {
				return false, rerr
			}
			return false, again
		case transient(st), retryable(err):
			return false, again
		}
		return false, err
	})
}

// Revert returns a crashed actor to its last good snapshot (suspended).
func (c *Client) Revert(ctx context.Context, ref Ref) error {
	_, err := c.control.RevertActor(ctx, &ateapi.RevertActorRequest{Actor: ref.object()})
	return err
}

// DeleteActor deletes an actor and its egress policy.
func (c *Client) DeleteActor(ctx context.Context, ref Ref) error {
	if err := c.DeleteEgressPolicy(ctx, ref); err != nil {
		return err
	}
	_, err := c.control.DeleteActor(ctx, &ateapi.DeleteActorRequest{Actor: ref.object()})
	return ignoreNotFound(err)
}

// ErrCrashed is returned by WaitState when the actor crashed while waiting.
var ErrCrashed = errors.New("actor crashed")

// WaitState polls until the actor reaches one of the states. A crash ends the wait with ErrCrashed unless
// CRASHED is one of the states.
func (c *Client) WaitState(ctx context.Context, ref Ref, states ...ateapi.ActorState) (*ateapi.Actor, error) {
	want := map[ateapi.ActorState]bool{}
	for _, s := range states {
		want[s] = true
	}
	t := time.NewTicker(c.poll)
	defer t.Stop()
	for {
		a, err := c.GetActor(ctx, ref)
		if err != nil {
			return nil, err
		}
		st := a.GetStatus().GetState()
		if want[st] {
			return a, nil
		}
		if st == ateapi.ActorState_ACTOR_STATE_CRASHED {
			return a, fmt.Errorf("%w: %s", ErrCrashed, a.GetStatus().GetCrash().String())
		}
		select {
		case <-ctx.Done():
			return a, fmt.Errorf("waiting for actor %s (state %s): %w", ref, st, ctx.Err())
		case <-t.C:
		}
	}
}

// ListActors returns every actor in an atespace.
func (c *Client) ListActors(ctx context.Context, atespace string) ([]*ateapi.Actor, error) {
	var out []*ateapi.Actor
	token := ""
	for {
		resp, err := c.control.ListActors(ctx, &ateapi.ListActorsRequest{Atespace: atespace, Options: &ateapi.ListOptions{PageSize: pageSize, PageToken: token}})
		if err != nil {
			return nil, err
		}
		out = append(out, resp.GetActors()...)
		if token = resp.GetNextPageToken(); token == "" {
			return out, nil
		}
	}
}

// DrainingWorkers returns the names of workers being drained: their actors get SIGTERM and must be suspended
// synchronously within the drain window.
func (c *Client) DrainingWorkers(ctx context.Context) (map[string]bool, error) {
	workers, err := c.ListWorkers(ctx)
	if err != nil {
		return nil, err
	}
	out := map[string]bool{}
	for _, w := range workers {
		if w.GetStatus().GetState() == ateapi.WorkerState_WORKER_STATE_DRAINING {
			out[w.GetMetadata().GetName()] = true
		}
	}
	return out, nil
}

// ListWorkers returns every Substrate worker.
func (c *Client) ListWorkers(ctx context.Context) ([]*ateapi.Worker, error) {
	var out []*ateapi.Worker
	token := ""
	for {
		resp, err := c.control.ListWorkers(ctx, &ateapi.ListWorkersRequest{Options: &ateapi.ListOptions{PageSize: pageSize, PageToken: token}})
		if err != nil {
			return nil, err
		}
		out = append(out, resp.GetWorkers()...)
		if token = resp.GetNextPageToken(); token == "" {
			return out, nil
		}
	}
}

// ---- egress policies ----

// ApplyEgressPolicy creates or replaces an actor's egress policy.
func (c *Client) ApplyEgressPolicy(ctx context.Context, ref Ref, rules []*ateapi.EgressRule) error {
	policy := &ateapi.EgressPolicy{
		Metadata: &ateapi.ResourceMetadata{Atespace: ref.Atespace, Name: EgressPolicyName},
		Rules:    rules,
	}
	_, err := c.control.CreateActorEgressPolicy(ctx, &ateapi.CreateActorEgressPolicyRequest{Actor: ref.object(), EgressPolicy: policy})
	if !substrate.IsAlreadyExists(err) {
		return err
	}
	cur, err := c.control.GetActorEgressPolicy(ctx, &ateapi.GetActorEgressPolicyRequest{Actor: ref.object(), Name: EgressPolicyName})
	if err != nil {
		return err
	}
	policy.Metadata.Uid = cur.GetMetadata().GetUid()
	policy.Metadata.Version = cur.GetMetadata().GetVersion()
	_, err = c.control.UpdateActorEgressPolicy(ctx, &ateapi.UpdateActorEgressPolicyRequest{Actor: ref.object(), EgressPolicy: policy})
	return err
}

func (c *Client) DeleteEgressPolicy(ctx context.Context, ref Ref) error {
	_, err := c.control.DeleteActorEgressPolicy(ctx, &ateapi.DeleteActorEgressPolicyRequest{Actor: ref.object(), Name: EgressPolicyName})
	return ignoreNotFound(err)
}

// EgressRules converts an egress policy to Substrate rules.
func EgressRules(p egress.Policy) []*ateapi.EgressRule { return rules.ATE(p) }

// ---- tags ----

// CreateTag tags a suspended actor's latest snapshot, or returns the existing tag.
func (c *Client) CreateTag(ctx context.Context, tag Ref, source Ref) (*ateapi.Tag, error) {
	t, err := c.control.CreateTag(ctx, &ateapi.CreateTagRequest{Tag: &ateapi.Tag{
		Metadata:    &ateapi.ResourceMetadata{Atespace: tag.Atespace, Name: tag.Name},
		Scope:       ateapi.TagScope_TAG_SCOPE_ATESPACE,
		SourceActor: source.object(),
	}})
	if substrate.IsAlreadyExists(err) {
		return c.GetTag(ctx, tag)
	}
	return t, err
}

func (c *Client) GetTag(ctx context.Context, tag Ref) (*ateapi.Tag, error) {
	return c.control.GetTag(ctx, &ateapi.GetTagRequest{Tag: tag.object()})
}

// WaitTag polls until the tag's snapshot copy completed.
func (c *Client) WaitTag(ctx context.Context, tag Ref) (*ateapi.Tag, error) {
	t := time.NewTicker(c.poll)
	defer t.Stop()
	for {
		tg, err := c.GetTag(ctx, tag)
		if err != nil {
			return nil, err
		}
		if tg.GetStatus().GetSnapshot().GetDurableSnapshot().GetState() == ateapi.SnapshotStorageState_SNAPSHOT_STORAGE_STATE_COMPLETED {
			return tg, nil
		}
		select {
		case <-ctx.Done():
			return tg, fmt.Errorf("waiting for tag %s: %w", tag, ctx.Err())
		case <-t.C:
		}
	}
}

func (c *Client) DeleteTag(ctx context.Context, tag Ref) error {
	_, err := c.control.DeleteTag(ctx, &ateapi.DeleteTagRequest{Tag: tag.object()})
	return ignoreNotFound(err)
}

// ExternalVolumeID is the storage volume of an actor's external volume, empty until Substrate provisions it.
func ExternalVolumeID(a *ateapi.Actor, volume string) string {
	for _, v := range a.GetStatus().GetExternalVolumes().GetVolumes() {
		if v.GetName() == volume {
			return v.GetStorageVolumeId()
		}
	}
	return ""
}

// TagFidelity reports whether a tag holds memory or only filesystem state.
func TagFidelity(t *ateapi.Tag) ateapi.SnapshotFidelity {
	return t.GetStatus().GetSnapshot().GetFidelity()
}
