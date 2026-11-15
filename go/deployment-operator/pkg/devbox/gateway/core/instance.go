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

// ActorID is "<atespace>/<actor>".
func (r *Record) ActorID() string { return r.Atespace + "/" + r.Actor }

func (r *Record) status() devboxv1.InstanceStatus {
	return devboxv1.InstanceStatus(devboxv1.InstanceStatus_value[r.Status])
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
	sharedSnap  bool
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
