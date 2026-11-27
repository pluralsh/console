package core

import (
	"encoding/json"
	"sync"
	"time"

	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/actors"
)

// Record is the durable state of an instance (see Records), so a restarted gateway can reconcile with console's
// RegisterGateway summaries.
type Record struct {
	InstanceID  string `json:"instanceId"`
	DevboxID    string `json:"devboxId"`
	WorkbenchID string `json:"workbenchId,omitempty"`
	OwnerID     string `json:"ownerId,omitempty"`
	Runner      string `json:"runner"`

	Atespace         string `json:"atespace"`
	Actor            string `json:"actor"`
	Template         string `json:"template,omitempty"`
	TemplateRevision int64  `json:"templateRevision,omitempty"`
	ImageDigest      string `json:"imageDigest,omitempty"`
	// DaemonVersion is the devbox-daemon of TemplateRevision's runtime sidecar.
	DaemonVersion string `json:"daemonVersion,omitempty"`

	// Rebase is set from when the actor is pointed at another revision's template until it has started there
	// once. It is how to get back if it doesn't start.
	Rebase *RebaseIntent `json:"rebase,omitempty"`
	// RebaseState, RebaseMessage and RebaseRevision describe the last move to another revision (RebaseState).
	RebaseState    string `json:"rebaseState,omitempty"`
	RebaseMessage  string `json:"rebaseMessage,omitempty"`
	RebaseRevision int64  `json:"rebaseRevision,omitempty"`
	// SkipRevision is a revision the instance didn't start on; the runner's onResume policy won't try it again.
	SkipRevision int64 `json:"skipRevision,omitempty"`

	Status          string    `json:"status"`
	SuspendReason   string    `json:"suspendReason,omitempty"`
	Message         string    `json:"message,omitempty"`
	RestoredFrom    string    `json:"restoredFrom,omitempty"`
	RestoreFidelity string    `json:"restoreFidelity,omitempty"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
	SuspendedAt     time.Time `json:"suspendedAt,omitempty"`

	// Request is the protojson CreateInstanceRequest, kept current with allowlist and billing changes.
	Request json.RawMessage `json:"request"`
}

// RebaseIntent is the revision an instance was on before its actor was pointed at another template.
type RebaseIntent struct {
	FromTemplate      string `json:"fromTemplate"`
	FromRevision      int64  `json:"fromRevision"`
	FromImageDigest   string `json:"fromImageDigest,omitempty"`
	FromDaemonVersion string `json:"fromDaemonVersion,omitempty"`
	ToTemplate        string `json:"toTemplate"`
	ToRevision        int64  `json:"toRevision"`
}

func (r *Record) rebaseState() devboxv1.RebaseState {
	return devboxv1.RebaseState(devboxv1.RebaseState_value[r.RebaseState])
}

// failRebase records that the move to revision failed.
func (r *Record) failRebase(revision int64, message string) {
	r.RebaseState = devboxv1.RebaseState_REBASE_STATE_FAILED.String()
	r.RebaseMessage = message
	r.RebaseRevision = revision
}

// ActorID is "<atespace>/<actor>".
func (r *Record) ActorID() string { return r.Atespace + "/" + r.Actor }

func (r *Record) status() devboxv1.InstanceStatus {
	return devboxv1.InstanceStatus(devboxv1.InstanceStatus_value[r.Status])
}

// awake is whether an instance in this status has its daemon up.
func awake(s devboxv1.InstanceStatus) bool {
	return s == devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING || s == devboxv1.InstanceStatus_INSTANCE_STATUS_SNAPSHOTTING
}

func (r *Record) request() *devboxv1.CreateInstanceRequest {
	req := &devboxv1.CreateInstanceRequest{}
	_ = protojson.UnmarshalOptions{DiscardUnknown: true}.Unmarshal(r.Request, req)
	return req
}

func (r *Record) setRequest(req *devboxv1.CreateInstanceRequest) {
	data, _ := protojson.Marshal(req)
	r.Request = data
}

// Instance is one devbox instance managed by this gateway.
type Instance struct {
	ID string

	// op serializes lifecycle operations (provision, suspend, resume, snapshot, cancel).
	op sync.Mutex

	mu          sync.Mutex
	rec         Record
	req         *devboxv1.CreateInstanceRequest
	runner      *Runner
	leases      []*devboxv1.Lease
	leaseGen    uint64
	idle        *devboxv1.IdleState
	conditions  map[string]*devboxv1.ErrorDetail
	aggregate   *devboxv1.InstanceAggregate
	lastContact time.Time
	awakeSince  time.Time
	fwd         *forwarder
	suspending  bool
	// probing is set while confirmUnresponsive checks a silent daemon.
	probing bool
	// waking is the resume in flight, shared by every caller that needs the instance running.
	waking     *wakeOp
	sharedSnap bool
	// scmHosts are the hosts of the box's SCM connections as console reports them; nil until fetched.
	scmHosts []string
}

func newInstance(rec Record) *Instance {
	inst := &Instance{ID: rec.InstanceID, rec: rec, conditions: map[string]*devboxv1.ErrorDetail{}}
	inst.req = rec.request()
	inst.leases = inst.req.GetLeases()
	return inst
}

func (i *Instance) ActorID() string {
	i.mu.Lock()
	defer i.mu.Unlock()
	return i.rec.ActorID()
}

func (i *Instance) ref() actors.Ref {
	i.mu.Lock()
	defer i.mu.Unlock()
	return actors.Ref{Atespace: i.rec.Atespace, Name: i.rec.Actor}
}

func (i *Instance) status() devboxv1.InstanceStatus {
	i.mu.Lock()
	defer i.mu.Unlock()
	return i.rec.status()
}

func (i *Instance) record() Record {
	i.mu.Lock()
	defer i.mu.Unlock()
	return i.rec
}

func (i *Instance) request() *devboxv1.CreateInstanceRequest {
	i.mu.Lock()
	defer i.mu.Unlock()
	return proto.Clone(i.req).(*devboxv1.CreateInstanceRequest)
}

func (i *Instance) updateRequest(fn func(*devboxv1.CreateInstanceRequest)) Record {
	i.mu.Lock()
	defer i.mu.Unlock()
	fn(i.req)
	i.rec.setRequest(i.req)
	return i.rec
}

// inUse reports whether the instance is running and its daemon hasn't reported it idle.
func (i *Instance) inUse() bool {
	i.mu.Lock()
	defer i.mu.Unlock()
	return i.rec.status() == devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING && !i.idle.GetIdle()
}

func (i *Instance) idlePolicy() *devboxv1.IdlePolicy {
	i.mu.Lock()
	defer i.mu.Unlock()
	if p := i.req.GetIdlePolicy(); p != nil {
		return p
	}
	if i.runner != nil && i.runner.IdlePolicy != nil {
		return i.runner.IdlePolicy
	}
	return defaultIdlePolicy
}

func (i *Instance) forwarder() *forwarder {
	i.mu.Lock()
	defer i.mu.Unlock()
	return i.fwd
}

func (i *Instance) stopForwarder() {
	i.mu.Lock()
	f := i.fwd
	i.fwd = nil
	i.mu.Unlock()
	if f != nil {
		f.stop()
	}
}

func terminal(s devboxv1.InstanceStatus) bool {
	switch s {
	case devboxv1.InstanceStatus_INSTANCE_STATUS_COMPLETED, devboxv1.InstanceStatus_INSTANCE_STATUS_FAILED,
		devboxv1.InstanceStatus_INSTANCE_STATUS_CANCELLED:
		return true
	}
	return false
}

// activeLease reports whether a viewer or deferral lease is in force.
func (i *Instance) activeLease(now time.Time) bool {
	i.mu.Lock()
	defer i.mu.Unlock()
	for _, l := range i.leases {
		if l.GetExpiresAt() == nil || l.GetExpiresAt().AsTime().After(now) {
			return true
		}
	}
	return false
}
