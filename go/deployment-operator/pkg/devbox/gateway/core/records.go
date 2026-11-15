package core

import (
	"context"
	"encoding/json"
	"strings"
	"sync"

	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// Records persists instance records so a restarted gateway can reconcile with console's RegisterGateway
// summaries. Get returns nil, nil for an unknown instance.
type Records interface {
	Put(ctx context.Context, rec *Record) error
	Get(ctx context.Context, id string) (*Record, error)
	List(ctx context.Context) ([]*Record, error)
	Delete(ctx context.Context, id string) error
}

const (
	recordLabel = "devboxes.plural.sh/instance-record"
	recordKey   = "instance.json"
)

// KubeRecords keeps one ConfigMap per instance in the gateway's namespace. Records hold no credentials.
type KubeRecords struct {
	Client    client.Client
	Namespace string
}

func recordName(id string) string {
	return "devbox-instance-" + strings.TrimPrefix(ActorName(id), "dbx-")
}

func (k *KubeRecords) Put(ctx context.Context, rec *Record) error {
	data, err := json.Marshal(rec)
	if err != nil {
		return err
	}
	cm := &corev1.ConfigMap{}
	err = k.Client.Get(ctx, client.ObjectKey{Namespace: k.Namespace, Name: recordName(rec.InstanceID)}, cm)
	if apierrors.IsNotFound(err) {
		cm = &corev1.ConfigMap{
			ObjectMeta: metav1.ObjectMeta{Name: recordName(rec.InstanceID), Namespace: k.Namespace, Labels: map[string]string{recordLabel: "true"}},
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

func (k *KubeRecords) Get(ctx context.Context, id string) (*Record, error) {
	cm := &corev1.ConfigMap{}
	err := k.Client.Get(ctx, client.ObjectKey{Namespace: k.Namespace, Name: recordName(id)}, cm)
	if apierrors.IsNotFound(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return decodeRecord(cm)
}

func (k *KubeRecords) List(ctx context.Context) ([]*Record, error) {
	var list corev1.ConfigMapList
	if err := k.Client.List(ctx, &list, client.InNamespace(k.Namespace), client.MatchingLabels{recordLabel: "true"}); err != nil {
		return nil, err
	}
	out := make([]*Record, 0, len(list.Items))
	for i := range list.Items {
		if rec, err := decodeRecord(&list.Items[i]); err == nil {
			out = append(out, rec)
		}
	}
	return out, nil
}

func (k *KubeRecords) Delete(ctx context.Context, id string) error {
	cm := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: recordName(id), Namespace: k.Namespace}}
	return client.IgnoreNotFound(k.Client.Delete(ctx, cm))
}

func decodeRecord(cm *corev1.ConfigMap) (*Record, error) {
	rec := &Record{}
	return rec, json.Unmarshal([]byte(cm.Data[recordKey]), rec)
}

// MemoryRecords keeps records in memory (tests and local development).
type MemoryRecords struct {
	mu   sync.Mutex
	recs map[string][]byte
}

func (m *MemoryRecords) Put(_ context.Context, rec *Record) error {
	data, err := json.Marshal(rec)
	if err != nil {
		return err
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.recs == nil {
		m.recs = map[string][]byte{}
	}
	m.recs[rec.InstanceID] = data
	return nil
}

func (m *MemoryRecords) Get(_ context.Context, id string) (*Record, error) {
	m.mu.Lock()
	data, ok := m.recs[id]
	m.mu.Unlock()
	if !ok {
		return nil, nil
	}
	rec := &Record{}
	return rec, json.Unmarshal(data, rec)
}

func (m *MemoryRecords) List(ctx context.Context) ([]*Record, error) {
	m.mu.Lock()
	ids := make([]string, 0, len(m.recs))
	for id := range m.recs {
		ids = append(ids, id)
	}
	m.mu.Unlock()
	out := make([]*Record, 0, len(ids))
	for _, id := range ids {
		if rec, err := m.Get(ctx, id); err == nil && rec != nil {
			out = append(out, rec)
		}
	}
	return out, nil
}

func (m *MemoryRecords) Delete(_ context.Context, id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.recs, id)
	return nil
}
