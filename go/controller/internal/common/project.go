package common

import (
	"context"
	"fmt"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	runtimeclient "sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
)

// Project checks resource for a project reference and then fetches the corresponding resource.
// It also sets the owner reference of the project to the provided object.
func Project(ctx context.Context, c runtimeclient.Client, scheme *runtime.Scheme, obj interface{}) (*v1alpha1.Project, *ctrl.Result, error) {
	project := &v1alpha1.Project{}

	unstructuredObj, err := runtime.DefaultUnstructuredConverter.ToUnstructured(obj)
	if err != nil {
		return nil, nil, err
	}

	var objMeta metav1.Object = &unstructured.Unstructured{Object: unstructuredObj}

	projectRefData, found, _ := unstructured.NestedMap(unstructuredObj, "spec", "projectRef")
	if !found {
		return project, nil, nil
	}

	projectRef := &corev1.ObjectReference{}
	if err = runtime.DefaultUnstructuredConverter.FromUnstructured(projectRefData, projectRef); err != nil {
		return nil, nil, err
	}

	if err := c.Get(ctx, runtimeclient.ObjectKey{Name: projectRef.Name}, project); err != nil {
		return nil, nil, err
	}

	if !project.Status.HasID() {
		return nil, lo.ToPtr(Wait()), fmt.Errorf("project is not ready")
	}

	if err := controllerutil.SetOwnerReference(project, objMeta, scheme); err != nil {
		return nil, nil, fmt.Errorf("could not set owner reference: %+v", err)
	}

	return project, nil, nil
}
