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
	// OwnedByAnnotation is an annotation used to mark resources that are owned by our CRDs.
	// It is used instead of the standard owner reference to avoid garbage collection of resources
	// but still be able to reconcile them.
	OwnedByAnnotation = "deployments.plural.sh/owned-by"
)

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

	gvk := owner.GetObjectKind().GroupVersionKind()
	annotations[OwnedByAnnotation] = toOwnedByAnnotation(gvk.Group, gvk.Kind, owner.GetNamespace(), owner.GetName())
	child.SetAnnotations(annotations)

	klog.V(log.LogLevelDebug).InfoS("adding owned-by annotation",
		"annotation", OwnedByAnnotation, "owner", owner.GetName(), "child", child.GetName())
	return utils.TryToUpdate(ctx, client, child)
}

func hasOwnedByAnnotation(obj runtimeclient.Object) bool {
	if obj.GetAnnotations() == nil {
		return false
	}

	value, exists := obj.GetAnnotations()[OwnedByAnnotation]
	_, _, err := fromOwnedByAnnotation(value)
	return exists && err == nil
}

func fromOwnedByAnnotation(annotation string) (metav1.GroupKind, types.NamespacedName, error) {
	parts := strings.Split(annotation, "/")
	if len(parts) != 4 {
		return metav1.GroupKind{}, types.NamespacedName{},
			fmt.Errorf("%s annotation has wrong format %s", OwnedByAnnotation, annotation)
	}

	return metav1.GroupKind{Group: parts[0], Kind: parts[1]},
		types.NamespacedName{Namespace: parts[2], Name: parts[3]}, nil
}

func toOwnedByAnnotation(group, kind, namespace, name string) string {
	return strings.ToLower(fmt.Sprintf("%s/%s/%s/%s", group, kind, namespace, name))
}
