package transcript

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"testing"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
)

func entity(session, id string, pos, rev uint64) *devboxv1.AcpEntity {
	return &devboxv1.AcpEntity{
		Key:      &devboxv1.EntityKey{SessionId: session, Type: devboxv1.EntityType_ENTITY_TYPE_AGENT_MESSAGE, Id: id},
		Position: pos,
		Revision: rev,
		Settled:  true,
		AcpJson:  fmt.Appendf(nil, `{"id":%q,"rev":%d}`, id, rev),
	}
}

func newStore(t *testing.T, opts ...Option) *Store {
	t.Helper()
	s := Memory(opts...)
	t.Cleanup(func() { _ = s.Close() })
	return s
}

func positions(p *Page) []uint64 {
	out := make([]uint64, len(p.Entities))
	for i, e := range p.Entities {
		out[i] = e.GetPosition()
	}
	return out
}

func TestAppendIsIdempotentOnRevision(t *testing.T) {
	ctx := context.Background()
	s := newStore(t)

	if err := s.Append(ctx, []*devboxv1.AcpEntity{entity("s1", "a", 1, 1), entity("s1", "b", 2, 1)}); err != nil {
		t.Fatal(err)
	}
	// Replay of the same revisions plus a newer revision of "a" and an older one of "b".
	if err := s.Append(ctx, []*devboxv1.AcpEntity{entity("s1", "a", 1, 1), entity("s1", "a", 1, 3), entity("s1", "b", 2, 1)}); err != nil {
		t.Fatal(err)
	}
	if err := s.Append(ctx, []*devboxv1.AcpEntity{entity("s1", "a", 1, 2)}); err != nil {
		t.Fatal(err)
	}

	page, err := s.Timeline(ctx, "s1", 0, 10, nil)
	if err != nil {
		t.Fatal(err)
	}
	if got := positions(page); len(got) != 2 || got[0] != 1 || got[1] != 2 {
		t.Fatalf("positions = %v", got)
	}
	if page.Entities[0].GetRevision() != 3 {
		t.Fatalf("revision of a = %d, want 3", page.Entities[0].GetRevision())
	}
	if page.HasMore {
		t.Fatal("unexpected has_more")
	}
}

func TestCompactionPreservesTimelineAndPaging(t *testing.T) {
	ctx := context.Background()
	s := newStore(t, WithChunkSize(3))

	for i := uint64(1); i <= 10; i++ {
		if err := s.Append(ctx, []*devboxv1.AcpEntity{entity("s1", fmt.Sprint(i), i, 1)}); err != nil {
			t.Fatal(err)
		}
	}
	if err := s.Compact(ctx, "s1"); err != nil {
		t.Fatal(err)
	}
	segs, _ := s.listKeys(ctx, segmentsPrefix("s1"))
	if len(segs) != 0 {
		t.Fatalf("segments left after compaction: %v", segs)
	}
	// A newer revision after compaction, a new entity, then a second compaction swapping generations.
	if err := s.Append(ctx, []*devboxv1.AcpEntity{entity("s1", "4", 4, 2), entity("s1", "11", 11, 1)}); err != nil {
		t.Fatal(err)
	}

	collect := func() ([]uint64, map[uint64]uint64) {
		var all []uint64
		revs := map[uint64]uint64{}
		after := uint64(0)
		for range 20 {
			page, err := s.Timeline(ctx, "s1", after, 4, nil)
			if err != nil {
				t.Fatal(err)
			}
			for _, e := range page.Entities {
				revs[e.GetPosition()] = e.GetRevision()
			}
			all = append(all, positions(page)...)
			after = page.NextPosition
			if !page.HasMore {
				break
			}
		}
		return all, revs
	}

	check := func(stage string) {
		all, revs := collect()
		if len(all) != 11 {
			t.Fatalf("%s: got %d entities %v, want 11", stage, len(all), all)
		}
		for i, p := range all {
			if p != uint64(i+1) {
				t.Fatalf("%s: positions out of order: %v", stage, all)
			}
		}
		if revs[4] != 2 {
			t.Fatalf("%s: revision at position 4 = %d, want 2", stage, revs[4])
		}
	}
	check("before second compaction")
	if err := s.Compact(ctx, "s1"); err != nil {
		t.Fatal(err)
	}
	check("after second compaction")

	old, _ := s.listKeys(ctx, generationPrefix("s1", 1))
	if len(old) != 0 {
		t.Fatalf("previous generation not deleted: %v", old)
	}
	idx, _ := s.readIndex(ctx, "s1")
	if idx.Generation != 2 || len(idx.Chunks) != 4 || idx.Entities != 11 {
		t.Fatalf("index = %+v", idx)
	}
}

func TestTimelineBeforePagesNewestFirst(t *testing.T) {
	ctx := context.Background()
	s := newStore(t, WithChunkSize(3))

	for i := uint64(1); i <= 10; i++ {
		if err := s.Append(ctx, []*devboxv1.AcpEntity{entity("s1", fmt.Sprint(i), i, 1)}); err != nil {
			t.Fatal(err)
		}
	}
	if err := s.Compact(ctx, "s1"); err != nil {
		t.Fatal(err)
	}
	// Uncompacted: a newer revision of a compacted entity and a new one; in memory: an in-flight entity.
	if err := s.Append(ctx, []*devboxv1.AcpEntity{entity("s1", "4", 4, 2), entity("s1", "11", 11, 1)}); err != nil {
		t.Fatal(err)
	}
	overlay := []*devboxv1.AcpEntity{entity("s1", "12", 12, 1), entity("other", "x", 13, 1)}

	newest, err := s.TimelineBefore(ctx, "s1", 0, 4, overlay)
	if err != nil {
		t.Fatal(err)
	}
	if got := positions(newest); fmt.Sprint(got) != "[9 10 11 12]" || !newest.HasMore || newest.NextPosition != 9 {
		t.Fatalf("newest page = %v has_more=%v next=%d", got, newest.HasMore, newest.NextPosition)
	}

	var all []uint64
	revs := map[uint64]uint64{}
	before := uint64(0)
	for range 20 {
		page, err := s.TimelineBefore(ctx, "s1", before, 4, overlay)
		if err != nil {
			t.Fatal(err)
		}
		for _, e := range page.Entities {
			revs[e.GetPosition()] = e.GetRevision()
		}
		all = append(positions(page), all...)
		before = page.NextPosition
		if !page.HasMore {
			break
		}
	}
	if fmt.Sprint(all) != "[1 2 3 4 5 6 7 8 9 10 11 12]" || revs[4] != 2 {
		t.Fatalf("paged backwards to %v (revision at 4 = %d)", all, revs[4])
	}

	// A cursor inside a chunk, and one past the start.
	mid, err := s.TimelineBefore(ctx, "s1", 6, 2, nil)
	if err != nil || fmt.Sprint(positions(mid)) != "[4 5]" || !mid.HasMore {
		t.Fatalf("page before 6 = %v, %v", mid, err)
	}
	first, err := s.TimelineBefore(ctx, "s1", 1, 4, nil)
	if err != nil || len(first.Entities) != 0 || first.HasMore {
		t.Fatalf("page before 1 = %v, %v", first, err)
	}
}

func TestTimelineOverlay(t *testing.T) {
	ctx := context.Background()
	s := newStore(t)
	if err := s.Append(ctx, []*devboxv1.AcpEntity{entity("s1", "a", 1, 1)}); err != nil {
		t.Fatal(err)
	}
	inflight := entity("s1", "b", 2, 1)
	inflight.Settled = false
	page, err := s.Timeline(ctx, "s1", 0, 10, []*devboxv1.AcpEntity{inflight, entity("other", "x", 1, 9)})
	if err != nil {
		t.Fatal(err)
	}
	if got := positions(page); len(got) != 2 || page.Entities[1].GetSettled() {
		t.Fatalf("overlay not merged: %v", got)
	}
}

func TestOnDiskStoreSurvivesReopenAndResets(t *testing.T) {
	ctx := context.Background()
	dir := filepath.Join(t.TempDir(), "transcripts")
	s, err := Open(dir, WithCompactThreshold(2))
	if err != nil {
		t.Fatal(err)
	}
	const child = "s1/subagent/task-1"
	for i := uint64(1); i <= 3; i++ {
		if err := s.Append(ctx, []*devboxv1.AcpEntity{entity("s1", fmt.Sprint(i), i, 1), entity(child, fmt.Sprint(i), i, 1)}); err != nil {
			t.Fatal(err)
		}
	}
	if err := s.CompactAll(ctx, false); err != nil {
		t.Fatal(err)
	}
	if segs, _ := s.listKeys(ctx, segmentsPrefix(child)); len(segs) != 0 {
		t.Fatalf("subagent session not compacted: %v", segs)
	}
	// A temporary file stranded by a crash mid-write is ignored.
	if err := os.WriteFile(filepath.Join(dir, "sessions", sessionDir("s1"), "segments", "x.ndjson.zst.1.tmp"), []byte("torn"), 0o600); err != nil {
		t.Fatal(err)
	}
	_ = s.Close()

	s, err = Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	defer s.Close() //nolint:errcheck
	for _, sess := range []string{"s1", child} {
		page, err := s.Timeline(ctx, sess, 0, 10, nil)
		if err != nil {
			t.Fatal(err)
		}
		if len(page.Entities) != 3 {
			t.Fatalf("%s after reopen: %v", sess, positions(page))
		}
	}

	if err := s.Reset(ctx); err != nil {
		t.Fatal(err)
	}
	page, err := s.Timeline(ctx, "s1", 0, 10, nil)
	if err != nil {
		t.Fatal(err)
	}
	if len(page.Entities) != 0 {
		t.Fatalf("entities left after reset: %v", positions(page))
	}
}
