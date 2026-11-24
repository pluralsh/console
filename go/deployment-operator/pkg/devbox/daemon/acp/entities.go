package acp

import (
	"sort"
	"time"

	"google.golang.org/protobuf/types/known/timestamppb"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
)

// SettleQuiet is how long an entity may go without updates before it settles on its own (section 4.6a item 4).
const SettleQuiet = 5 * time.Second

// maxRetainedSettled bounds the settled entities a session keeps in memory for later patches. Older ones keep
// only their position and revision, so a late patch still lands at the original position.
const maxRetainedSettled = 512

type entityKey struct {
	t  devboxv1.EntityType
	id string
}

// Entity is the live state of one ACP entity.
type Entity struct {
	SessionID  string
	Type       devboxv1.EntityType
	ID         string
	Position   uint64
	Revision   uint64
	CreatedAt  time.Time
	UpdatedAt  time.Time
	Settled    bool
	Body       Object
	lastChange time.Time
	// Extra is daemon-side data merged into the typed view (prompt ID and sender for user messages).
	PromptID string
	SentBy   *devboxv1.Principal
}

type tombstone struct {
	position uint64
	revision uint64
	created  time.Time
}

// Store holds the live entities of one session and assigns timeline positions.
type Store struct {
	sessionID    string
	nextPosition uint64
	live         map[entityKey]*Entity
	evicted      map[entityKey]tombstone
	count        uint64
	lastChange   time.Time
}

// NewStore returns a store whose next position is nextPosition (persisted across daemon restarts).
func NewStore(sessionID string, nextPosition uint64) *Store {
	if nextPosition == 0 {
		nextPosition = 1
	}
	return &Store{sessionID: sessionID, nextPosition: nextPosition, live: map[entityKey]*Entity{}, evicted: map[entityKey]tombstone{}}
}

// NextPosition is the position the next new entity will get.
func (s *Store) NextPosition() uint64 { return s.nextPosition }

// ReserveThrough makes every position up to last taken, so new entities are placed after it.
func (s *Store) ReserveThrough(last uint64) {
	if last >= s.nextPosition {
		s.nextPosition = last + 1
	}
}

// Count is the number of distinct entities seen by this store.
func (s *Store) Count() uint64 { return s.count }

// Get returns a live entity.
func (s *Store) Get(t devboxv1.EntityType, id string) *Entity {
	return s.live[entityKey{t, id}]
}

// Apply applies a ChangeAppend or ChangePatch and returns the entity and whether it is new.
func (s *Store) Apply(c Change, now time.Time) (*Entity, bool) {
	k := entityKey{c.EntityType, c.EntityID}
	e, ok := s.live[k]
	created := false
	if !ok {
		e = &Entity{SessionID: s.sessionID, Type: c.EntityType, ID: c.EntityID, CreatedAt: now, Body: Object{}}
		if ts, gone := s.evicted[k]; gone {
			e.Position, e.Revision, e.CreatedAt = ts.position, ts.revision, ts.created
			delete(s.evicted, k)
		} else {
			e.Position = s.nextPosition
			s.nextPosition++
			s.count++
			created = true
		}
		if name := EntityUpdateName(c.EntityType); name != "" {
			e.Body["sessionUpdate"] = name
		}
		if f := EntityIDField(c.EntityType); f != "" && c.EntityType != devboxv1.EntityType_ENTITY_TYPE_UNKNOWN {
			e.Body[f] = c.EntityID
		}
		s.live[k] = e
	}
	switch c.Kind {
	case ChangeAppend:
		appendChunk(e.Body, c.Patch)
	case ChangePatch:
		for key, v := range c.Patch {
			if v == nil {
				delete(e.Body, key)
				continue
			}
			e.Body[key] = CloneJSON(v)
		}
	}
	e.Settled = false
	e.UpdatedAt = now
	e.lastChange = now
	s.lastChange = now
	return e, created
}

// LastChange is when any of the session's entities last changed; zero before the first change.
func (s *Store) LastChange() time.Time { return s.lastChange }

// appendChunk appends a chunk's content to a message body. Adjacent plain text chunks are joined into one text
// block; every other block (and text carrying annotations or _meta) is kept as its own block.
func appendChunk(body Object, chunk Object) {
	block, _ := chunk["content"].(map[string]any)
	content := Arr(body, "content")
	if block != nil {
		if n := len(content); n > 0 && plainText(block) {
			if last, ok := content[n-1].(map[string]any); ok && plainText(last) {
				last["text"] = Str(last, "text") + Str(block, "text")
				body["content"] = content
				mergeMeta(body, chunk)
				return
			}
		}
		content = append(content, CloneJSON(block))
	} else if v, ok := chunk["content"]; ok && v != nil {
		content = append(content, CloneJSON(v))
	}
	body["content"] = content
	mergeMeta(body, chunk)
}

func plainText(b map[string]any) bool {
	if Str(b, "type") != TextType {
		return false
	}
	_, ann := b["annotations"]
	_, meta := b["_meta"]
	return !ann && !meta
}

func mergeMeta(body, chunk Object) {
	m := Obj(chunk, "_meta")
	if m == nil {
		return
	}
	cur := Obj(body, "_meta")
	if cur == nil {
		cur = Object{}
	}
	for k, v := range m {
		cur[k] = CloneJSON(v)
	}
	body["_meta"] = cur
}

// Settle marks e settled, bumps its revision and returns the stored form.
func (s *Store) Settle(e *Entity, now time.Time) *devboxv1.AcpEntity {
	e.Settled = true
	e.Revision++
	out := e.Proto()
	s.evictLocked()
	return out
}

// Unsettled returns in-flight entities in position order.
func (s *Store) Unsettled() []*Entity {
	var out []*Entity
	for _, e := range s.live {
		if !e.Settled {
			out = append(out, e)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Position < out[j].Position })
	return out
}

// Quiet returns unsettled entities that haven't changed for SettleQuiet.
func (s *Store) Quiet(now time.Time) []*Entity {
	var out []*Entity
	for _, e := range s.Unsettled() {
		if now.Sub(e.lastChange) >= SettleQuiet {
			out = append(out, e)
		}
	}
	return out
}

func (s *Store) evictLocked() {
	settled := 0
	for _, e := range s.live {
		if e.Settled {
			settled++
		}
	}
	if settled <= maxRetainedSettled {
		return
	}
	var old []*Entity
	for _, e := range s.live {
		if e.Settled {
			old = append(old, e)
		}
	}
	sort.Slice(old, func(i, j int) bool { return old[i].Position < old[j].Position })
	for _, e := range old[:settled-maxRetainedSettled] {
		k := entityKey{e.Type, e.ID}
		s.evicted[k] = tombstone{position: e.Position, revision: e.Revision, created: e.CreatedAt}
		delete(s.live, k)
	}
}

// Proto renders the entity's current state as an AcpEntity, with the verbatim v2 JSON and a typed view.
func (e *Entity) Proto() *devboxv1.AcpEntity {
	out := &devboxv1.AcpEntity{
		Key:       &devboxv1.EntityKey{SessionId: e.SessionID, Type: e.Type, Id: e.ID},
		Position:  e.Position,
		Revision:  e.Revision,
		CreatedAt: timestamppb.New(e.CreatedAt),
		UpdatedAt: timestamppb.New(e.UpdatedAt),
		Settled:   e.Settled,
		AcpJson:   MustJSON(e.Body),
	}
	switch e.Type {
	case devboxv1.EntityType_ENTITY_TYPE_USER_MESSAGE, devboxv1.EntityType_ENTITY_TYPE_AGENT_MESSAGE, devboxv1.EntityType_ENTITY_TYPE_AGENT_THOUGHT:
		out.Body = &devboxv1.AcpEntity_Message{Message: &devboxv1.MessageEntity{
			MessageId: e.ID, Content: ContentBlocksOf(Arr(e.Body, "content")), PromptId: e.PromptID, SentBy: e.SentBy, Meta: MetaStruct(e.Body),
		}}
	case devboxv1.EntityType_ENTITY_TYPE_SESSION_MESSAGE:
		out.Body = &devboxv1.AcpEntity_SessionMessage{SessionMessage: &devboxv1.SessionMessageEntity{
			MessageId: e.ID, FromSessionId: Str(e.Body, "fromSessionId"), ToSessionId: Str(e.Body, "toSessionId"),
			Content: ContentBlocksOf(Arr(e.Body, "content")), Meta: MetaStruct(e.Body),
		}}
	case devboxv1.EntityType_ENTITY_TYPE_TOOL_CALL:
		out.Body = &devboxv1.AcpEntity_ToolCall{ToolCall: ToolCallOf(e.Body)}
	case devboxv1.EntityType_ENTITY_TYPE_PLAN:
		out.Body = &devboxv1.AcpEntity_Plan{Plan: PlanOf(e.Body)}
	case devboxv1.EntityType_ENTITY_TYPE_TERMINAL:
		out.Body = &devboxv1.AcpEntity_Terminal{Terminal: terminalOf(e.Body)}
	case devboxv1.EntityType_ENTITY_TYPE_COMPACTION:
		out.Body = &devboxv1.AcpEntity_Compaction{Compaction: &devboxv1.CompactionEntity{
			CompactionId: e.ID, Status: Str(e.Body, "status"), Summary: ContentBlocksOf(Arr(e.Body, "summary")), Meta: MetaStruct(e.Body),
		}}
	default:
		out.Body = &devboxv1.AcpEntity_Unknown{Unknown: &devboxv1.UnknownVariant{Type: Str(e.Body, "sessionUpdate"), RawJson: out.AcpJson}}
	}
	return out
}

func terminalOf(o Object) *devboxv1.TerminalEntity {
	t := &devboxv1.TerminalEntity{
		TerminalId: Str(o, "terminalId"), Command: Str(o, "command"), Cwd: Str(o, "cwd"), Output: Str(o, "output"),
		Truncated: Bool(o, "truncated"), Meta: MetaStruct(o),
	}
	for _, a := range Arr(o, "args") {
		if s, ok := a.(string); ok {
			t.Args = append(t.Args, s)
		}
	}
	if es := Obj(o, "exitStatus"); es != nil {
		st := &devboxv1.TerminalExitStatus{Signal: Str(es, "signal")}
		if code, ok := Int(es, "exitCode"); ok {
			c := int32(code)
			st.ExitCode = &c
		}
		t.ExitStatus = st
	}
	return t
}
