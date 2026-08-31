package persist

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/cache"
	pollycache "github.com/pluralsh/console/go/polly/cache"
	"k8s.io/klog/v2"
)

const (
	SnapshotVersion = 1
	snapshotMaxAge  = time.Hour

	stateFileName   = "state.json"
	stateTmpPattern = "state.json.*.tmp"
	ManifestsDir    = "manifests"
)

type ManifestRecord struct {
	Dir     string        `json:"dir"`
	SHA     string        `json:"sha"`
	Created time.Time     `json:"created"`
	Expiry  time.Duration `json:"expiry"`
}

type SHARecord struct {
	Value     string    `json:"value"`
	ExpiresAt time.Time `json:"expiresAt"`
}

type IdentityRecord struct {
	Value   string    `json:"value"`
	Created time.Time `json:"created"`
}

type PollyRecord[T any] struct {
	Value   T         `json:"value"`
	Created time.Time `json:"created"`
}

type Snapshot struct {
	Version           int                                                      `json:"version"`
	WrittenAt         time.Time                                                `json:"writtenAt"`
	Manifests         map[string]ManifestRecord                                `json:"manifests"`
	ComponentSHAs     map[string]SHARecord                                     `json:"componentShas"`
	StatusSHAs        map[string]SHARecord                                     `json:"statusShas"`
	UserIDs           map[string]IdentityRecord                                `json:"userIds"`
	GroupIDs          map[string]IdentityRecord                                `json:"groupIds"`
	ManagedNamespaces map[string]PollyRecord[console.ManagedNamespaceFragment] `json:"managedNamespaces"`
}

func SHARecordsFrom(c *cache.SimpleCache[string]) map[string]SHARecord {
	if c == nil {
		return nil
	}

	exported := c.Export()
	records := make(map[string]SHARecord, len(exported))
	for id, line := range exported {
		records[id] = SHARecord{Value: line.Resource, ExpiresAt: line.ExpiresAt}
	}
	return records
}

func ApplySHARecords(c *cache.SimpleCache[string], records map[string]SHARecord) {
	if c == nil || len(records) == 0 {
		return
	}

	items := make(map[string]cache.ExportedLine[string], len(records))
	for id, rec := range records {
		items[id] = cache.ExportedLine[string]{Resource: rec.Value, ExpiresAt: rec.ExpiresAt}
	}
	c.Import(items)
}

func IdentityRecordsFrom(c cache.UserGroupCache) (users, groups map[string]IdentityRecord) {
	if c == nil {
		return nil, nil
	}

	exportedUsers, exportedGroups := c.Export()
	return identityRecordsFrom(exportedUsers), identityRecordsFrom(exportedGroups)
}

func ApplyIdentityRecords(c cache.UserGroupCache, users, groups map[string]IdentityRecord) {
	if c == nil {
		return
	}
	c.Import(identityLinesFrom(users), identityLinesFrom(groups))
}

func identityRecordsFrom(items map[string]cache.IdentityLine) map[string]IdentityRecord {
	records := make(map[string]IdentityRecord, len(items))
	for id, line := range items {
		records[id] = IdentityRecord{Value: line.Value, Created: line.Created}
	}
	return records
}

func identityLinesFrom(items map[string]IdentityRecord) map[string]cache.IdentityLine {
	lines := make(map[string]cache.IdentityLine, len(items))
	for id, rec := range items {
		lines[id] = cache.IdentityLine{Value: rec.Value, Created: rec.Created}
	}
	return lines
}

func PollyRecordsFrom[T any](c *pollycache.Cache[T]) map[string]PollyRecord[T] {
	if c == nil {
		return nil
	}

	exported := c.Export()
	records := make(map[string]PollyRecord[T], len(exported))
	for id, line := range exported {
		records[id] = PollyRecord[T]{Value: line.Resource, Created: line.Created}
	}
	return records
}

func ApplyPollyRecords[T any](c *pollycache.Cache[T], records map[string]PollyRecord[T]) {
	if c == nil || len(records) == 0 {
		return
	}

	items := make(map[string]pollycache.ExportedLine[T], len(records))
	for id, rec := range records {
		items[id] = pollycache.ExportedLine[T]{Resource: rec.Value, Created: rec.Created}
	}
	c.Import(items)
}

func (s *Store) Save(snap Snapshot) error {
	if !s.Enabled() {
		return nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	snap.Version = SnapshotVersion
	snap.WrittenAt = time.Now().UTC()
	if snap.Manifests == nil {
		snap.Manifests = map[string]ManifestRecord{}
	}
	if snap.ComponentSHAs == nil {
		snap.ComponentSHAs = map[string]SHARecord{}
	}
	if snap.StatusSHAs == nil {
		snap.StatusSHAs = map[string]SHARecord{}
	}
	if snap.UserIDs == nil {
		snap.UserIDs = map[string]IdentityRecord{}
	}
	if snap.GroupIDs == nil {
		snap.GroupIDs = map[string]IdentityRecord{}
	}
	if snap.ManagedNamespaces == nil {
		snap.ManagedNamespaces = map[string]PollyRecord[console.ManagedNamespaceFragment]{}
	}

	data, err := json.MarshalIndent(snap, "", "  ")
	if err != nil {
		return err
	}

	tmp, err := os.CreateTemp(s.dir, stateTmpPattern)
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName)

	if err := tmp.Chmod(0o600); err != nil {
		_ = tmp.Close()
		return err
	}
	if _, err := tmp.Write(data); err != nil {
		_ = tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}

	final := filepath.Join(s.dir, stateFileName)
	if err := os.Rename(tmpName, final); err != nil {
		return err
	}

	s.logExport(len(data), snap)
	return nil
}

func (s *Store) logExport(bytes int, snap Snapshot) {
	keys := []any{
		"dir", s.dir,
		"bytes", bytes,
		"manifests", len(snap.Manifests),
		"componentShas", len(snap.ComponentSHAs),
		"statusShas", len(snap.StatusSHAs),
		"userIds", len(snap.UserIDs),
		"groupIds", len(snap.GroupIDs),
		"managedNamespaces", len(snap.ManagedNamespaces),
	}
	s.loggedSave.Do(func() {
		klog.InfoS("exported durable cache snapshot", keys...)
	})
	klog.V(1).InfoS("exported durable cache snapshot", keys...)
}

func (s *Store) Load() (Snapshot, error) {
	var snap Snapshot
	if !s.Enabled() {
		return snap, nil
	}

	data, err := os.ReadFile(filepath.Join(s.dir, stateFileName))
	if errors.Is(err, os.ErrNotExist) {
		klog.InfoS("no durable cache snapshot, starting empty", "dir", s.dir)
		return Snapshot{Version: SnapshotVersion}, nil
	}
	if err != nil {
		return snap, err
	}
	if err := json.Unmarshal(data, &snap); err != nil {
		return snap, err
	}
	if snap.Version != SnapshotVersion {
		return Snapshot{}, fmt.Errorf("unsupported snapshot version %d", snap.Version)
	}
	if time.Now().After(snap.WrittenAt.Add(snapshotMaxAge)) {
		klog.InfoS("durable cache snapshot is stale, starting empty",
			"dir", s.dir,
			"writtenAt", snap.WrittenAt,
			"maxAge", snapshotMaxAge,
		)
		return Snapshot{Version: SnapshotVersion}, nil
	}
	klog.InfoS("loaded durable cache snapshot",
		"dir", s.dir,
		"bytes", len(data),
		"manifests", len(snap.Manifests),
		"componentShas", len(snap.ComponentSHAs),
		"statusShas", len(snap.StatusSHAs),
		"userIds", len(snap.UserIDs),
		"groupIds", len(snap.GroupIDs),
		"managedNamespaces", len(snap.ManagedNamespaces),
	)
	return snap, nil
}
