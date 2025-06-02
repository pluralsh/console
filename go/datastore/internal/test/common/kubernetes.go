package common

import (
	"context"
	"fmt"
	"reflect"
	"sort"
	"strings"

	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
)

type Patcher[PatchObject client.Object] func(object PatchObject)

func MaybeCreate[O client.Object](c client.Client, object O, patch Patcher[O]) error {
	ctx := context.Background()
	original := object.DeepCopyObject().(O)

	err := c.Get(ctx, client.ObjectKey{Name: object.GetName(), Namespace: object.GetNamespace()}, object)
	if err != nil && !errors.IsNotFound(err) {
		return err
	}

	err = c.Create(ctx, object)
	if err != nil {
		return err
	}

	if patch == nil {
		return nil
	}

	err = c.Get(ctx, client.ObjectKey{Name: object.GetName(), Namespace: object.GetNamespace()}, object)
	if err != nil {
		return err
	}

	patch(object)

	return c.Status().Patch(ctx, object, client.MergeFrom(original))
}

func MaybePatch[O client.Object](c client.Client, object O, patch Patcher[O]) error {
	ctx := context.Background()
	original := object.DeepCopyObject().(O)

	err := c.Get(ctx, client.ObjectKey{Name: object.GetName(), Namespace: object.GetNamespace()}, object)
	if err != nil {
		return err
	}

	if patch == nil {
		return nil
	}

	patch(object)

	return c.Status().Patch(ctx, object, client.MergeFrom(original))
}

func MaybePatchObject[O client.Object](c client.Client, object O, patch Patcher[O]) error {
	ctx := context.Background()
	original := object.DeepCopyObject().(O)

	err := c.Get(ctx, client.ObjectKey{Name: object.GetName(), Namespace: object.GetNamespace()}, object)
	if err != nil {
		return err
	}

	if patch == nil {
		return nil
	}

	patch(object)

	return c.Patch(ctx, object, client.MergeFrom(original))
}

func SanitizeStatusConditions(status v1alpha1.Status) v1alpha1.Status {
	for i := range status.Conditions {
		status.Conditions[i].LastTransitionTime = metav1.Time{}
		status.Conditions[i].ObservedGeneration = 0
	}

	sort.Slice(status.Conditions, func(i, j int) bool {
		return status.Conditions[i].Type < status.Conditions[j].Type
	})

	return status
}

func AsGroupResource(groupName string, obj runtime.Object) schema.GroupResource {
	t := reflect.TypeOf(obj)
	if t.Kind() != reflect.Pointer {
		panic("All types must be pointers to structs.")
	}
	t = t.Elem()

	return schema.GroupResource{
		Group:    groupName,
		Resource: fmt.Sprintf("%ss", strings.ToLower(t.Name())),
	}
}
