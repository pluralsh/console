package agents

import (
	"context"
	"errors"
	"slices"
	"strings"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/protobuf/types/known/timestamppb"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/acp"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/derr"
)

// cancelGrace is how long a cancelled turn may take to return its `cancelled` stop reason before the daemon
// abandons the request.
const cancelGrace = 15 * time.Second

// promptMessageID is the user_message entity ID for a prompt: deterministic, so a retried prompt maps to the
// same entity.
func promptMessageID(promptID string) string { return "prompt-" + promptID }

// Prompt accepts a prompt for a thread. A prompt to an idle thread under the running-thread limit is sent at
// once; otherwise it is held (QUEUED) and the thread shows WAITING while it's behind the limit. A repeated
// prompt_id is a no-op (DUPLICATE).
func (m *Manager) Prompt(ctx context.Context, req *devboxv1.PromptRequest) (*devboxv1.PromptResponse, error) {
	if req.GetPromptId() == "" {
		return nil, derr.New(codes.InvalidArgument, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED, "prompt_id is required", nil)
	}
	if len(req.GetContent()) == 0 && len(req.GetAttachments()) == 0 {
		return nil, derr.New(codes.InvalidArgument, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED, "prompt has no content", nil)
	}
	if _, err := acp.ContentBlocksJSON(req.GetContent()); err != nil {
		return nil, derr.New(codes.InvalidArgument, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED, err.Error(), nil)
	}
	m.mu.Lock()
	_, err := m.threadLocked(req.GetThread())
	m.mu.Unlock()
	if err != nil {
		return nil, err
	}
	content, err := m.stageAttachments(req)
	if err != nil {
		return nil, err
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	t, err := m.threadLocked(req.GetThread())
	if err != nil {
		return nil, err
	}
	resp := &devboxv1.PromptResponse{PromptId: req.GetPromptId()}
	if msg, dup := t.prompts[req.GetPromptId()]; dup {
		resp.Disposition = devboxv1.PromptDisposition_PROMPT_DISPOSITION_DUPLICATE
		resp.MessageId = msg
		return resp, nil
	}
	if t.closed {
		t.closed = false
		t.dirty = true
	}
	qp := &queuedPrompt{promptID: req.GetPromptId(), messageID: promptMessageID(req.GetPromptId()), content: content, sentBy: req.GetSentBy(), queuedAt: m.clock.Now()}
	t.rememberPrompt(qp.promptID, qp.messageID)
	t.notePromptText(req.GetContent())
	m.dirty = true
	resp.MessageId = qp.messageID
	if m.enqueueLocked(t, qp) {
		resp.Disposition = devboxv1.PromptDisposition_PROMPT_DISPOSITION_SENT
	} else {
		resp.Disposition = devboxv1.PromptDisposition_PROMPT_DISPOSITION_QUEUED
	}
	return resp, nil
}

// enqueueLocked queues a prompt and starts it if the thread and the instance allow; reports whether it started.
func (m *Manager) enqueueLocked(t *thread, qp *queuedPrompt) bool {
	t.queue = append(t.queue, qp)
	t.dirty = true
	if t.running || t.waiting {
		return false
	}
	if m.running < m.opts.MaxRunning && len(m.waitQ) == 0 {
		m.startTurnLocked(t)
		return true
	}
	m.waitLocked(t)
	return false
}

func (m *Manager) waitLocked(t *thread) {
	if t.waiting {
		return
	}
	t.waiting = true
	t.dirty = true
	m.waitQ = append(m.waitQ, t)
}

func (m *Manager) removeFromWaitLocked(t *thread) {
	if !t.waiting {
		return
	}
	t.waiting = false
	t.dirty = true
	for i, w := range m.waitQ {
		if w == t {
			m.waitQ = append(m.waitQ[:i], m.waitQ[i+1:]...)
			break
		}
	}
}

// pumpLocked starts waiting threads, first come first served, while there is room under the limit.
func (m *Manager) pumpLocked() {
	for len(m.waitQ) > 0 && m.running < m.opts.MaxRunning {
		t := m.waitQ[0]
		m.waitQ = m.waitQ[1:]
		t.waiting = false
		t.dirty = true
		if t.open() && !t.running && len(t.queue) > 0 {
			m.startTurnLocked(t)
		}
	}
}

func (m *Manager) startTurnLocked(t *thread) {
	qp := t.queue[0]
	t.queue = t.queue[1:]
	t.running = true
	t.dirty = true
	m.running++
	ctx, cancel := context.WithCancel(m.ctx)
	t.turnCancel = cancel
	go m.runTurn(ctx, t, qp)
}

func (m *Manager) turnDoneLocked(t *thread) {
	if t.turnCancel != nil {
		t.turnCancel()
		t.turnCancel = nil
	}
	t.running = false
	t.dirty = true
	m.running--
	if len(t.queue) > 0 && t.open() {
		if m.running < m.opts.MaxRunning && len(m.waitQ) == 0 {
			m.startTurnLocked(t)
		} else {
			m.waitLocked(t)
		}
	}
	m.pumpLocked()
}

func (m *Manager) runTurn(ctx context.Context, t *thread, qp *queuedPrompt) {
	fail := func(err error) {
		m.mu.Lock()
		defer m.mu.Unlock()
		if t.session != nil {
			m.setForegroundLocked(t.session, &devboxv1.ForegroundState{
				State: devboxv1.ForegroundStateKind_FOREGROUND_STATE_KIND_IDLE, StopReason: "error",
				Error: agentErrorOf(err), UpdatedAt: timestamppb.New(m.clock.Now()),
			})
		}
		m.turnDoneLocked(t)
	}
	c, err := m.connection(ctx, t.agent)
	if err != nil {
		fail(err)
		return
	}
	if err := m.ensureAttached(ctx, c, t, false); err != nil {
		fail(err)
		return
	}
	blocks, _ := acp.ContentBlocksJSON(qp.content)

	m.mu.Lock()
	s := t.session
	c.norm.TurnStarted(s.id)
	e, _ := s.store.Apply(acp.Change{
		Kind: acp.ChangePatch, SessionID: s.id, EntityType: devboxv1.EntityType_ENTITY_TYPE_USER_MESSAGE, EntityID: qp.messageID,
		Patch: acp.Object{"content": blocks},
	}, m.clock.Now())
	e.PromptID, e.SentBy = qp.promptID, qp.sentBy
	payload := acp.Object{"sessionUpdate": "user_message", "messageId": qp.messageID, "content": blocks}
	m.emitDeltaLocked(&devboxv1.Delta{
		SessionId: s.id, EntityType: e.Type, EntityId: e.ID, Position: e.Position, Op: devboxv1.DeltaOp_DELTA_OP_PATCH, PayloadJson: acp.MustJSON(payload),
	})
	m.settleLocked(s, e)
	s.lastActivity = m.clock.Now()
	m.setForegroundLocked(s, &devboxv1.ForegroundState{State: devboxv1.ForegroundStateKind_FOREGROUND_STATE_KIND_RUNNING, UpdatedAt: timestamppb.New(m.clock.Now())})
	sid := s.id
	m.mu.Unlock()

	params := map[string]any{"sessionId": sid, "prompt": m.agentPrompt(c, t, qp.content)}
	if c.caps.protocolVersion >= 2 {
		params["messageId"] = qp.messageID
	}
	res, err := c.call(ctx, acp.MethodSessionPrompt, params)

	m.mu.Lock()
	defer m.mu.Unlock()
	fg := &devboxv1.ForegroundState{State: devboxv1.ForegroundStateKind_FOREGROUND_STATE_KIND_IDLE, UpdatedAt: timestamppb.New(m.clock.Now())}
	switch {
	case err != nil && (errors.Is(err, context.Canceled) || ctx.Err() != nil):
		fg.StopReason = "cancelled"
	case err != nil:
		fg.StopReason = "error"
		fg.Error = agentErrorOf(err)
	default:
		fg.StopReason = acp.Str(res, "stopReason")
		if u := acp.Obj(res, "usage"); u != nil {
			if s.usage == nil {
				s.usage = &devboxv1.Usage{}
			}
			s.usage.Meta = acp.StructOf(acp.Object{"lastTurn": u})
		}
		fg.Meta = acp.MetaStruct(res)
	}
	for _, in := range m.interactions {
		if in.proto.GetThreadId() == t.id && in.proto.GetState() == devboxv1.InteractionState_INTERACTION_STATE_PENDING {
			m.resolveInteractionLocked(in, devboxv1.InteractionState_INTERACTION_STATE_CANCELLED, nil, nil)
		}
	}
	m.setForegroundLocked(s, fg)
	for _, child := range m.childrenLocked(s.id) {
		if child.foreground.GetState() != devboxv1.ForegroundStateKind_FOREGROUND_STATE_KIND_IDLE {
			m.setForegroundLocked(child, &devboxv1.ForegroundState{State: devboxv1.ForegroundStateKind_FOREGROUND_STATE_KIND_IDLE, UpdatedAt: fg.UpdatedAt})
		}
	}
	m.turnDoneLocked(t)
}

// UpdateQueuedPrompt edits, drops or promotes a held prompt. A prompt that already started (or was dropped) is
// left alone and reported as not updated, so a stale shelf can't touch a turn in progress.
func (m *Manager) UpdateQueuedPrompt(ctx context.Context, req *devboxv1.UpdateQueuedPromptRequest) (*devboxv1.UpdateQueuedPromptResponse, error) {
	m.mu.Lock()
	t, err := m.threadLocked(req.GetThread())
	if err != nil {
		m.mu.Unlock()
		return nil, err
	}
	i := t.queuedIndex(req.GetPromptId())
	if i < 0 {
		resp := &devboxv1.UpdateQueuedPromptResponse{QueuedPrompts: t.queuedProtos()}
		m.mu.Unlock()
		return resp, nil
	}
	var interrupt *agentConn
	switch req.GetAction() {
	case devboxv1.QueuedPromptAction_QUEUED_PROMPT_ACTION_EDIT:
		content := withText(t.queue[i].content, strings.TrimSpace(req.GetText()))
		if len(content) == 0 {
			m.mu.Unlock()
			return nil, derr.New(codes.InvalidArgument, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED, "prompt has no content", nil)
		}
		t.queue[i].content = content
	case devboxv1.QueuedPromptAction_QUEUED_PROMPT_ACTION_CANCEL:
		t.queue = slices.Delete(t.queue, i, i+1)
		if len(t.queue) == 0 {
			m.removeFromWaitLocked(t)
			m.pumpLocked()
		}
	case devboxv1.QueuedPromptAction_QUEUED_PROMPT_ACTION_SEND_NOW:
		qp := t.queue[i]
		t.queue = append([]*queuedPrompt{qp}, slices.Delete(t.queue, i, i+1)...)
		switch {
		case t.running:
			// the turn's end starts the front of the queue
			interrupt = m.conns[t.agent]
		case !t.waiting && t.open():
			if m.running < m.opts.MaxRunning && len(m.waitQ) == 0 {
				m.startTurnLocked(t)
			} else {
				m.waitLocked(t)
			}
		}
	default:
		m.mu.Unlock()
		return nil, derr.New(codes.InvalidArgument, devboxv1.ErrorReason_ERROR_REASON_UNSPECIFIED, "unknown queued prompt action", nil)
	}
	t.dirty = true
	m.dirty = true
	resp := &devboxv1.UpdateQueuedPromptResponse{Updated: true, QueuedPrompts: t.queuedProtos()}
	m.mu.Unlock()
	if interrupt != nil {
		if err := m.cancelTurn(ctx, interrupt, t); err != nil {
			return nil, err
		}
	}
	return resp, nil
}

// CancelPrompt cancels the thread's current turn (`session/cancel`). Held prompts stay queued.
func (m *Manager) CancelPrompt(ctx context.Context, ref *devboxv1.ThreadRef) (bool, error) {
	m.mu.Lock()
	t, err := m.threadLocked(ref)
	if err != nil {
		m.mu.Unlock()
		return false, err
	}
	if !t.running {
		m.mu.Unlock()
		return false, nil
	}
	c := m.conns[t.agent]
	m.mu.Unlock()
	if c == nil {
		return false, nil
	}
	return true, m.cancelTurn(ctx, c, t)
}

func (m *Manager) cancelTurn(ctx context.Context, c *agentConn, t *thread) error {
	m.mu.Lock()
	s := t.session
	for _, in := range m.interactions {
		if in.proto.GetThreadId() == t.id && in.proto.GetState() == devboxv1.InteractionState_INTERACTION_STATE_PENDING {
			m.resolveInteractionLocked(in, devboxv1.InteractionState_INTERACTION_STATE_CANCELLED, nil, nil)
		}
	}
	cancel := t.turnCancel
	m.mu.Unlock()
	if s == nil {
		return nil
	}
	err := c.conn.Notify(ctx, acp.MethodSessionCancel, map[string]any{"sessionId": s.id})
	if cancel != nil {
		time.AfterFunc(cancelGrace, cancel)
	}
	return err
}
