package common

import (
	"github.com/pluralsh/console/go/client"
	"github.com/pluralsh/deployment-operator/internal/utils"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
)

// HookComponent represents hook resources that have deletion policy set.
type HookComponent struct {
	UID            string
	Group          string
	Version        string
	Kind           string
	Name           string
	Namespace      string
	Status         string
	ManifestSHA    string
	ServiceID      string
	DeletePolicies []string
}

func (in *HookComponent) GroupVersionKind() schema.GroupVersionKind {
	return schema.GroupVersionKind{Group: in.Group, Version: in.Version, Kind: in.Kind}
}

func (in *HookComponent) Succeeded() bool {
	return in.Status == string(client.ComponentStateRunning)
}

func (in *HookComponent) Failed() bool {
	return in.Status == string(client.ComponentStateFailed)
}

// HasDesiredState checks if the hook has the desired state based on its delete policies.
// Delete policies from the live resource can be passed as an argument to make check better.
// To use the delete policies from the store, use HadDesiredState.
func (in *HookComponent) HasDesiredState(policies []string) bool {
	for _, policy := range policies {
		if policy == HookDeletePolicySucceeded && in.Succeeded() {
			return true
		} else if policy == HookDeletePolicyFailed && in.Failed() {
			return true
		}
	}

	return false
}

// HadDesiredState checks if the hook had the desired state based on its stored delete policies.
// It uses delete policies from the store that may have changed.
// If possible, use HasDesiredState with live resource delete policies.
func (in *HookComponent) HadDesiredState() bool {
	return in.HasDesiredState(in.DeletePolicies)
}

func (in *HookComponent) HasManifestChanged(u unstructured.Unstructured) bool {
	sha, _ := utils.HashResource(u)
	return in.ManifestSHA != sha
}

func (in *HookComponent) Unstructured() unstructured.Unstructured {
	u := unstructured.Unstructured{}
	u.SetGroupVersionKind(in.GroupVersionKind())
	u.SetNamespace(in.Namespace)
	u.SetName(in.Name)
	u.SetUID(types.UID(in.UID))
	return u
}

func (in *HookComponent) StoreKey() StoreKey {
	return StoreKey{GVK: in.GroupVersionKind(), Namespace: in.Namespace, Name: in.Name}
}
