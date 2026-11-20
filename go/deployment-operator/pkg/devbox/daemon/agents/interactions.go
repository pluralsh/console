package agents

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/protobuf/types/known/timestamppb"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/acp"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/derr"
)

var permissionCancelled = map[string]any{"outcome": map[string]any{"outcome": "cancelled"}}

func (m *Manager) newInteractionLocked(s *session, kind devboxv1.InteractionKind, title, toolCallID string, raw json.RawMessage) *interaction {
	p := &devboxv1.Interaction{
		InteractionId: uuid.NewString(), SessionId: s.id, Kind: kind, State: devboxv1.InteractionState_INTERACTION_STATE_PENDING,
		Title: title, ToolCallId: toolCallID, CreatedAt: timestamppb.New(m.clock.Now()), Revision: 1, RawJson: raw,
	}
	if s.thread != nil {
		p.ThreadId = s.thread.id
	}
	in := &interaction{proto: p, session: s, resp: make(chan *devboxv1.InteractionResponse, 1)}
	m.interactions[p.InteractionId] = in
	return in
}

// publishInteractionLocked emits a new pending interaction and moves the thread to requires_action.
func (m *Manager) publishInteractionLocked(in *interaction) {
	m.emitLocked(&devboxv1.DaemonEvent{Event: &devboxv1.DaemonEvent_Interaction{Interaction: in.proto}})
	m.dirty = true
	if t := in.session.thread; t != nil && t.session != nil {
		m.setForegroundLocked(t.session, &devboxv1.ForegroundState{
			State: devboxv1.ForegroundStateKind_FOREGROUND_STATE_KIND_REQUIRES_ACTION, UpdatedAt: timestamppb.New(m.clock.Now()),
		})
	}
	if in.session.thread == nil || in.session != in.session.thread.session {
		m.setForegroundLocked(in.session, &devboxv1.ForegroundState{
			State: devboxv1.ForegroundStateKind_FOREGROUND_STATE_KIND_REQUIRES_ACTION, UpdatedAt: timestamppb.New(m.clock.Now()),
		})
	}
}

// resolveInteractionLocked records an interaction's outcome and releases the waiting agent request. A nil
// response for a non-answered state makes the request return "cancelled".
func (m *Manager) resolveInteractionLocked(in *interaction, state devboxv1.InteractionState, resp *devboxv1.InteractionResponse, by *devboxv1.Principal) {
	if in.proto.GetState() != devboxv1.InteractionState_INTERACTION_STATE_PENDING {
		return
	}
	p := in.proto
	p.State = state
	p.Response = resp
	p.AnsweredBy = by
	p.AnsweredAt = timestamppb.New(m.clock.Now())
	p.Revision++
	m.emitLocked(&devboxv1.DaemonEvent{Event: &devboxv1.DaemonEvent_Interaction{Interaction: p}})
	select {
	case in.resp <- resp:
	default:
	}
	m.dirty = true
	// Once the thread has nothing else pending it is back to running, or idle if its turn already ended, so it
	// doesn't keep reading as needing review.
	t := in.session.thread
	if t == nil || t.session == nil {
		return
	}
	for _, other := range m.interactions {
		if !other.reviewing && other.proto.GetThreadId() == t.id && other.proto.GetState() == devboxv1.InteractionState_INTERACTION_STATE_PENDING {
			return
		}
	}
	next := devboxv1.ForegroundStateKind_FOREGROUND_STATE_KIND_RUNNING
	if !t.running {
		next = devboxv1.ForegroundStateKind_FOREGROUND_STATE_KIND_IDLE
	}
	now := timestamppb.New(m.clock.Now())
	if t.running || t.session.foreground.GetState() == devboxv1.ForegroundStateKind_FOREGROUND_STATE_KIND_REQUIRES_ACTION {
		m.setForegroundLocked(t.session, &devboxv1.ForegroundState{State: next, UpdatedAt: now})
	}
	if in.session != t.session && (t.running || in.session.foreground.GetState() == devboxv1.ForegroundStateKind_FOREGROUND_STATE_KIND_REQUIRES_ACTION) {
		m.setForegroundLocked(in.session, &devboxv1.ForegroundState{State: next, UpdatedAt: now})
	}
}

// onPermissionRequest serves `session/request_permission`: it blocks until a human answers in console, the turn
// is cancelled or the agent withdraws the request.
func (m *Manager) onPermissionRequest(ctx context.Context, c *agentConn, params json.RawMessage) (any, *acp.RequestError) {
	p, err := acp.DecodeObject(params)
	if err != nil {
		return nil, &acp.RequestError{Code: -32602, Message: err.Error()}
	}
	sid := acp.Str(p, "sessionId")
	tc := acp.Obj(p, "toolCall")
	m.mu.Lock()
	s := m.sessions[sid]
	if s == nil {
		m.mu.Unlock()
		return permissionCancelled, nil
	}
	// The request carries a tool call update; apply it like any other so the timeline shows the pending call.
	if tc != nil {
		upd := acp.CloneJSON(tc).(map[string]any)
		upd["sessionUpdate"] = "tool_call_update"
		m.applyUpdateLocked(c, sid, upd)
	}
	pr := &devboxv1.PermissionRequest{ToolCall: acp.ToolCallOf(tc), Meta: acp.MetaStruct(p)}
	for _, o := range acp.Arr(p, "options") {
		if oo, ok := o.(map[string]any); ok {
			pr.Options = append(pr.Options, &devboxv1.PermissionOption{
				OptionId: acp.Str(oo, "optionId"), Name: acp.Str(oo, "name"), Kind: acp.Str(oo, "kind"), Meta: acp.MetaStruct(oo),
			})
		}
	}
	title := acp.Str(tc, "title")
	if title == "" {
		title = "Permission requested"
	}
	in := m.newInteractionLocked(s, devboxv1.InteractionKind_INTERACTION_KIND_PERMISSION, title, acp.Str(tc, "toolCallId"), params)
	in.proto.Request = &devboxv1.Interaction_Permission{Permission: pr}
	if id := m.autoApproveLocked(s, pr); id != "" {
		in.proto.AnsweredAt = in.proto.GetCreatedAt()
		return m.answerByPolicyLocked(in, id, AutonomyPrincipal(devboxv1.Autonomy_AUTONOMY_FULL)), nil
	}
	if m.reviewingLocked(s.thread) && allowOption(pr) != "" {
		in.reviewing = true
		rr := m.reviewRequestLocked(s, tc)
		m.mu.Unlock()
		review := m.review(ctx, rr)
		m.mu.Lock()
		in.reviewing = false
		in.proto.Review = review
		if in.proto.GetState() != devboxv1.InteractionState_INTERACTION_STATE_PENDING || ctx.Err() != nil {
			// Cancelled while under review: the turn was cancelled or the agent withdrew the request.
			m.resolveInteractionLocked(in, devboxv1.InteractionState_INTERACTION_STATE_CANCELLED, nil, nil)
			delete(m.interactions, in.proto.GetInteractionId())
			m.mu.Unlock()
			return permissionCancelled, nil
		}
		if review.GetEscalation() == "" {
			in.proto.AnsweredAt = timestamppb.New(m.clock.Now())
			return m.answerByPolicyLocked(in, allowOption(pr), ReviewerPrincipal()), nil
		}
		m.log.Info("reviewer escalated a permission request", "thread", in.proto.GetThreadId(), "verdict", review.GetVerdict(),
			"confidence", review.GetConfidence(), "risk", review.GetRisk(), "reason", review.GetEscalation())
	}
	m.publishInteractionLocked(in)
	m.mu.Unlock()

	resp := m.awaitInteraction(ctx, in)
	if po := resp.GetPermission(); po != nil && po.GetSelectedOptionId() != "" {
		return map[string]any{"outcome": map[string]any{"outcome": "selected", "optionId": po.GetSelectedOptionId()}}, nil
	}
	return permissionCancelled, nil
}

// answerByPolicyLocked records a permission request the daemon answered itself, so the timeline shows what was
// approved and by which policy, and returns the agent's response. It releases the lock.
func (m *Manager) answerByPolicyLocked(in *interaction, optionID string, by *devboxv1.Principal) any {
	in.proto.State = devboxv1.InteractionState_INTERACTION_STATE_ANSWERED
	in.proto.Response = &devboxv1.InteractionResponse{Response: &devboxv1.InteractionResponse_Permission{
		Permission: &devboxv1.PermissionOutcome{Outcome: &devboxv1.PermissionOutcome_SelectedOptionId{SelectedOptionId: optionID}},
	}}
	in.proto.AnsweredBy = by
	m.emitLocked(&devboxv1.DaemonEvent{Event: &devboxv1.DaemonEvent_Interaction{Interaction: in.proto}})
	delete(m.interactions, in.proto.GetInteractionId())
	m.dirty = true
	m.mu.Unlock()
	return map[string]any{"outcome": map[string]any{"outcome": "selected", "optionId": optionID}}
}

// onElicitation serves `elicitation/create` (form and URL modes).
func (m *Manager) onElicitation(ctx context.Context, c *agentConn, params json.RawMessage) (any, *acp.RequestError) {
	p, err := acp.DecodeObject(params)
	if err != nil {
		return nil, &acp.RequestError{Code: -32602, Message: err.Error()}
	}
	sid := acp.Str(p, "sessionId")
	m.mu.Lock()
	s := m.sessions[sid]
	if s == nil {
		// Elicitations not tied to a known session go to the agent's most recently active thread.
		for _, cand := range m.sessions {
			if cand.agent == c.agent && cand.kind == devboxv1.SessionKind_SESSION_KIND_THREAD && (s == nil || cand.lastActivity.After(s.lastActivity)) {
				s = cand
			}
		}
	}
	if s == nil {
		m.mu.Unlock()
		return map[string]any{"action": "cancel"}, nil
	}
	kind := devboxv1.InteractionKind_INTERACTION_KIND_ELICITATION_FORM
	if acp.Str(p, "mode") == "url" || acp.Str(p, "url") != "" {
		kind = devboxv1.InteractionKind_INTERACTION_KIND_ELICITATION_URL
	}
	er := &devboxv1.ElicitationRequest{
		Message: acp.Str(p, "message"), RequestedSchema: acp.StructOf(acp.Obj(p, "requestedSchema")), Url: acp.Str(p, "url"),
		ElicitationId: acp.Str(p, "elicitationId"), Meta: acp.MetaStruct(p),
	}
	title := er.GetMessage()
	if title == "" {
		title = "Input requested"
	}
	in := m.newInteractionLocked(s, kind, title, acp.Str(p, "toolCallId"), params)
	in.proto.Request = &devboxv1.Interaction_Elicitation{Elicitation: er}
	m.publishInteractionLocked(in)
	m.mu.Unlock()

	resp := m.awaitInteraction(ctx, in)
	if e := resp.GetElicitation(); e != nil && e.GetAction() != "" {
		out := map[string]any{"action": e.GetAction()}
		if e.GetContent() != nil && e.GetAction() == "accept" {
			out["content"] = e.GetContent().AsMap()
		}
		return out, nil
	}
	return map[string]any{"action": "cancel"}, nil
}

func (m *Manager) awaitInteraction(ctx context.Context, in *interaction) *devboxv1.InteractionResponse {
	select {
	case r := <-in.resp:
		return r
	case <-ctx.Done():
	case <-m.ctx.Done():
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	m.resolveInteractionLocked(in, devboxv1.InteractionState_INTERACTION_STATE_CANCELLED, nil, nil)
	return nil
}

// onElicitationComplete handles `elicitation/complete`: a URL-mode elicitation finished out of band.
func (m *Manager) onElicitationComplete(params json.RawMessage) {
	p, err := acp.DecodeObject(params)
	if err != nil {
		return
	}
	id := acp.Str(p, "elicitationId")
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, in := range m.interactions {
		if in.proto.GetElicitation().GetElicitationId() == id && id != "" {
			m.resolveInteractionLocked(in, devboxv1.InteractionState_INTERACTION_STATE_ANSWERED, &devboxv1.InteractionResponse{
				Response: &devboxv1.InteractionResponse_Elicitation{Elicitation: &devboxv1.ElicitationResponse{Action: "accept"}},
			}, nil)
		}
	}
}

// RespondInteraction answers a pending interaction. Answering one that is no longer pending returns it unchanged
// with STALE_REVISION.
func (m *Manager) RespondInteraction(req *devboxv1.RespondInteractionRequest) (*devboxv1.Interaction, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	in, ok := m.interactions[req.GetInteractionId()]
	if !ok {
		return nil, derr.New(codes.NotFound, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED, "interaction not found", map[string]string{"interaction_id": req.GetInteractionId()})
	}
	if in.proto.GetState() != devboxv1.InteractionState_INTERACTION_STATE_PENDING {
		return in.proto, derr.New(codes.FailedPrecondition, devboxv1.ErrorReason_ERROR_REASON_STALE_REVISION, "interaction is "+in.proto.GetState().String(), nil)
	}
	r := req.GetResponse()
	switch in.proto.GetKind() {
	case devboxv1.InteractionKind_INTERACTION_KIND_PERMISSION:
		po := r.GetPermission()
		if po == nil {
			return nil, derr.New(codes.InvalidArgument, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED, "permission response required", nil)
		}
		if po.GetCancelled() {
			m.resolveInteractionLocked(in, devboxv1.InteractionState_INTERACTION_STATE_CANCELLED, r, req.GetAnsweredBy())
			return in.proto, nil
		}
		valid := false
		for _, o := range in.proto.GetPermission().GetOptions() {
			valid = valid || o.GetOptionId() == po.GetSelectedOptionId()
		}
		if !valid {
			return nil, derr.New(codes.InvalidArgument, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED, "unknown permission option "+po.GetSelectedOptionId(), nil)
		}
	default:
		er := r.GetElicitation()
		if er == nil {
			return nil, derr.New(codes.InvalidArgument, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED, "elicitation response required", nil)
		}
		switch er.GetAction() {
		case "accept", "decline", "cancel":
		default:
			return nil, derr.New(codes.InvalidArgument, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED, "action must be accept, decline or cancel", nil)
		}
	}
	m.resolveInteractionLocked(in, devboxv1.InteractionState_INTERACTION_STATE_ANSWERED, r, req.GetAnsweredBy())
	return in.proto, nil
}

// Interactions returns pending interactions.
func (m *Manager) Interactions() []*devboxv1.Interaction {
	m.mu.Lock()
	defer m.mu.Unlock()
	var out []*devboxv1.Interaction
	for _, in := range m.interactions {
		if !in.reviewing && in.proto.GetState() == devboxv1.InteractionState_INTERACTION_STATE_PENDING {
			out = append(out, in.proto)
		}
	}
	return out
}
