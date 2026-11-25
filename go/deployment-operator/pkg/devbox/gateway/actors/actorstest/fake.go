// Package actorstest is an in-memory substrate.ateapi.v1.Control server for gateway tests.
package actorstest

import (
	"context"
	"fmt"
	"net"
	"sync"
	"testing"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
	"google.golang.org/grpc/test/bufconn"
	"google.golang.org/protobuf/proto"

	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
)

// Server fakes the actor, egress policy, tag and worker RPCs of ate-api-server. Resumes and suspends complete
// immediately. Every call is recorded in Calls as "<Method> <atespace>/<name>".
type Server struct {
	ateapi.UnimplementedControlServer

	mu       sync.Mutex
	Actors   map[string]*ateapi.Actor
	Policies map[string]*ateapi.EgressPolicy
	Tags     map[string]*ateapi.Tag
	Workers  []*ateapi.Worker
	Calls    []string
	// SuspendModes records the durability mode of each SuspendActor call.
	SuspendModes []ateapi.DurabilityMode
	// TagFidelity is the fidelity of tags created from actors, MEMORY by default.
	TagFidelity ateapi.SnapshotFidelity
	// FailResume, when set, makes ResumeActor fail with it.
	FailResume error
	// FailResumeTimes, when positive, limits FailResume to that many calls.
	FailResumeTimes int
	// FailSuspend, when set, makes SuspendActor fail with it after marking the actor SUSPENDING, like a checkpoint
	// cut off midway.
	FailSuspend error
	// FailSuspendTimes, when positive, limits FailSuspend to that many calls.
	FailSuspendTimes int
	// Previews records the actors created with the preview header.
	Previews map[string]bool
	// ExternalHomes makes GetActor report an external "home" volume, named like Substrate's, on every actor.
	ExternalHomes bool

	version int64
}

func New() *Server {
	return &Server{
		Actors:      map[string]*ateapi.Actor{},
		Policies:    map[string]*ateapi.EgressPolicy{},
		Tags:        map[string]*ateapi.Tag{},
		TagFidelity: ateapi.SnapshotFidelity_SNAPSHOT_FIDELITY_MEMORY,
	}
}

// Dial serves the fake on a bufconn listener and returns a connected client conn.
func (s *Server) Dial(t testing.TB) *grpc.ClientConn {
	t.Helper()
	lis := bufconn.Listen(1 << 20)
	srv := grpc.NewServer()
	ateapi.RegisterControlServer(srv, s)
	go func() { _ = srv.Serve(lis) }()
	conn, err := grpc.NewClient("passthrough:///bufnet",
		grpc.WithContextDialer(func(ctx context.Context, _ string) (net.Conn, error) { return lis.DialContext(ctx) }),
		grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_ = conn.Close()
		srv.Stop()
	})
	return conn
}

func key(r *ateapi.ObjectRef) string { return r.GetAtespace() + "/" + r.GetName() }

func (s *Server) record(method string, r *ateapi.ObjectRef) {
	s.Calls = append(s.Calls, method+" "+key(r))
}

// CallsSnapshot returns a copy of the recorded calls.
func (s *Server) CallsSnapshot() []string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([]string(nil), s.Calls...)
}

// SuspendModesSnapshot returns a copy of the recorded suspend durability modes.
func (s *Server) SuspendModesSnapshot() []ateapi.DurabilityMode {
	s.mu.Lock()
	defer s.mu.Unlock()
	return append([]ateapi.DurabilityMode(nil), s.SuspendModes...)
}

// State returns an actor's state, or UNSPECIFIED when it doesn't exist.
func (s *Server) State(atespace, name string) ateapi.ActorState {
	s.mu.Lock()
	defer s.mu.Unlock()
	a := s.Actors[atespace+"/"+name]
	return a.GetStatus().GetState()
}

// SetState forces an actor's state.
func (s *Server) SetState(atespace, name string, st ateapi.ActorState, worker string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	a := s.Actors[atespace+"/"+name]
	if a == nil {
		return
	}
	a.Status = &ateapi.ActorStatus{State: st}
	if worker != "" {
		a.Status.WorkerAssignment = &ateapi.WorkerAssignment{Worker: &ateapi.ObjectRef{Name: worker}}
	}
}

// Policy returns a copy of an actor's egress policy.
func (s *Server) Policy(atespace, name string) *ateapi.EgressPolicy {
	s.mu.Lock()
	defer s.mu.Unlock()
	p := s.Policies[atespace+"/"+name]
	if p == nil {
		return nil
	}
	return proto.Clone(p).(*ateapi.EgressPolicy)
}

func (s *Server) nextVersion() int64 {
	s.version++
	return s.version
}

func (s *Server) GetActor(_ context.Context, req *ateapi.GetActorRequest) (*ateapi.Actor, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	a, ok := s.Actors[key(req.GetActor())]
	if !ok {
		return nil, status.Errorf(codes.NotFound, "actor %s not found", key(req.GetActor()))
	}
	out := proto.Clone(a).(*ateapi.Actor)
	if s.ExternalHomes {
		if out.Status == nil {
			out.Status = &ateapi.ActorStatus{}
		}
		out.Status.ExternalVolumes = &ateapi.ExternalVolumes{Volumes: []*ateapi.ExternalVolumeStatus{
			{Name: "home", StorageVolumeId: "substrate-" + a.GetMetadata().GetUid() + "-home"},
		}}
	}
	return out, nil
}

// Preview reports whether an actor was created with the preview header.
func (s *Server) Preview(atespace, name string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.Previews[atespace+"/"+name]
}

func (s *Server) CreateActor(ctx context.Context, req *ateapi.CreateActorRequest) (*ateapi.Actor, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	ref := &ateapi.ObjectRef{Atespace: req.GetActor().GetMetadata().GetAtespace(), Name: req.GetActor().GetMetadata().GetName()}
	s.record("CreateActor", ref)
	if _, ok := s.Actors[key(ref)]; ok {
		return nil, status.Error(codes.AlreadyExists, "actor exists")
	}
	if md, _ := metadata.FromIncomingContext(ctx); len(md.Get(substrate.PreviewHeader)) > 0 {
		if s.Previews == nil {
			s.Previews = map[string]bool{}
		}
		s.Previews[key(ref)] = true
	}
	a := proto.Clone(req.GetActor()).(*ateapi.Actor)
	a.Metadata.Uid = fmt.Sprintf("uid-%d", s.nextVersion())
	a.Metadata.Version = s.version
	a.Status = &ateapi.ActorStatus{State: ateapi.ActorState_ACTOR_STATE_SUSPENDED}
	s.Actors[key(ref)] = a
	return proto.Clone(a).(*ateapi.Actor), nil
}

func (s *Server) UpdateActor(_ context.Context, req *ateapi.UpdateActorRequest) (*ateapi.Actor, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	ref := &ateapi.ObjectRef{Atespace: req.GetActor().GetMetadata().GetAtespace(), Name: req.GetActor().GetMetadata().GetName()}
	s.record("UpdateActor", ref)
	a, ok := s.Actors[key(ref)]
	if !ok {
		return nil, status.Error(codes.NotFound, "actor not found")
	}
	a.ActorTemplate = req.GetActor().GetActorTemplate()
	return proto.Clone(a).(*ateapi.Actor), nil
}

func (s *Server) SuspendActor(_ context.Context, req *ateapi.SuspendActorRequest) (*ateapi.SuspendActorResponse, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.record("SuspendActor", req.GetActor())
	s.SuspendModes = append(s.SuspendModes, req.GetOptions().GetMode())
	a, ok := s.Actors[key(req.GetActor())]
	if !ok {
		return nil, status.Error(codes.NotFound, "actor not found")
	}
	// like Substrate's workflow: a SUSPENDED actor is done, and a re-entered suspend finishes a SUSPENDING one
	switch st := a.GetStatus().GetState(); st {
	case ateapi.ActorState_ACTOR_STATE_SUSPENDED:
		return &ateapi.SuspendActorResponse{}, nil
	case ateapi.ActorState_ACTOR_STATE_RUNNING, ateapi.ActorState_ACTOR_STATE_SUSPENDING:
	default:
		return nil, status.Errorf(codes.FailedPrecondition, "MarkSuspending prerequisite not met (got: %s, want ACTOR_STATE_RUNNING)", st)
	}
	if err := takeFailure(&s.FailSuspend, &s.FailSuspendTimes); err != nil {
		a.Status = &ateapi.ActorStatus{State: ateapi.ActorState_ACTOR_STATE_SUSPENDING, WorkerAssignment: a.GetStatus().GetWorkerAssignment()}
		return nil, err
	}
	a.Status = &ateapi.ActorStatus{State: ateapi.ActorState_ACTOR_STATE_SUSPENDED}
	return &ateapi.SuspendActorResponse{}, nil
}

// takeFailure returns *fail, clearing it once *times runs out.
func takeFailure(fail *error, times *int) error {
	err := *fail
	if err != nil && *times > 0 {
		if *times--; *times == 0 {
			*fail = nil
		}
	}
	return err
}

func (s *Server) ResumeActor(_ context.Context, req *ateapi.ResumeActorRequest) (*ateapi.ResumeActorResponse, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.record("ResumeActor", req.GetActor())
	if err := takeFailure(&s.FailResume, &s.FailResumeTimes); err != nil {
		return nil, err
	}
	a, ok := s.Actors[key(req.GetActor())]
	if !ok {
		return nil, status.Error(codes.NotFound, "actor not found")
	}
	// like Substrate's workflow: a RUNNING actor is done, and a re-entered resume finishes a RESUMING one
	switch st := a.GetStatus().GetState(); st {
	case ateapi.ActorState_ACTOR_STATE_RUNNING:
		return &ateapi.ResumeActorResponse{}, nil
	case ateapi.ActorState_ACTOR_STATE_SUSPENDED, ateapi.ActorState_ACTOR_STATE_RESUMING:
	default:
		return nil, status.Errorf(codes.FailedPrecondition, "AssignWorker prerequisite not met for Actor: %s (got: %s, want ACTOR_STATE_SUSPENDED)", key(req.GetActor()), st)
	}
	a.Status = &ateapi.ActorStatus{
		State:            ateapi.ActorState_ACTOR_STATE_RUNNING,
		WorkerAssignment: &ateapi.WorkerAssignment{Worker: &ateapi.ObjectRef{Name: "worker-1"}},
	}
	return &ateapi.ResumeActorResponse{}, nil
}

func (s *Server) RevertActor(_ context.Context, req *ateapi.RevertActorRequest) (*ateapi.RevertActorResponse, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.record("RevertActor", req.GetActor())
	a, ok := s.Actors[key(req.GetActor())]
	if !ok {
		return nil, status.Error(codes.NotFound, "actor not found")
	}
	a.Status = &ateapi.ActorStatus{State: ateapi.ActorState_ACTOR_STATE_SUSPENDED}
	return &ateapi.RevertActorResponse{}, nil
}

func (s *Server) DeleteActor(_ context.Context, req *ateapi.DeleteActorRequest) (*ateapi.Actor, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.record("DeleteActor", req.GetActor())
	a, ok := s.Actors[key(req.GetActor())]
	if !ok {
		return nil, status.Error(codes.NotFound, "actor not found")
	}
	delete(s.Actors, key(req.GetActor()))
	return a, nil
}

func (s *Server) ListActors(_ context.Context, req *ateapi.ListActorsRequest) (*ateapi.ListActorsResponse, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	resp := &ateapi.ListActorsResponse{}
	for _, a := range s.Actors {
		if req.GetAtespace() == "" || a.GetMetadata().GetAtespace() == req.GetAtespace() {
			resp.Actors = append(resp.Actors, proto.Clone(a).(*ateapi.Actor))
		}
	}
	return resp, nil
}

func (s *Server) ListWorkers(context.Context, *ateapi.ListWorkersRequest) (*ateapi.ListWorkersResponse, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	resp := &ateapi.ListWorkersResponse{}
	for _, w := range s.Workers {
		resp.Workers = append(resp.Workers, proto.Clone(w).(*ateapi.Worker))
	}
	return resp, nil
}

// SetWorker adds or replaces a worker with the given state.
func (s *Server) SetWorker(name string, st ateapi.WorkerState) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, w := range s.Workers {
		if w.GetMetadata().GetName() == name {
			w.Status = &ateapi.WorkerStatus{State: st}
			return
		}
	}
	s.Workers = append(s.Workers, &ateapi.Worker{Metadata: &ateapi.ResourceMetadata{Name: name}, Status: &ateapi.WorkerStatus{State: st}})
}

func (s *Server) GetActorEgressPolicy(_ context.Context, req *ateapi.GetActorEgressPolicyRequest) (*ateapi.EgressPolicy, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	p, ok := s.Policies[key(req.GetActor())]
	if !ok {
		return nil, status.Error(codes.NotFound, "policy not found")
	}
	return proto.Clone(p).(*ateapi.EgressPolicy), nil
}

func (s *Server) CreateActorEgressPolicy(_ context.Context, req *ateapi.CreateActorEgressPolicyRequest) (*ateapi.EgressPolicy, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.record("CreateActorEgressPolicy", req.GetActor())
	if _, ok := s.Actors[key(req.GetActor())]; !ok {
		return nil, status.Error(codes.NotFound, "actor not found")
	}
	if _, ok := s.Policies[key(req.GetActor())]; ok {
		return nil, status.Error(codes.AlreadyExists, "policy exists")
	}
	p := proto.Clone(req.GetEgressPolicy()).(*ateapi.EgressPolicy)
	p.Metadata.Uid = fmt.Sprintf("puid-%d", s.nextVersion())
	p.Metadata.Version = s.version
	s.Policies[key(req.GetActor())] = p
	return proto.Clone(p).(*ateapi.EgressPolicy), nil
}

func (s *Server) UpdateActorEgressPolicy(_ context.Context, req *ateapi.UpdateActorEgressPolicyRequest) (*ateapi.EgressPolicy, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.record("UpdateActorEgressPolicy", req.GetActor())
	cur, ok := s.Policies[key(req.GetActor())]
	if !ok {
		return nil, status.Error(codes.NotFound, "policy not found")
	}
	if cur.GetMetadata().GetUid() != req.GetEgressPolicy().GetMetadata().GetUid() ||
		cur.GetMetadata().GetVersion() != req.GetEgressPolicy().GetMetadata().GetVersion() {
		return nil, status.Error(codes.Aborted, "precondition failed")
	}
	p := proto.Clone(req.GetEgressPolicy()).(*ateapi.EgressPolicy)
	p.Metadata.Version = s.nextVersion()
	s.Policies[key(req.GetActor())] = p
	return proto.Clone(p).(*ateapi.EgressPolicy), nil
}

func (s *Server) DeleteActorEgressPolicy(_ context.Context, req *ateapi.DeleteActorEgressPolicyRequest) (*ateapi.EgressPolicy, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.record("DeleteActorEgressPolicy", req.GetActor())
	p, ok := s.Policies[key(req.GetActor())]
	if !ok {
		return nil, status.Error(codes.NotFound, "policy not found")
	}
	delete(s.Policies, key(req.GetActor()))
	return p, nil
}

func (s *Server) CreateTag(_ context.Context, req *ateapi.CreateTagRequest) (*ateapi.Tag, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	ref := &ateapi.ObjectRef{Atespace: req.GetTag().GetMetadata().GetAtespace(), Name: req.GetTag().GetMetadata().GetName()}
	s.record("CreateTag", ref)
	if _, ok := s.Tags[key(ref)]; ok {
		return nil, status.Error(codes.AlreadyExists, "tag exists")
	}
	src, ok := s.Actors[key(req.GetTag().GetSourceActor())]
	if !ok {
		return nil, status.Error(codes.NotFound, "source actor not found")
	}
	if src.GetStatus().GetState() != ateapi.ActorState_ACTOR_STATE_SUSPENDED {
		return nil, status.Errorf(codes.FailedPrecondition, "source actor is %s", src.GetStatus().GetState())
	}
	t := proto.Clone(req.GetTag()).(*ateapi.Tag)
	t.Status = &ateapi.TagStatus{Snapshot: &ateapi.Snapshot{
		Fidelity:        s.TagFidelity,
		DurableSnapshot: &ateapi.SnapshotStorage{State: ateapi.SnapshotStorageState_SNAPSHOT_STORAGE_STATE_COMPLETED},
	}}
	s.Tags[key(ref)] = t
	return proto.Clone(t).(*ateapi.Tag), nil
}

func (s *Server) GetTag(_ context.Context, req *ateapi.GetTagRequest) (*ateapi.Tag, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	t, ok := s.Tags[key(req.GetTag())]
	if !ok {
		return nil, status.Error(codes.NotFound, "tag not found")
	}
	return proto.Clone(t).(*ateapi.Tag), nil
}

func (s *Server) DeleteTag(_ context.Context, req *ateapi.DeleteTagRequest) (*ateapi.Tag, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.record("DeleteTag", req.GetTag())
	t, ok := s.Tags[key(req.GetTag())]
	if !ok {
		return nil, status.Error(codes.NotFound, "tag not found")
	}
	delete(s.Tags, key(req.GetTag()))
	return t, nil
}
