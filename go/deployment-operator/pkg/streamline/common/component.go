package common

import (
	"github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/polly/algorithms"
	"github.com/samber/lo"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
)

type Component struct {
	UID                  string
	ParentUID            string
	Group                string
	Version              string
	Kind                 string
	Name                 string
	Namespace            string
	Status               string
	ServiceID            string
	Manifest             bool
	DeletePhase          string
	ManifestSHA          string
	TransientManifestSHA string
	ApplySHA             string
	ServerSHA            string
}

func (in *Component) GroupVersionKind() schema.GroupVersionKind {
	return schema.GroupVersionKind{Group: in.Group, Version: in.Version, Kind: in.Kind}
}

func (in *Component) DeletableUnstructured() unstructured.Unstructured {
	u := unstructured.Unstructured{}
	u.SetGroupVersionKind(in.GroupVersionKind())
	u.SetNamespace(in.Namespace)
	u.SetName(in.Name)
	u.SetUID(types.UID(in.UID))
	u.SetAnnotations(map[string]string{SyncPhaseAnnotation: in.DeletePhase})
	return u
}

func (in *Component) ComponentAttributes() client.ComponentAttributes {
	return client.ComponentAttributes{
		UID:       lo.ToPtr(in.UID),
		Synced:    true,
		Group:     in.Group,
		Version:   in.Version,
		Kind:      in.Kind,
		Name:      in.Name,
		Namespace: in.Namespace,
		State:     lo.ToPtr(client.ComponentState(in.Status)),
	}
}

func (in *Component) StoreKey() StoreKey {
	return StoreKey{GVK: in.GroupVersionKind(), Namespace: in.Namespace, Name: in.Name}
}

func (in *Component) Key() Key {
	return in.StoreKey().Key()
}

// ShouldApply determines if a resource should be applied.
// Resource should be applied if at least one of the following conditions is met:
// - any of the SHAs (Server, Apply, or Manifest) are not set
// - the current server SHA differs from stored apply SHA (indicating resource changed in cluster)
// - the new manifest SHA differs from stored manifest SHA (indicating the manifest has changed)
// - the resource is not in a running state
func (in *Component) ShouldApply(newManifestSHA string) bool {
	return in.ServerSHA == "" || in.ApplySHA == "" || in.ManifestSHA == "" ||
		in.ServerSHA != in.ApplySHA || newManifestSHA != in.ManifestSHA ||
		client.ComponentState(in.Status) != client.ComponentStateRunning
}

type Components []Component

func (in Components) ComponentAttributes() []client.ComponentAttributes {
	return algorithms.Map(in, func(c Component) client.ComponentAttributes { return c.ComponentAttributes() })
}
