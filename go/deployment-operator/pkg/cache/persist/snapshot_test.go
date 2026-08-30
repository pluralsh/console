package persist

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/deployment-operator/pkg/cache"
	pollycache "github.com/pluralsh/console/go/polly/cache"
	"github.com/samber/lo"
	"github.com/stretchr/testify/require"
)

func TestSaveLoadRoundTrip(t *testing.T) {
	dir := t.TempDir()
	store, err := Open(dir)
	require.NoError(t, err)
	require.True(t, store.Enabled())
	t.Cleanup(func() { _ = store.Close() })

	expires := time.Now().Add(time.Hour).UTC().Truncate(time.Millisecond)
	created := time.Now().UTC().Truncate(time.Millisecond)
	snap := Snapshot{
		Manifests: map[string]ManifestRecord{
			"svc-1": {Dir: "/tmp/manifests/svc-1/abc", SHA: "abc", Created: created, Expiry: time.Hour},
		},
		ComponentSHAs: map[string]SHARecord{
			"svc-1": {Value: "comp-sha", ExpiresAt: expires},
		},
		StatusSHAs: map[string]SHARecord{
			"svc-1": {Value: "status-sha", ExpiresAt: expires},
		},
		UserIDs: map[string]IdentityRecord{
			"a@example.com": {Value: "user-1", Created: created},
		},
		GroupIDs: map[string]IdentityRecord{
			"admins": {Value: "group-1", Created: created},
		},
		ManagedNamespaces: map[string]PollyRecord[console.ManagedNamespaceFragment]{
			"ns-1": {Value: console.ManagedNamespaceFragment{ID: "ns-1", Name: "foo"}, Created: created},
		},
	}

	require.NoError(t, store.Save(snap))
	requireNoTmpFiles(t, dir)

	loaded, err := store.Load()
	require.NoError(t, err)
	require.Equal(t, SnapshotVersion, loaded.Version)
	require.WithinDuration(t, time.Now(), loaded.WrittenAt, time.Second)
	require.Equal(t, snap.Manifests["svc-1"].SHA, loaded.Manifests["svc-1"].SHA)
	require.Equal(t, snap.ComponentSHAs["svc-1"].Value, loaded.ComponentSHAs["svc-1"].Value)
	require.Equal(t, snap.StatusSHAs["svc-1"].Value, loaded.StatusSHAs["svc-1"].Value)
	require.Equal(t, "user-1", loaded.UserIDs["a@example.com"].Value)
	require.Equal(t, "group-1", loaded.GroupIDs["admins"].Value)
	require.Equal(t, "ns-1", loaded.ManagedNamespaces["ns-1"].Value.ID)
}

func TestLoadMissingFileReturnsEmptySnapshot(t *testing.T) {
	dir := t.TempDir()
	store, err := Open(dir)
	require.NoError(t, err)
	t.Cleanup(func() { _ = store.Close() })

	loaded, err := store.Load()
	require.NoError(t, err)
	require.Equal(t, SnapshotVersion, loaded.Version)
	require.Empty(t, loaded.Manifests)
}

func TestLoadStaleSnapshotReturnsEmptySnapshot(t *testing.T) {
	dir := t.TempDir()
	store, err := Open(dir)
	require.NoError(t, err)
	t.Cleanup(func() { _ = store.Close() })

	require.NoError(t, store.Save(Snapshot{
		Manifests: map[string]ManifestRecord{"stale": {SHA: "old"}},
	}))

	statePath := filepath.Join(dir, stateFileName)
	data, err := os.ReadFile(statePath)
	require.NoError(t, err)
	var snap Snapshot
	require.NoError(t, json.Unmarshal(data, &snap))
	snap.WrittenAt = time.Now().Add(-snapshotMaxAge - time.Minute)
	data, err = json.Marshal(snap)
	require.NoError(t, err)
	require.NoError(t, os.WriteFile(statePath, data, 0o600))

	loaded, err := store.Load()
	require.NoError(t, err)
	require.Equal(t, SnapshotVersion, loaded.Version)
	require.Empty(t, loaded.Manifests)
}

func TestLoadCorruptFileReturnsError(t *testing.T) {
	dir := t.TempDir()
	store, err := Open(dir)
	require.NoError(t, err)
	t.Cleanup(func() { _ = store.Close() })

	require.NoError(t, os.WriteFile(filepath.Join(dir, stateFileName), []byte("not-json"), 0o600))

	_, err = store.Load()
	require.Error(t, err)
}

func TestLoadUnsupportedVersionReturnsError(t *testing.T) {
	dir := t.TempDir()
	store, err := Open(dir)
	require.NoError(t, err)
	t.Cleanup(func() { _ = store.Close() })

	require.NoError(t, os.WriteFile(filepath.Join(dir, stateFileName), []byte(`{"version": 99}`), 0o600))

	_, err = store.Load()
	require.Error(t, err)
	require.Contains(t, err.Error(), "unsupported snapshot version")
}

func TestSaveIsAtomic(t *testing.T) {
	dir := t.TempDir()
	store, err := Open(dir)
	require.NoError(t, err)
	t.Cleanup(func() { _ = store.Close() })

	require.NoError(t, store.Save(Snapshot{
		Manifests: map[string]ManifestRecord{"a": {SHA: "1"}},
	}))
	require.NoError(t, store.Save(Snapshot{
		Manifests: map[string]ManifestRecord{"b": {SHA: "2"}},
	}))

	data, err := os.ReadFile(filepath.Join(dir, stateFileName))
	require.NoError(t, err)
	var snap Snapshot
	require.NoError(t, json.Unmarshal(data, &snap))
	require.Equal(t, "2", snap.Manifests["b"].SHA)
	require.NotContains(t, snap.Manifests, "a")
}

func TestSecondOpenSharesCacheDir(t *testing.T) {
	dir := t.TempDir()
	first, err := Open(dir)
	require.NoError(t, err)
	require.True(t, first.Enabled())
	t.Cleanup(func() { _ = first.Close() })

	second, err := Open(dir)
	require.NoError(t, err)
	require.True(t, second.Enabled())
	require.Equal(t, dir, second.Dir())
	t.Cleanup(func() { _ = second.Close() })

	require.NoError(t, first.Save(Snapshot{
		Manifests: map[string]ManifestRecord{"a": {SHA: "1"}},
	}))
	require.NoError(t, second.Save(Snapshot{
		Manifests: map[string]ManifestRecord{"b": {SHA: "2"}},
	}))

	loaded, err := first.Load()
	require.NoError(t, err)
	require.Equal(t, SnapshotVersion, loaded.Version)
	require.NotEmpty(t, loaded.Manifests)
	requireNoTmpFiles(t, dir)
}

func TestOverlappingStoresDoNotCorruptSnapshot(t *testing.T) {
	dir := t.TempDir()
	first, err := Open(dir)
	require.NoError(t, err)
	t.Cleanup(func() { _ = first.Close() })
	second, err := Open(dir)
	require.NoError(t, err)
	t.Cleanup(func() { _ = second.Close() })

	var wg sync.WaitGroup
	for i := 0; i < 20; i++ {
		wg.Add(2)
		go func(i int) {
			defer wg.Done()
			require.NoError(t, first.Save(Snapshot{
				Manifests: map[string]ManifestRecord{
					fmt.Sprintf("a-%d", i): {SHA: fmt.Sprintf("a-%d", i)},
				},
			}))
		}(i)
		go func(i int) {
			defer wg.Done()
			require.NoError(t, second.Save(Snapshot{
				Manifests: map[string]ManifestRecord{
					fmt.Sprintf("b-%d", i): {SHA: fmt.Sprintf("b-%d", i)},
				},
			}))
		}(i)
	}
	wg.Wait()

	loaded, err := first.Load()
	require.NoError(t, err)
	require.Equal(t, SnapshotVersion, loaded.Version)
	require.Len(t, loaded.Manifests, 1)
	requireNoTmpFiles(t, dir)
}

func TestSHARecordsRoundTrip(t *testing.T) {
	c := cache.NewSimpleCache[string](time.Hour)
	c.Add("id", "sha-value")

	records := SHARecordsFrom(c)
	require.Contains(t, records, "id")
	require.Equal(t, "sha-value", records["id"].Value)

	restored := cache.NewSimpleCache[string](time.Hour)
	ApplySHARecords(restored, records)
	got, ok := restored.Get("id")
	require.True(t, ok)
	require.Equal(t, "sha-value", got)

	ApplySHARecords(restored, map[string]SHARecord{
		"expired": {Value: "old", ExpiresAt: time.Now().Add(-time.Minute)},
	})
	_, ok = restored.Get("expired")
	require.False(t, ok)
}

func TestIdentityRecordsRoundTrip(t *testing.T) {
	ug := cache.NewUserGroupCache(nil)
	ug.Import(map[string]cache.IdentityLine{
		"a@example.com": {Value: "user-1", Created: time.Now()},
	}, map[string]cache.IdentityLine{
		"admins": {Value: "group-1", Created: time.Now()},
	})

	users, groups := IdentityRecordsFrom(ug)
	require.Equal(t, "user-1", users["a@example.com"].Value)
	require.Equal(t, "group-1", groups["admins"].Value)

	restored := cache.NewUserGroupCache(nil)
	ApplyIdentityRecords(restored, users, groups)
	userID, err := restored.GetUserID("a@example.com")
	require.NoError(t, err)
	require.Equal(t, "user-1", userID)
	groupID, err := restored.GetGroupID("admins")
	require.NoError(t, err)
	require.Equal(t, "group-1", groupID)

	ApplyIdentityRecords(restored, map[string]IdentityRecord{
		"old@example.com": {Value: "stale", Created: time.Now().Add(-time.Hour)},
	}, nil)
	exportedUsers, _ := restored.Export()
	require.NotContains(t, exportedUsers, "old@example.com")
}

func TestPollyRecordsRoundTrip(t *testing.T) {
	src := pollycache.NewCache[console.ManagedNamespaceFragment](time.Hour, func(id string) (*console.ManagedNamespaceFragment, error) {
		t.Fatalf("unexpected fetch %s", id)
		return nil, nil
	})
	src.Add("ns-1", &console.ManagedNamespaceFragment{ID: "ns-1", Name: "foo"})

	records := PollyRecordsFrom(src)
	require.Equal(t, "foo", records["ns-1"].Value.Name)

	dst := pollycache.NewCache[console.ManagedNamespaceFragment](time.Hour, func(id string) (*console.ManagedNamespaceFragment, error) {
		t.Fatalf("unexpected fetch %s", id)
		return nil, nil
	})
	ApplyPollyRecords(dst, records)
	ApplyPollyRecords(dst, map[string]PollyRecord[console.ManagedNamespaceFragment]{
		"stale": {Value: console.ManagedNamespaceFragment{ID: "stale"}, Created: time.Now().Add(-2 * time.Hour)},
	})

	got, err := dst.Get("ns-1")
	require.NoError(t, err)
	require.Equal(t, "foo", lo.FromPtr(got).Name)
	require.NotContains(t, dst.Export(), "stale")
}

func TestDisabledStoreIsNoop(t *testing.T) {
	store, err := Open("")
	require.NoError(t, err)
	require.False(t, store.Enabled())
	require.NoError(t, store.Save(Snapshot{Manifests: map[string]ManifestRecord{"x": {SHA: "y"}}}))
	loaded, err := store.Load()
	require.NoError(t, err)
	require.Empty(t, loaded.Manifests)
}

func TestConcurrentSavesDoNotCorruptSnapshot(t *testing.T) {
	dir := t.TempDir()
	store, err := Open(dir)
	require.NoError(t, err)
	t.Cleanup(func() { _ = store.Close() })

	var wg sync.WaitGroup
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			id := fmt.Sprintf("svc-%d", i)
			require.NoError(t, store.Save(Snapshot{
				Manifests: map[string]ManifestRecord{
					id: {Dir: "/tmp/" + id, SHA: id, Created: time.Now(), Expiry: time.Hour},
				},
			}))
		}(i)
	}
	wg.Wait()

	loaded, err := store.Load()
	require.NoError(t, err)
	require.Equal(t, SnapshotVersion, loaded.Version)
	require.Len(t, loaded.Manifests, 1)
	requireNoTmpFiles(t, dir)
}

func TestWaitPeriodicJoinsBeforeFinalSave(t *testing.T) {
	dir := t.TempDir()
	store, err := Open(dir)
	require.NoError(t, err)
	t.Cleanup(func() { _ = store.Close() })

	ctx, cancel := context.WithCancel(context.Background())
	store.StartPeriodic(ctx, 10*time.Millisecond, func() error {
		return store.Save(Snapshot{
			Manifests: map[string]ManifestRecord{"tick": {SHA: "tick"}},
		})
	})
	time.Sleep(30 * time.Millisecond)
	cancel()
	store.WaitPeriodic()

	require.NoError(t, store.Save(Snapshot{
		Manifests: map[string]ManifestRecord{"final": {SHA: "final"}},
	}))
	loaded, err := store.Load()
	require.NoError(t, err)
	require.Equal(t, "final", loaded.Manifests["final"].SHA)
	requireNoTmpFiles(t, dir)
}

func requireNoTmpFiles(t *testing.T, dir string) {
	t.Helper()
	matches, err := filepath.Glob(filepath.Join(dir, stateTmpPattern))
	require.NoError(t, err)
	require.Empty(t, matches)
}
