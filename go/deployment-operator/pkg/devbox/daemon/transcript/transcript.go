// Package transcript is the box's durable transcript: every settled entity revision, kept on the workspace
// volume (~/.plural/transcripts) so it survives suspends, snapshots and daemon restarts, and served to the
// gateway by Daemon.GetTimeline.
//
// Layout, under one gocloud.dev/blob bucket (fileblob on the box, memblob in tests):
//
//	sessions/<session>/segments/<seq>-<nanos>-<rand>.ndjson.zst  append-only batches of AcpEntity revisions
//	sessions/<session>/snapshot/index.json                        position index of the current compacted snapshot
//	sessions/<session>/snapshot/g<gen>/<chunk>.ndjson.zst         latest revision of every entity, by position
//
// Segments are written once and never modified. Records are idempotent on (type, id, revision) and every reader
// keeps the highest revision per key. The compactor folds segments into a new snapshot generation, then deletes
// the folded segments and the previous generation. Readers tolerate objects disappearing under them by retrying.
package transcript

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/klauspost/compress/zstd"
	"gocloud.dev/blob"
	"gocloud.dev/blob/fileblob"
	"gocloud.dev/blob/memblob"
	"gocloud.dev/gcerrors"
	"google.golang.org/protobuf/encoding/protojson"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
)

const (
	// DefaultChunkSize is the number of entities per compacted snapshot chunk, i.e. the paging granularity.
	DefaultChunkSize = 500
	// DefaultCompactThreshold is the number of segments that makes a session worth compacting.
	DefaultCompactThreshold = 16

	segmentSuffix = ".ndjson.zst"
	readRetries   = 3
)

var (
	marshal   = protojson.MarshalOptions{}
	unmarshal = protojson.UnmarshalOptions{DiscardUnknown: true}

	encoder, _ = zstd.NewWriter(nil, zstd.WithEncoderLevel(zstd.SpeedDefault))
	decoder, _ = zstd.NewReader(nil)
)

// Store is a box's transcript.
type Store struct {
	bucket           *blob.Bucket
	chunkSize        int
	compactThreshold int
	now              func() time.Time

	mu    sync.Mutex
	locks map[string]*sync.Mutex
}

type Option func(*Store)

func WithChunkSize(n int) Option { return func(s *Store) { s.chunkSize = n } }

func WithCompactThreshold(n int) Option { return func(s *Store) { s.compactThreshold = n } }

func WithClock(now func() time.Time) Option { return func(s *Store) { s.now = now } }

// Open opens (creating) the transcript in dir.
func Open(dir string, opts ...Option) (*Store, error) {
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return nil, err
	}
	b, err := fileblob.OpenBucket(dir, &fileblob.Options{NoTempDir: true, DirFileMode: 0o700, Metadata: fileblob.MetadataDontWrite})
	if err != nil {
		return nil, fmt.Errorf("opening transcript store %s: %w", dir, err)
	}
	return New(b, opts...), nil
}

// Memory returns an in-memory transcript (tests).
func Memory(opts ...Option) *Store { return New(memblob.OpenBucket(nil), opts...) }

// New wraps a bucket.
func New(b *blob.Bucket, opts ...Option) *Store {
	s := &Store{
		bucket:           b,
		chunkSize:        DefaultChunkSize,
		compactThreshold: DefaultCompactThreshold,
		now:              time.Now,
		locks:            map[string]*sync.Mutex{},
	}
	for _, o := range opts {
		o(s)
	}
	return s
}

func (s *Store) Close() error { return s.bucket.Close() }

// ---- keys ----

const sessionsPrefix = "sessions/"

// sessionDir encodes a session ID into one key segment: subagent session IDs contain slashes.
func sessionDir(session string) string { return base64.RawURLEncoding.EncodeToString([]byte(session)) }

func sessionPrefix(session string) string { return sessionsPrefix + sessionDir(session) + "/" }

func segmentsPrefix(session string) string { return sessionPrefix(session) + "segments/" }

func snapshotIndexKey(session string) string { return sessionPrefix(session) + "snapshot/index.json" }

func chunkKey(session string, gen uint64, chunk int) string {
	return fmt.Sprintf("%ssnapshot/g%020d/%06d%s", sessionPrefix(session), gen, chunk, segmentSuffix)
}

func generationPrefix(session string, gen uint64) string {
	return fmt.Sprintf("%ssnapshot/g%020d/", sessionPrefix(session), gen)
}

func validID(id string) error {
	if id == "" {
		return errors.New("empty session id")
	}
	return nil
}

func (s *Store) lock(key string) func() {
	s.mu.Lock()
	l, ok := s.locks[key]
	if !ok {
		l = &sync.Mutex{}
		s.locks[key] = l
	}
	s.mu.Unlock()
	l.Lock()
	return l.Unlock
}

func (s *Store) putJSON(ctx context.Context, key string, v any) error {
	data, err := json.Marshal(v)
	if err != nil {
		return err
	}
	return s.bucket.WriteAll(ctx, key, data, &blob.WriterOptions{ContentType: "application/json"})
}

func (s *Store) getJSON(ctx context.Context, key string, v any) (bool, error) {
	data, err := s.bucket.ReadAll(ctx, key)
	if gcerrors.Code(err) == gcerrors.NotFound {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, json.Unmarshal(data, v)
}

func (s *Store) listDirs(ctx context.Context, prefix string) ([]string, error) {
	var out []string
	it := s.bucket.List(&blob.ListOptions{Prefix: prefix, Delimiter: "/"})
	for {
		obj, err := it.Next(ctx)
		if errors.Is(err, io.EOF) {
			return out, nil
		}
		if err != nil {
			return nil, err
		}
		if obj.IsDir {
			out = append(out, strings.TrimSuffix(strings.TrimPrefix(obj.Key, prefix), "/"))
		}
	}
}

func (s *Store) listKeys(ctx context.Context, prefix string) ([]string, error) {
	var out []string
	it := s.bucket.List(&blob.ListOptions{Prefix: prefix})
	for {
		obj, err := it.Next(ctx)
		if errors.Is(err, io.EOF) {
			sort.Strings(out)
			return out, nil
		}
		if err != nil {
			return nil, err
		}
		// Writes go through a temporary file next to the target, which a crash can leave behind.
		if !obj.IsDir && !strings.HasSuffix(obj.Key, ".tmp") {
			out = append(out, obj.Key)
		}
	}
}

// ---- entities ----

type entityKey struct {
	typ devboxv1.EntityType
	id  string
}

func keyOf(e *devboxv1.AcpEntity) entityKey {
	return entityKey{typ: e.GetKey().GetType(), id: e.GetKey().GetId()}
}

// newer reports whether a should replace b (the higher revision wins; ties keep b).
func newer(a, b *devboxv1.AcpEntity) bool {
	return b == nil || a.GetRevision() > b.GetRevision()
}

func mergeInto(m map[entityKey]*devboxv1.AcpEntity, entities ...*devboxv1.AcpEntity) {
	for _, e := range entities {
		k := keyOf(e)
		if newer(e, m[k]) {
			m[k] = e
		}
	}
}

func sortByPosition(entities []*devboxv1.AcpEntity) {
	sort.SliceStable(entities, func(i, j int) bool {
		if entities[i].GetPosition() != entities[j].GetPosition() {
			return entities[i].GetPosition() < entities[j].GetPosition()
		}
		ki, kj := keyOf(entities[i]), keyOf(entities[j])
		if ki.typ != kj.typ {
			return ki.typ < kj.typ
		}
		return ki.id < kj.id
	})
}

func encodeRecords(entities []*devboxv1.AcpEntity) ([]byte, error) {
	var buf bytes.Buffer
	for _, e := range entities {
		line, err := marshal.Marshal(e)
		if err != nil {
			return nil, err
		}
		buf.Write(line)
		buf.WriteByte('\n')
	}
	return encoder.EncodeAll(buf.Bytes(), nil), nil
}

func decodeRecords(data []byte) ([]*devboxv1.AcpEntity, error) {
	raw, err := decoder.DecodeAll(data, nil)
	if err != nil {
		return nil, err
	}
	var out []*devboxv1.AcpEntity
	for _, line := range bytes.Split(raw, []byte{'\n'}) {
		if len(bytes.TrimSpace(line)) == 0 {
			continue
		}
		e := &devboxv1.AcpEntity{}
		if err := unmarshal.Unmarshal(line, e); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, nil
}

func (s *Store) readRecords(ctx context.Context, key string) ([]*devboxv1.AcpEntity, error) {
	data, err := s.bucket.ReadAll(ctx, key)
	if err != nil {
		return nil, err
	}
	return decodeRecords(data)
}

// Append durably writes one batch of entity revisions, one segment per session. Entities without a session are
// rejected.
func (s *Store) Append(ctx context.Context, entities []*devboxv1.AcpEntity) error {
	bySession := map[string][]*devboxv1.AcpEntity{}
	var order []string
	for _, e := range entities {
		sid := e.GetKey().GetSessionId()
		if err := validID(sid); err != nil {
			return fmt.Errorf("entity %s/%s: %w", e.GetKey().GetType(), e.GetKey().GetId(), err)
		}
		if _, ok := bySession[sid]; !ok {
			order = append(order, sid)
		}
		bySession[sid] = append(bySession[sid], e)
	}
	for _, sid := range order {
		// Collapse revisions of the same entity within the batch.
		m := map[entityKey]*devboxv1.AcpEntity{}
		mergeInto(m, bySession[sid]...)
		batch := make([]*devboxv1.AcpEntity, 0, len(m))
		for _, e := range m {
			batch = append(batch, e)
		}
		sortByPosition(batch)
		data, err := encodeRecords(batch)
		if err != nil {
			return err
		}
		key := fmt.Sprintf("%s%020d-%s%s", segmentsPrefix(sid), s.now().UnixNano(), randSuffix(), segmentSuffix)
		if err := s.bucket.WriteAll(ctx, key, data, &blob.WriterOptions{ContentType: "application/zstd"}); err != nil {
			return fmt.Errorf("writing segment %s: %w", key, err)
		}
	}
	return nil
}

func randSuffix() string {
	var b [4]byte
	_, _ = rand.Read(b[:])
	return hex.EncodeToString(b[:])
}

// ---- snapshot index ----

type chunkRef struct {
	Key   string `json:"key"`
	First uint64 `json:"first"`
	Last  uint64 `json:"last"`
	Count int    `json:"count"`
}

type snapshotIndex struct {
	Generation uint64     `json:"generation"`
	Chunks     []chunkRef `json:"chunks"`
	Entities   int        `json:"entities"`
	CreatedAt  time.Time  `json:"createdAt"`
}

func (s *Store) readIndex(ctx context.Context, session string) (*snapshotIndex, error) {
	idx := &snapshotIndex{}
	ok, err := s.getJSON(ctx, snapshotIndexKey(session), idx)
	if err != nil || !ok {
		return &snapshotIndex{}, err
	}
	return idx, nil
}

// ---- timeline ----

// Page is one page of a session's timeline, in position order.
type Page struct {
	Entities     []*devboxv1.AcpEntity
	NextPosition uint64
	HasMore      bool
}

// Timeline returns up to limit entities with position > after, merging the compacted snapshot, uncompacted
// segments and overlay (revisions the caller holds in memory; they win when their revision is higher).
func (s *Store) Timeline(ctx context.Context, session string, after uint64, limit int, overlay []*devboxv1.AcpEntity) (*Page, error) {
	if err := validID(session); err != nil {
		return nil, err
	}
	if limit <= 0 {
		limit = 200
	}
	var lastErr error
	for range readRetries {
		page, err := s.timeline(ctx, session, after, limit, overlay)
		if gcerrors.Code(err) != gcerrors.NotFound {
			return page, err
		}
		// A compaction swapped generations under us; read again.
		lastErr = err
	}
	return nil, lastErr
}

// TimelineBefore returns the newest limit entities with position < before (0: the newest of all), in position
// order. HasMore says older entities exist and NextPosition is the cursor for them.
func (s *Store) TimelineBefore(ctx context.Context, session string, before uint64, limit int, overlay []*devboxv1.AcpEntity) (*Page, error) {
	if err := validID(session); err != nil {
		return nil, err
	}
	if limit <= 0 {
		limit = 200
	}
	if before == 0 {
		before = ^uint64(0)
	}
	var lastErr error
	for range readRetries {
		page, err := s.timelineBefore(ctx, session, before, limit, overlay)
		if gcerrors.Code(err) != gcerrors.NotFound {
			return page, err
		}
		lastErr = err
	}
	return nil, lastErr
}

func (s *Store) timelineBefore(ctx context.Context, session string, before uint64, limit int, overlay []*devboxv1.AcpEntity) (*Page, error) {
	idx, err := s.readIndex(ctx, session)
	if err != nil {
		return nil, err
	}

	merged := map[entityKey]*devboxv1.AcpEntity{}
	// Read chunks newest first until we have more than a page; positions below the oldest chunk read are only
	// certain when no chunks remain.
	floor := uint64(0)
	gathered := 0
	for i := len(idx.Chunks) - 1; i >= 0; i-- {
		c := idx.Chunks[i]
		if c.First >= before {
			continue
		}
		if gathered > limit {
			floor = idx.Chunks[i+1].First
			break
		}
		recs, err := s.readRecords(ctx, c.Key)
		if err != nil {
			return nil, err
		}
		for _, e := range recs {
			if e.GetPosition() < before {
				gathered++
			}
		}
		mergeInto(merged, recs...)
	}
	if err := s.mergeUncompacted(ctx, session, merged, overlay); err != nil {
		return nil, err
	}

	out := make([]*devboxv1.AcpEntity, 0, len(merged))
	below := false
	for _, e := range merged {
		switch {
		case e.GetPosition() >= before:
		case e.GetPosition() < floor:
			below = true
		default:
			out = append(out, e)
		}
	}
	sortByPosition(out)
	page := &Page{HasMore: below}
	if len(out) > limit {
		out = out[len(out)-limit:]
		page.HasMore = true
	}
	page.Entities = out
	page.NextPosition = before
	if len(out) > 0 {
		page.NextPosition = out[0].GetPosition()
	}
	return page, nil
}

// mergeUncompacted folds the session's segments and the caller's overlay into merged.
func (s *Store) mergeUncompacted(ctx context.Context, session string, merged map[entityKey]*devboxv1.AcpEntity, overlay []*devboxv1.AcpEntity) error {
	segments, err := s.listKeys(ctx, segmentsPrefix(session))
	if err != nil {
		return err
	}
	for _, key := range segments {
		recs, err := s.readRecords(ctx, key)
		if err != nil {
			// NotFound: folded into the snapshot (and deleted) after we listed it; the snapshot we read may
			// predate that, so the caller starts over.
			return err
		}
		mergeInto(merged, recs...)
	}
	for _, e := range overlay {
		if e.GetKey().GetSessionId() == session {
			mergeInto(merged, e)
		}
	}
	return nil
}

func (s *Store) timeline(ctx context.Context, session string, after uint64, limit int, overlay []*devboxv1.AcpEntity) (*Page, error) {
	idx, err := s.readIndex(ctx, session)
	if err != nil {
		return nil, err
	}

	merged := map[entityKey]*devboxv1.AcpEntity{}
	// Read chunks until we have more than a page; positions past the last chunk read are only certain when no
	// chunks remain.
	boundary := ^uint64(0)
	gathered := 0
	for i, c := range idx.Chunks {
		if c.Last <= after {
			continue
		}
		if gathered > limit {
			boundary = idx.Chunks[i-1].Last
			break
		}
		recs, err := s.readRecords(ctx, c.Key)
		if err != nil {
			return nil, err
		}
		for _, e := range recs {
			if e.GetPosition() > after {
				gathered++
			}
		}
		mergeInto(merged, recs...)
	}
	if err := s.mergeUncompacted(ctx, session, merged, overlay); err != nil {
		return nil, err
	}

	out := make([]*devboxv1.AcpEntity, 0, len(merged))
	beyond := false
	for _, e := range merged {
		switch {
		case e.GetPosition() <= after:
		case e.GetPosition() > boundary:
			beyond = true
		default:
			out = append(out, e)
		}
	}
	sortByPosition(out)
	page := &Page{HasMore: beyond}
	if len(out) > limit {
		out = out[:limit]
		page.HasMore = true
	}
	page.Entities = out
	page.NextPosition = after
	if len(out) > 0 {
		page.NextPosition = out[len(out)-1].GetPosition()
	}
	return page, nil
}

// ---- compaction ----

// Compact folds a session's segments into a new snapshot generation. It is a no-op without segments.
func (s *Store) Compact(ctx context.Context, session string) error {
	if err := validID(session); err != nil {
		return err
	}
	defer s.lock("compact/" + session)()

	idx, err := s.readIndex(ctx, session)
	if err != nil {
		return err
	}
	segments, err := s.listKeys(ctx, segmentsPrefix(session))
	if err != nil {
		return err
	}
	if len(segments) == 0 {
		return nil
	}

	merged := map[entityKey]*devboxv1.AcpEntity{}
	for _, c := range idx.Chunks {
		recs, err := s.readRecords(ctx, c.Key)
		if err != nil {
			return fmt.Errorf("reading snapshot chunk %s: %w", c.Key, err)
		}
		mergeInto(merged, recs...)
	}
	for _, key := range segments {
		recs, err := s.readRecords(ctx, key)
		if err != nil {
			return fmt.Errorf("reading segment %s: %w", key, err)
		}
		mergeInto(merged, recs...)
	}
	all := make([]*devboxv1.AcpEntity, 0, len(merged))
	for _, e := range merged {
		all = append(all, e)
	}
	sortByPosition(all)

	next := &snapshotIndex{Generation: idx.Generation + 1, Entities: len(all), CreatedAt: s.now().UTC()}
	for i := 0; i < len(all); i += s.chunkSize {
		chunk := all[i:min(i+s.chunkSize, len(all))]
		data, err := encodeRecords(chunk)
		if err != nil {
			return err
		}
		key := chunkKey(session, next.Generation, len(next.Chunks))
		if err := s.bucket.WriteAll(ctx, key, data, &blob.WriterOptions{ContentType: "application/zstd"}); err != nil {
			return err
		}
		next.Chunks = append(next.Chunks, chunkRef{Key: key, First: chunk[0].GetPosition(), Last: chunk[len(chunk)-1].GetPosition(), Count: len(chunk)})
	}
	if err := s.putJSON(ctx, snapshotIndexKey(session), next); err != nil {
		return err
	}

	var errs []error
	for _, key := range segments {
		if err := s.bucket.Delete(ctx, key); err != nil && gcerrors.Code(err) != gcerrors.NotFound {
			errs = append(errs, fmt.Errorf("deleting compacted segment %s: %w", key, err))
		}
	}
	if idx.Generation > 0 {
		if err := s.deletePrefix(ctx, generationPrefix(session, idx.Generation)); err != nil {
			errs = append(errs, fmt.Errorf("deleting previous snapshot generation: %w", err))
		}
	}
	return errors.Join(errs...)
}

// CompactAll compacts every session with at least the configured number of segments, or every session with any
// segment when force is set.
func (s *Store) CompactAll(ctx context.Context, force bool) error {
	dirs, err := s.listDirs(ctx, sessionsPrefix)
	if err != nil {
		return err
	}
	var errs []error
	for _, dir := range dirs {
		raw, err := base64.RawURLEncoding.DecodeString(dir)
		if err != nil {
			continue
		}
		sess := string(raw)
		segs, err := s.listKeys(ctx, segmentsPrefix(sess))
		if err != nil {
			errs = append(errs, err)
			continue
		}
		if len(segs) == 0 || (!force && len(segs) < s.compactThreshold) {
			continue
		}
		if err := s.Compact(ctx, sess); err != nil {
			errs = append(errs, fmt.Errorf("compacting %s: %w", sess, err))
		}
	}
	return errors.Join(errs...)
}

// Reset deletes the whole transcript (a snapshot restored as a new instance starts with an empty history).
func (s *Store) Reset(ctx context.Context) error {
	return s.deletePrefix(ctx, sessionsPrefix)
}

func (s *Store) deletePrefix(ctx context.Context, prefix string) error {
	keys, err := s.listKeys(ctx, prefix)
	if err != nil {
		return err
	}
	var errs []error
	for _, key := range keys {
		if err := s.bucket.Delete(ctx, key); err != nil && gcerrors.Code(err) != gcerrors.NotFound {
			errs = append(errs, err)
		}
	}
	return errors.Join(errs...)
}
