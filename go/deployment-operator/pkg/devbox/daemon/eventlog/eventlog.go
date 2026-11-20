// Package eventlog is the daemon's offset-addressed event log (section 4.6). It lives under ~/.plural/events on
// the workspace volume, so it survives suspends, snapshots and daemon restarts. The gateway reads it with
// Daemon.SubscribeEvents(from_offset) and acknowledges what reached console with AckEvents, after which fully
// acknowledged segments are deleted. Transcript content isn't kept here (see package transcript).
//
// Layout: segment files named seg-<first offset, 20 digits>.log holding length-prefixed DaemonEvent protos,
// plus state.json with the acknowledged offset and the offset floor.
package eventlog

import (
	"bufio"
	"context"
	"encoding/binary"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/timestamppb"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/internal/fsutil"
)

const (
	defaultSegmentBytes = 8 << 20
	maxRecordBytes      = 64 << 20
	stateFile           = "state.json"
	segmentPrefix       = "seg-"
	segmentSuffix       = ".log"
)

// ErrClosed is returned by operations on a closed log.
var ErrClosed = errors.New("event log closed")

type segment struct {
	first uint64
	last  uint64 // 0 when empty
	path  string
	size  int64
}

type persistedState struct {
	Acked uint64 `json:"acked"`
	// Floor is the highest offset ever assigned when the state was written; offsets never go below it, even if
	// every segment holding them has been trimmed.
	Floor uint64 `json:"floor"`
}

// Log is a durable append-only event log. It is safe for concurrent use.
type Log struct {
	dir          string
	segmentBytes int64

	mu       sync.Mutex
	segments []*segment
	active   *os.File
	head     uint64
	acked    uint64
	notify   chan struct{}
	closed   bool
	dirty    bool
}

// Option configures a Log.
type Option func(*Log)

// WithSegmentBytes sets the size at which the active segment rotates.
func WithSegmentBytes(n int64) Option { return func(l *Log) { l.segmentBytes = n } }

// Open opens or creates the log in dir, recovering the head offset and truncating a torn trailing record.
func Open(dir string, opts ...Option) (*Log, error) {
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return nil, err
	}
	l := &Log{dir: dir, segmentBytes: defaultSegmentBytes, notify: make(chan struct{})}
	for _, o := range opts {
		o(l)
	}
	var st persistedState
	if _, err := fsutil.ReadJSON(filepath.Join(dir, stateFile), &st); err != nil {
		return nil, err
	}
	l.acked = st.Acked
	l.head = max(st.Floor, st.Acked)

	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, err
	}
	for _, e := range entries {
		name := e.Name()
		if !strings.HasPrefix(name, segmentPrefix) || !strings.HasSuffix(name, segmentSuffix) {
			continue
		}
		first, err := strconv.ParseUint(strings.TrimSuffix(strings.TrimPrefix(name, segmentPrefix), segmentSuffix), 10, 64)
		if err != nil {
			continue
		}
		l.segments = append(l.segments, &segment{first: first, path: filepath.Join(dir, name)})
	}
	sort.Slice(l.segments, func(i, j int) bool { return l.segments[i].first < l.segments[j].first })
	for i, s := range l.segments {
		last, size, err := scanSegment(s.path, i == len(l.segments)-1)
		if err != nil {
			return nil, fmt.Errorf("recover %s: %w", s.path, err)
		}
		s.last, s.size = last, size
		if last > l.head {
			l.head = last
		}
	}
	if err := l.openActive(); err != nil {
		return nil, err
	}
	return l, nil
}

// scanSegment returns the last offset and valid size. A torn record at the end of the final segment (a crash
// mid-write) is truncated away.
func scanSegment(path string, truncateTorn bool) (uint64, int64, error) {
	f, err := os.OpenFile(path, os.O_RDWR, 0)
	if err != nil {
		return 0, 0, err
	}
	defer f.Close()
	r := bufio.NewReader(f)
	var last uint64
	var valid int64
	for {
		ev, n, err := readRecord(r)
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			if truncateTorn {
				if terr := f.Truncate(valid); terr != nil {
					return 0, 0, terr
				}
				break
			}
			return 0, 0, err
		}
		valid += int64(n)
		last = ev.GetOffset()
	}
	return last, valid, nil
}

func (l *Log) openActive() error {
	if len(l.segments) == 0 || l.segments[len(l.segments)-1].size >= l.segmentBytes {
		s := &segment{first: l.head + 1, path: filepath.Join(l.dir, fmt.Sprintf("%s%020d%s", segmentPrefix, l.head+1, segmentSuffix))}
		l.segments = append(l.segments, s)
	}
	s := l.segments[len(l.segments)-1]
	f, err := os.OpenFile(s.path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o600)
	if err != nil {
		return err
	}
	if l.active != nil {
		_ = l.active.Sync()
		_ = l.active.Close()
	}
	l.active = f
	return nil
}

// Append assigns the next offset to ev, persists it and wakes subscribers. It returns the offset.
func (l *Log) Append(ev *devboxv1.DaemonEvent) (uint64, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.closed {
		return 0, ErrClosed
	}
	offset := l.head + 1
	ev.Offset = offset
	if ev.EmittedAt == nil {
		ev.EmittedAt = timestamppb.Now()
	}
	if d := ev.GetDelta(); d != nil {
		d.Offset = offset
		if d.EmittedAt == nil {
			d.EmittedAt = ev.EmittedAt
		}
	}
	data, err := proto.Marshal(ev)
	if err != nil {
		return 0, err
	}
	var hdr [binary.MaxVarintLen64]byte
	n := binary.PutUvarint(hdr[:], uint64(len(data)))
	rec := append(hdr[:n:n], data...)
	if _, err := l.active.Write(rec); err != nil {
		return 0, err
	}
	s := l.segments[len(l.segments)-1]
	s.size += int64(len(rec))
	s.last = offset
	l.head = offset
	l.dirty = true
	if s.size >= l.segmentBytes {
		if err := l.openActive(); err != nil {
			return offset, err
		}
	}
	close(l.notify)
	l.notify = make(chan struct{})
	return offset, nil
}

// Head is the latest offset written.
func (l *Log) Head() uint64 {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.head
}

// Acked is the latest offset the gateway acknowledged.
func (l *Log) Acked() uint64 {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.acked
}

// Ack records that everything up to offset reached console and deletes fully acknowledged segments. Offsets
// beyond the head are clamped; lower offsets than the current ack are ignored.
func (l *Log) Ack(offset uint64) (uint64, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.closed {
		return l.acked, ErrClosed
	}
	offset = min(offset, l.head)
	if offset <= l.acked {
		return l.acked, nil
	}
	l.acked = offset
	if err := l.saveStateLocked(); err != nil {
		return l.acked, err
	}
	l.trimLocked()
	return l.acked, nil
}

// Reset discards every record (e.g. when a snapshot is restored as a new instance) while keeping offsets
// monotonic, and marks everything up to the head as acknowledged.
func (l *Log) Reset() error {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.acked = l.head
	if err := l.saveStateLocked(); err != nil {
		return err
	}
	if l.active != nil {
		_ = l.active.Close()
		l.active = nil
	}
	for _, s := range l.segments {
		_ = os.Remove(s.path)
	}
	l.segments = nil
	return l.openActive()
}

func (l *Log) trimLocked() {
	keep := l.segments[:0]
	for i, s := range l.segments {
		if i < len(l.segments)-1 && s.last != 0 && s.last <= l.acked {
			_ = os.Remove(s.path)
			continue
		}
		keep = append(keep, s)
	}
	l.segments = keep
}

func (l *Log) saveStateLocked() error {
	return fsutil.WriteJSON(filepath.Join(l.dir, stateFile), persistedState{Acked: l.acked, Floor: l.head}, 0o600)
}

// Sync flushes the active segment to stable storage.
func (l *Log) Sync() error {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.closed || !l.dirty {
		return nil
	}
	l.dirty = false
	if err := l.saveStateLocked(); err != nil {
		return err
	}
	return l.active.Sync()
}

// Close syncs and closes the log, waking subscribers.
func (l *Log) Close() error {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.closed {
		return nil
	}
	l.closed = true
	_ = l.saveStateLocked()
	close(l.notify)
	err := l.active.Sync()
	return errors.Join(err, l.active.Close())
}

// Subscribe calls fn for every event with offset > from, in order, then follows the log live until ctx ends or
// fn returns an error. Events trimmed before they could be read are skipped.
func (l *Log) Subscribe(ctx context.Context, from uint64, fn func(*devboxv1.DaemonEvent) error) error {
	cursor := from
	for {
		l.mu.Lock()
		closed := l.closed
		head := l.head
		wait := l.notify
		l.mu.Unlock()
		if closed {
			return ErrClosed
		}
		if cursor < head {
			next, err := l.readAfter(cursor, fn)
			if err != nil {
				return err
			}
			if next == cursor {
				// Nothing readable past the cursor (trimmed); jump to the earliest available record.
				l.mu.Lock()
				if len(l.segments) > 0 && l.segments[0].first > cursor+1 {
					cursor = l.segments[0].first - 1
				} else {
					cursor = head
				}
				l.mu.Unlock()
				continue
			}
			cursor = next
			continue
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-wait:
		}
	}
}

// readAfter delivers records with offset > after from the segments on disk, returning the last delivered offset.
func (l *Log) readAfter(after uint64, fn func(*devboxv1.DaemonEvent) error) (uint64, error) {
	l.mu.Lock()
	segs := make([]segment, 0, len(l.segments))
	for _, s := range l.segments {
		if s.last > after {
			segs = append(segs, *s)
		}
	}
	l.mu.Unlock()
	cursor := after
	for _, s := range segs {
		f, err := os.Open(s.path)
		if errors.Is(err, os.ErrNotExist) {
			continue
		}
		if err != nil {
			return cursor, err
		}
		r := bufio.NewReader(io.LimitReader(f, s.size))
		for {
			ev, _, err := readRecord(r)
			if errors.Is(err, io.EOF) {
				break
			}
			if err != nil {
				_ = f.Close()
				return cursor, err
			}
			if ev.GetOffset() <= cursor {
				continue
			}
			if err := fn(ev); err != nil {
				_ = f.Close()
				return cursor, err
			}
			cursor = ev.GetOffset()
		}
		_ = f.Close()
	}
	return cursor, nil
}

func readRecord(r *bufio.Reader) (*devboxv1.DaemonEvent, int, error) {
	size, err := binary.ReadUvarint(r)
	if err != nil {
		if errors.Is(err, io.EOF) {
			return nil, 0, io.EOF
		}
		return nil, 0, fmt.Errorf("torn record header: %w", err)
	}
	if size > maxRecordBytes {
		return nil, 0, fmt.Errorf("record of %d bytes exceeds limit", size)
	}
	buf := make([]byte, size)
	if _, err := io.ReadFull(r, buf); err != nil {
		return nil, 0, fmt.Errorf("torn record: %w", err)
	}
	ev := &devboxv1.DaemonEvent{}
	if err := proto.Unmarshal(buf, ev); err != nil {
		return nil, 0, err
	}
	var hdr [binary.MaxVarintLen64]byte
	return ev, binary.PutUvarint(hdr[:], size) + int(size), nil
}

// SyncEvery syncs the log on an interval until ctx ends.
func (l *Log) SyncEvery(ctx context.Context, d time.Duration) {
	t := time.NewTicker(d)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			_ = l.Sync()
		}
	}
}
