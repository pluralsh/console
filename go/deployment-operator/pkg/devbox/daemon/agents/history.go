package agents

import (
	"context"
	"sort"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/transcript"
)

// maxTimelinePage caps GetTimeline pages.
const maxTimelinePage = 1000

// writeTranscriptLocked writes the settled revisions buffered since the last flush. On failure they stay buffered
// (and in timelines) for the next flush.
func (m *Manager) writeTranscriptLocked() {
	if len(m.unwritten) == 0 {
		return
	}
	batch := make([]*devboxv1.AcpEntity, 0, len(m.unwritten))
	for _, e := range m.unwritten {
		batch = append(batch, e)
	}
	// Stop's final flush runs after the manager's context is cancelled.
	if err := m.opts.Transcript.Append(context.WithoutCancel(m.ctx), batch); err != nil {
		m.log.Error("writing transcript", "entities", len(batch), "err", err)
		return
	}
	m.unwritten = map[entityRef]*devboxv1.AcpEntity{}
}

// Timeline pages a session's transcript (forwards from after_position, backwards from before_position, or the
// newest page), merged with its in-flight entities, and returns the event log head the page reflects: live deltas
// past it apply on top.
func (m *Manager) Timeline(ctx context.Context, req *devboxv1.GetTimelineRequest) (*devboxv1.GetTimelineResponse, error) {
	sessionID := req.GetSessionId()
	limit := int(req.GetLimit())
	if limit <= 0 {
		limit = 200
	}
	limit = min(limit, maxTimelinePage)

	m.mu.Lock()
	var overlay []*devboxv1.AcpEntity
	for k, e := range m.unwritten {
		if k.session == sessionID {
			overlay = append(overlay, e)
		}
	}
	if s := m.sessions[sessionID]; s != nil {
		for _, e := range s.store.Unsettled() {
			p := e.Proto()
			// The next settle bumps the revision; until then the in-flight copy must win over the last settled one.
			p.Revision++
			overlay = append(overlay, p)
		}
	}
	// Events are emitted under m.mu, so nothing reflected in the overlay is past this offset (or seq).
	head := m.opts.Head()
	seq, stream := m.seqs[sessionID], m.stream
	m.mu.Unlock()

	var page *transcript.Page
	var err error
	switch c := req.GetCursor().(type) {
	case *devboxv1.GetTimelineRequest_AfterPosition:
		page, err = m.opts.Transcript.Timeline(ctx, sessionID, c.AfterPosition, limit, overlay)
	case *devboxv1.GetTimelineRequest_BeforePosition:
		page, err = m.opts.Transcript.TimelineBefore(ctx, sessionID, max(c.BeforePosition, 1), limit, overlay)
	default:
		page, err = m.opts.Transcript.TimelineBefore(ctx, sessionID, 0, limit, overlay)
	}
	if err != nil {
		return nil, err
	}
	return &devboxv1.GetTimelineResponse{
		Entities:     page.Entities,
		NextPosition: page.NextPosition,
		HasMore:      page.HasMore,
		DeltaOffset:  head,
		Seq:          seq,
		Stream:       stream,
	}, nil
}

// Sessions returns every thread and subagent row, oldest first, and the live agent connections.
func (m *Manager) Sessions() *devboxv1.GetSessionsResponse {
	m.mu.Lock()
	defer m.mu.Unlock()
	out := make([]*devboxv1.Session, 0, len(m.threads)+len(m.sessions))
	for _, t := range m.threads {
		out = append(out, m.threadRowLocked(t))
	}
	for _, s := range m.sessions {
		if s.kind == devboxv1.SessionKind_SESSION_KIND_SUBAGENT {
			out = append(out, m.subagentRowLocked(s))
		}
	}
	sort.SliceStable(out, func(i, j int) bool {
		return out[i].GetCreatedAt().AsTime().Before(out[j].GetCreatedAt().AsTime())
	})
	return &devboxv1.GetSessionsResponse{Sessions: out, Connections: m.connectionsLocked()}
}
