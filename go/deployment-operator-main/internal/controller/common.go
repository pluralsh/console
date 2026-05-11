package controller

import (
	"context"

	"github.com/pluralsh/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/deployment-operator/internal/errors"
	"github.com/pluralsh/deployment-operator/pkg/cache"
	"github.com/samber/lo"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	k8sClient "sigs.k8s.io/controller-runtime/pkg/client"
)

type K8sObjectIdentifier struct {
	GVK       schema.GroupVersionKind // Group, Version, Kind
	Namespace string                  // Namespace (empty for cluster-scoped objects)
	Name      string                  // Name
}

func (gvk K8sObjectIdentifier) String() string {
	return gvk.GVK.String() + " " + gvk.Namespace + "/" + gvk.Name
}

func ensureBindings(bindings []v1alpha1.Binding, userGroupCache cache.UserGroupCache) ([]v1alpha1.Binding, bool, error) {
	requeue := false
	for i := range bindings {
		binding, req, err := ensureBinding(bindings[i], userGroupCache)
		if err != nil {
			return bindings, req, err
		}

		requeue = requeue || req
		bindings[i] = binding
	}

	return bindings, requeue, nil
}

func ensureBinding(binding v1alpha1.Binding, userGroupCache cache.UserGroupCache) (v1alpha1.Binding, bool, error) {
	requeue := false
	if binding.GroupName == nil && binding.UserEmail == nil {
		return binding, requeue, nil
	}

	if binding.GroupName != nil {
		groupID, err := userGroupCache.GetGroupID(*binding.GroupName)
		if err != nil && !errors.IsNotFound(err) {
			return binding, requeue, err
		}

		requeue = errors.IsNotFound(err)
		binding.GroupID = lo.EmptyableToPtr(groupID)
	}

	if binding.UserEmail != nil {
		userID, err := userGroupCache.GetUserID(*binding.UserEmail)
		if err != nil && !errors.IsNotFound(err) {
			return binding, requeue, err
		}

		requeue = errors.IsNotFound(err)
		binding.UserID = lo.EmptyableToPtr(userID)
	}

	return binding, requeue, nil
}

func GetObjectFromOwnerReference(ctx context.Context, client k8sClient.Client, ref v1.OwnerReference, namespace string) (*unstructured.Unstructured, error) {
	gv, err := apiVersionToGroupVersion(ref.APIVersion)
	if err != nil {
		return nil, err
	}
	gvk := schema.GroupVersionKind{
		Group:   gv.Group,
		Kind:    ref.Kind,
		Version: gv.Version,
	}
	obj := &unstructured.Unstructured{}
	obj.SetGroupVersionKind(gvk)
	if err := client.Get(ctx, k8sClient.ObjectKey{Name: ref.Name, Namespace: namespace}, obj); err != nil {
		return nil, err
	}
	if ref.Kind == "ReplicaSet" {
		// Get Deployment from ReplicaSet
		if len(obj.GetOwnerReferences()) > 0 {
			return GetObjectFromOwnerReference(ctx, client, obj.GetOwnerReferences()[0], namespace)
		}
	}

	return obj, nil
}
