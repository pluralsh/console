package block

import (
	"context"
	"encoding/json"
	"sync"

	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// VolumeRecord is what the controller knows about a volume. DiskID is empty until the first attach creates the
// disk.
type VolumeRecord struct {
	Name          string `json:"name"`
	CapacityBytes int64  `json:"capacityBytes"`
	// Params go to the provider when the disk is created.
	Params map[string]string `json:"params,omitempty"`
	Seed   string            `json:"seed,omitempty"`
	// Group is the StorageClass group whose largest size the disk grows to.
	Group string `json:"group,omitempty"`
	// Golden marks the volume that claimed its seed; its disk becomes the seed when it's deleted.
	Golden bool `json:"golden,omitempty"`
	// SnapshotID is the seed snapshot the disk is created from.
	SnapshotID string `json:"snapshotID,omitempty"`
	DiskID     string `json:"diskID,omitempty"`
	// Node is the node the disk was last attached to, for detaching when Substrate doesn't name it.
	Node string `json:"node,omitempty"`
	// Generation counts the disk's moves. Each move's disk is named for its generation, so a retried move finds
	// the disk it created.
	Generation int `json:"generation,omitempty"`
	// Move is the snapshot a move to a node the disk can't reach is going through.
	Move *Move `json:"move,omitempty"`
	// Garbage is what moves left behind, deleted by the collector.
	Garbage []Garbage `json:"garbage,omitempty"`
}

// Move is a disk being moved through a snapshot.
type Move struct {
	Snapshot string `json:"snapshot"`
	// Ready is set once the snapshot can seed a disk.
	Ready bool `json:"ready,omitempty"`
}

// Garbage is a disk or snapshot to delete.
type Garbage struct {
	Disk     string `json:"disk,omitempty"`
	Snapshot string `json:"snapshot,omitempty"`
}

// SeedRecord tracks a seed: the volume that claimed it, then the snapshot captured from that volume's disk.
type SeedRecord struct {
	Name       string `json:"name"`
	Claim      string `json:"claim,omitempty"`
	SnapshotID string `json:"snapshotID,omitempty"`
}

func (s *SeedRecord) captured() bool { return s != nil && s.SnapshotID != "" }

// Store persists volume and seed records. Get returns nil, nil for a missing record.
type Store interface {
	GetVolume(ctx context.Context, name string) (*VolumeRecord, error)
	PutVolume(ctx context.Context, rec *VolumeRecord) error
	DeleteVolume(ctx context.Context, name string) error
	ListVolumes(ctx context.Context) ([]*VolumeRecord, error)
	GetSeed(ctx context.Context, name string) (*SeedRecord, error)
	PutSeed(ctx context.Context, rec *SeedRecord) error
	DeleteSeed(ctx context.Context, name string) error
	ListSeeds(ctx context.Context) ([]*SeedRecord, error)
}

const (
	recordLabel = "devboxes.plural.sh/block-record"
	recordKey   = "record.json"

	kindVolume = "volume"
	kindSeed   = "seed"
)

// KubeStore keeps one ConfigMap per record in Namespace.
type KubeStore struct {
	Client    client.Client
	Namespace string
}

func configMapName(kind, name string) string { return "devbox-block-" + kind + "." + name }

func (k *KubeStore) get(ctx context.Context, kind, name string, out any) (bool, error) {
	cm := &corev1.ConfigMap{}
	err := k.Client.Get(ctx, client.ObjectKey{Namespace: k.Namespace, Name: configMapName(kind, name)}, cm)
	if apierrors.IsNotFound(err) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, json.Unmarshal([]byte(cm.Data[recordKey]), out)
}

func (k *KubeStore) put(ctx context.Context, kind, name string, rec any) error {
	data, err := json.Marshal(rec)
	if err != nil {
		return err
	}
	cm := &corev1.ConfigMap{}
	err = k.Client.Get(ctx, client.ObjectKey{Namespace: k.Namespace, Name: configMapName(kind, name)}, cm)
	if apierrors.IsNotFound(err) {
		cm = &corev1.ConfigMap{
			ObjectMeta: metav1.ObjectMeta{Name: configMapName(kind, name), Namespace: k.Namespace, Labels: map[string]string{recordLabel: kind}},
			Data:       map[string]string{recordKey: string(data)},
		}
		return k.Client.Create(ctx, cm)
	}
	if err != nil {
		return err
	}
	cm.Data = map[string]string{recordKey: string(data)}
	return k.Client.Update(ctx, cm)
}

func (k *KubeStore) delete(ctx context.Context, kind, name string) error {
	cm := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: configMapName(kind, name), Namespace: k.Namespace}}
	return client.IgnoreNotFound(k.Client.Delete(ctx, cm))
}

func (k *KubeStore) list(ctx context.Context, kind string, each func(data []byte) error) error {
	var list corev1.ConfigMapList
	if err := k.Client.List(ctx, &list, client.InNamespace(k.Namespace), client.MatchingLabels{recordLabel: kind}); err != nil {
		return err
	}
	for i := range list.Items {
		if err := each([]byte(list.Items[i].Data[recordKey])); err != nil {
			return err
		}
	}
	return nil
}

func (k *KubeStore) GetVolume(ctx context.Context, name string) (*VolumeRecord, error) {
	rec := &VolumeRecord{}
	if ok, err := k.get(ctx, kindVolume, name, rec); !ok || err != nil {
		return nil, err
	}
	return rec, nil
}

func (k *KubeStore) PutVolume(ctx context.Context, rec *VolumeRecord) error {
	return k.put(ctx, kindVolume, rec.Name, rec)
}

func (k *KubeStore) DeleteVolume(ctx context.Context, name string) error {
	return k.delete(ctx, kindVolume, name)
}

func (k *KubeStore) ListVolumes(ctx context.Context) ([]*VolumeRecord, error) {
	var out []*VolumeRecord
	return out, k.list(ctx, kindVolume, func(data []byte) error {
		rec := &VolumeRecord{}
		if err := json.Unmarshal(data, rec); err != nil {
			return err
		}
		out = append(out, rec)
		return nil
	})
}

func (k *KubeStore) GetSeed(ctx context.Context, name string) (*SeedRecord, error) {
	rec := &SeedRecord{}
	if ok, err := k.get(ctx, kindSeed, name, rec); !ok || err != nil {
		return nil, err
	}
	return rec, nil
}

func (k *KubeStore) PutSeed(ctx context.Context, rec *SeedRecord) error {
	return k.put(ctx, kindSeed, rec.Name, rec)
}

func (k *KubeStore) DeleteSeed(ctx context.Context, name string) error {
	return k.delete(ctx, kindSeed, name)
}

func (k *KubeStore) ListSeeds(ctx context.Context) ([]*SeedRecord, error) {
	var out []*SeedRecord
	return out, k.list(ctx, kindSeed, func(data []byte) error {
		rec := &SeedRecord{}
		if err := json.Unmarshal(data, rec); err != nil {
			return err
		}
		out = append(out, rec)
		return nil
	})
}

// MemoryStore keeps records in memory (tests).
type MemoryStore struct {
	mu      sync.Mutex
	volumes map[string]VolumeRecord
	seeds   map[string]SeedRecord
}

func (m *MemoryStore) GetVolume(_ context.Context, name string) (*VolumeRecord, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	rec, ok := m.volumes[name]
	if !ok {
		return nil, nil
	}
	return &rec, nil
}

func (m *MemoryStore) PutVolume(_ context.Context, rec *VolumeRecord) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.volumes == nil {
		m.volumes = map[string]VolumeRecord{}
	}
	m.volumes[rec.Name] = *rec
	return nil
}

func (m *MemoryStore) DeleteVolume(_ context.Context, name string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.volumes, name)
	return nil
}

func (m *MemoryStore) ListVolumes(context.Context) ([]*VolumeRecord, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	out := make([]*VolumeRecord, 0, len(m.volumes))
	for _, rec := range m.volumes {
		out = append(out, &rec)
	}
	return out, nil
}

func (m *MemoryStore) GetSeed(_ context.Context, name string) (*SeedRecord, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	rec, ok := m.seeds[name]
	if !ok {
		return nil, nil
	}
	return &rec, nil
}

func (m *MemoryStore) PutSeed(_ context.Context, rec *SeedRecord) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.seeds == nil {
		m.seeds = map[string]SeedRecord{}
	}
	m.seeds[rec.Name] = *rec
	return nil
}

func (m *MemoryStore) DeleteSeed(_ context.Context, name string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.seeds, name)
	return nil
}

func (m *MemoryStore) ListSeeds(context.Context) ([]*SeedRecord, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	out := make([]*SeedRecord, 0, len(m.seeds))
	for _, rec := range m.seeds {
		out = append(out, &rec)
	}
	return out, nil
}

// keyedLock serializes work per key.
type keyedLock struct {
	mu    sync.Mutex
	locks map[string]*keyedEntry
}

type keyedEntry struct {
	mu   sync.Mutex
	refs int
}

func (k *keyedLock) lock(key string) func() {
	k.mu.Lock()
	if k.locks == nil {
		k.locks = map[string]*keyedEntry{}
	}
	e := k.locks[key]
	if e == nil {
		e = &keyedEntry{}
		k.locks[key] = e
	}
	e.refs++
	k.mu.Unlock()
	e.mu.Lock()
	return func() {
		e.mu.Unlock()
		k.mu.Lock()
		if e.refs--; e.refs == 0 {
			delete(k.locks, key)
		}
		k.mu.Unlock()
	}
}
