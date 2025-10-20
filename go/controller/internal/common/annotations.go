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
	"sigs.k8s.io/controller-runtime/pkg/handler"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

const (
	// OwnedByAnnotationName is an annotation used to mark resources that are owned by our CRDs.
	// It is used instead of the standard owner reference to avoid garbage collection of resources
	// but still be able to reconcile them.
	OwnedByAnnotationName = "deployments.plural.sh/owned-by"
)

func OwnedByEventHandler(ownerGk *metav1.GroupKind) handler.EventHandler {
	return handler.EnqueueRequestsFromMapFunc(func(ctx context.Context, obj runtimeclient.Object) []reconcile.Request {
		if !HasAnnotation(obj, OwnedByAnnotationName) {
			return nil
		}

		ownedBy := obj.GetAnnotations()[OwnedByAnnotationName]
		annotationGk, namespacedName, err := fromAnnotation(ownedBy)
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

func TryAddOwnedByAnnotation(ctx context.Context, client runtimeclient.Client, owner runtimeclient.Object, child runtimeclient.Object) error {
	if HasAnnotation(child, OwnedByAnnotationName) {
		klog.V(log.LogLevelDebug).InfoS("owned-by annotation already exists", "annotation", OwnedByAnnotationName, "owner", owner.GetName(), "child", child.GetName())
		return nil
	}

	annotations := child.GetAnnotations()
	if annotations == nil {
		annotations = make(map[string]string)
	}

	gvk := owner.GetObjectKind().GroupVersionKind()
	annotations[OwnedByAnnotationName] = toAnnotation(
		metav1.GroupKind{Group: gvk.Group, Kind: gvk.Kind},
		types.NamespacedName{Namespace: owner.GetNamespace(), Name: owner.GetName()})
	child.SetAnnotations(annotations)

	klog.V(log.LogLevelDebug).InfoS("adding owned-by annotation", "annotation", OwnedByAnnotationName, "owner", owner.GetName(), "child", child.GetName())
	return utils.TryToUpdate(ctx, client, child)
}

func HasAnnotation(obj runtimeclient.Object, annotation string) bool {
	if obj.GetAnnotations() == nil {
		return false
	}

	value, exists := obj.GetAnnotations()[annotation]
	_, _, err := fromAnnotation(value)
	return exists && err == nil
}

func fromAnnotation(annotation string) (metav1.GroupKind, types.NamespacedName, error) {
	parts := strings.Split(annotation, "/")
	if len(parts) != 4 {
		return metav1.GroupKind{}, types.NamespacedName{}, fmt.Errorf("the annotation has wrong format %s", annotation)
	}

	gk := metav1.GroupKind{
		Group: parts[0],
		Kind:  parts[1],
	}

	return gk, types.NamespacedName{
		Namespace: parts[2],
		Name:      parts[3],
	}, nil
}

func toAnnotation(gk metav1.GroupKind, namespacedName types.NamespacedName) string {
	return strings.ToLower(fmt.Sprintf("%s/%s/%s/%s", gk.Group, gk.Kind, namespacedName.Namespace, namespacedName.Name))
}
