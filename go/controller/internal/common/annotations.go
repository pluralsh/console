package common

import (
	"context"
	"fmt"
	"strings"

	"github.com/pluralsh/console/go/controller/internal/log"
	"github.com/pluralsh/console/go/controller/internal/utils"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/klog/v2"
	runtimeclient "sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/apiutil"
	"sigs.k8s.io/controller-runtime/pkg/handler"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

const (
	// OwnedByAnnotation is an annotation used to mark resources that are owned by our CRDs.
	// It is used instead of the standard owner reference to avoid garbage collection of resources
	// but still be able to reconcile them.
	// DEPRECATED: Use utils.OwnerRefAnnotation instead.
	OwnedByAnnotation = "deployments.plural.sh/owned-by"
)

// OwnedByEventHandler returns an EventHandler that reconciles objects that have the OwnedByAnnotation.
// DEPRECATED: Use utils.OwnerRefAnnotationEventHandler.
func OwnedByEventHandler(ownerGk *metav1.GroupKind) handler.EventHandler {
	return handler.EnqueueRequestsFromMapFunc(func(ctx context.Context, obj runtimeclient.Object) []reconcile.Request {
		if !hasOwnedByAnnotation(obj) {
			return nil
		}

		ownedBy := obj.GetAnnotations()[OwnedByAnnotation]
		annotationGk, namespacedName, err := fromOwnedByAnnotation(ownedBy)
		if err != nil {
			klog.ErrorS(err, "failed to parse owned-by annotation", "annotation", ownedBy)
			return nil
		}

		if ownerGk != nil && !strings.EqualFold(annotationGk.String(), ownerGk.String()) {
			klog.V(log.LogLevelDebug).InfoS(
				"owned-by annotation does not match expected group kind",
				"ownerGk", ownerGk.String(),
				"annotationGk", annotationGk.String(),
			)
			return nil
		}

		klog.V(log.LogLevelDebug).InfoS("enqueueing request for owned-by annotation",
			"annotation", ownedBy,
		)
		return []reconcile.Request{{NamespacedName: namespacedName}}
	})
}

// TryAddOwnedByAnnotation adds the owned-by annotation to the child object.
// DEPRECATED: Use utils.TryAddOwnerRef instead.
func TryAddOwnedByAnnotation(ctx context.Context, client runtimeclient.Client, owner runtimeclient.Object,
	child runtimeclient.Object) error {
	if hasOwnedByAnnotation(child) {
		klog.V(log.LogLevelDebug).InfoS("owned-by annotation already exists",
			"annotation", OwnedByAnnotation, "owner", owner.GetName(), "child", child.GetName())
		return nil
	}

	annotations := child.GetAnnotations()
	if annotations == nil {
		annotations = make(map[string]string)
	}

	gvk, err := apiutil.GVKForObject(owner, client.Scheme())
	if err != nil {
		return fmt.Errorf("failed to get GVK for owner %s: %w", owner.GetName(), err)
	}
	annotations[OwnedByAnnotation] = toOwnedByAnnotation(gvk.Group, gvk.Kind, owner.GetNamespace(), owner.GetName())
	child.SetAnnotations(annotations)

	klog.V(log.LogLevelDebug).InfoS("adding owned-by annotation",
		"annotation", OwnedByAnnotation, "owner", owner.GetName(), "child", child.GetName())
	return utils.TryToUpdate(ctx, client, child)
}

// hasOwnedByAnnotation returns true if the object has the OwnedByAnnotation.
// DEPRECATED.
func hasOwnedByAnnotation(obj runtimeclient.Object) bool {
	if obj.GetAnnotations() == nil {
		return false
	}

	value, exists := obj.GetAnnotations()[OwnedByAnnotation]
	_, _, err := fromOwnedByAnnotation(value)
	return exists && err == nil
}

// fromOwnedByAnnotation parses the OwnedByAnnotation and returns the GroupKind and NamespacedName.
// DEPRECATED.
func fromOwnedByAnnotation(annotation string) (metav1.GroupKind, types.NamespacedName, error) {
	parts := strings.Split(annotation, "/")
	if len(parts) != 4 {
		return metav1.GroupKind{}, types.NamespacedName{},
			fmt.Errorf("%s annotation has wrong format %s", OwnedByAnnotation, annotation)
	}

	return metav1.GroupKind{Group: parts[0], Kind: parts[1]},
		types.NamespacedName{Namespace: parts[2], Name: parts[3]}, nil
}

// toOwnedByAnnotation returns the OwnedByAnnotation for the given group, kind, namespace and name.
// DEPRECATED.
func toOwnedByAnnotation(group, kind, namespace, name string) string {
	return strings.ToLower(fmt.Sprintf("%s/%s/%s/%s", group, kind, namespace, name))
}
