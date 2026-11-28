package zones

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// DemandTTL bounds how long a waiting instance counts as demand. The gateway refreshes its entry while it waits
// and removes it once the instance gets a worker or it gives up, so this only drops entries of a gateway that
// died mid-wait.
const DemandTTL = 15 * time.Minute

// DemandLabel marks the demand ConfigMaps.
const DemandLabel = "devboxes.plural.sh/zone-demand"

// Waiting is an instance waiting for a worker in Zone since Since.
type Waiting struct {
	Zone  string    `json:"zone"`
	Since time.Time `json:"since"`
	// Seen is when the gateway last found no room.
	Seen time.Time `json:"seen"`
}

// Demand records the instances waiting for a worker in their zone. Substrate turns a resume away while no worker
// has room, leaving the actor suspended, so the autoscaler can't see it among the actors. The gateway records it
// here instead, in one ConfigMap per atespace keyed by actor, and the operator counts it as demand in the zone.
type Demand struct {
	Client    client.Client
	Namespace string
	Now       func() time.Time
}

// DemandName is the atespace's demand ConfigMap.
func DemandName(atespace string) string {
	return "devbox-zone-demand." + atespace
}

func (d *Demand) now() time.Time {
	if d.Now != nil {
		return d.Now()
	}
	return time.Now()
}

// Want records that actor is waiting for a worker in zone.
func (d *Demand) Want(ctx context.Context, atespace, actor, zone string) error {
	cm := &corev1.ConfigMap{}
	if err := d.Client.Get(ctx, client.ObjectKey{Namespace: d.Namespace, Name: DemandName(atespace)}, cm); err != nil && !apierrors.IsNotFound(err) {
		return err
	}
	now := d.now().UTC().Truncate(time.Second)
	entry := Waiting{Zone: zone, Since: now, Seen: now}
	var prev Waiting
	if raw, ok := cm.Data[actor]; ok && json.Unmarshal([]byte(raw), &prev) == nil && prev.Zone == zone {
		entry.Since = prev.Since
	}
	value, err := json.Marshal(entry)
	if err != nil {
		return err
	}
	if cm.ResourceVersion == "" {
		cm = &corev1.ConfigMap{
			ObjectMeta: metav1.ObjectMeta{Name: DemandName(atespace), Namespace: d.Namespace, Labels: map[string]string{DemandLabel: "true"}},
			Data:       map[string]string{actor: string(value)},
		}
		if err := d.Client.Create(ctx, cm); !apierrors.IsAlreadyExists(err) {
			return err
		}
	}
	return d.patch(ctx, atespace, map[string]any{actor: string(value)})
}

// Done removes actor's entry, if any.
func (d *Demand) Done(ctx context.Context, atespace, actor string) error {
	return client.IgnoreNotFound(d.patch(ctx, atespace, map[string]any{actor: nil}))
}

func (d *Demand) patch(ctx context.Context, atespace string, data map[string]any) error {
	patch, err := json.Marshal(map[string]any{"data": data})
	if err != nil {
		return err
	}
	cm := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: DemandName(atespace), Namespace: d.Namespace}}
	return d.Client.Patch(ctx, cm, client.RawPatch(types.MergePatchType, patch))
}

// Waiting returns the atespace's waiting instances by actor name, without entries older than DemandTTL.
func (d *Demand) Waiting(ctx context.Context, atespace string) (map[string]Waiting, error) {
	cm := &corev1.ConfigMap{}
	if err := d.Client.Get(ctx, client.ObjectKey{Namespace: d.Namespace, Name: DemandName(atespace)}, cm); err != nil {
		if apierrors.IsNotFound(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("reading zone demand: %w", err)
	}
	out := map[string]Waiting{}
	for actor, raw := range cm.Data {
		var w Waiting
		if json.Unmarshal([]byte(raw), &w) != nil || w.Zone == "" || d.now().Sub(w.Seen) > DemandTTL {
			continue
		}
		out[actor] = w
	}
	return out, nil
}

// Delete removes the atespace's demand ConfigMap.
func (d *Demand) Delete(ctx context.Context, atespace string) error {
	cm := &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: DemandName(atespace), Namespace: d.Namespace}}
	return client.IgnoreNotFound(d.Client.Delete(ctx, cm))
}
