package common

import (
	"context"
	"fmt"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	runtimeclient "sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
)

// HandleWorkbenchRef resolves a WorkbenchRef to the parent Workbench ID, waits if the
// workbench is not yet ready, and sets the workbench as the owner of the child object
// so that Kubernetes GC cascades deletion from parent to child.
func HandleWorkbenchRef(ctx context.Context, c runtimeclient.Client, scheme *runtime.Scheme,
	child runtimeclient.Object, ref corev1.ObjectReference, namespace string) (string, *ctrl.Result, error) {
	workbench := &v1alpha1.Workbench{}
	ns := lo.Ternary(ref.Namespace == "", namespace, ref.Namespace)
	if err := c.Get(ctx, runtimeclient.ObjectKey{Name: ref.Name, Namespace: ns}, workbench); err != nil {
		if errors.IsNotFound(err) {
			return "", lo.ToPtr(Wait()), fmt.Errorf("workbench not found: %s", err.Error())
		}
		return "", nil, fmt.Errorf("failed to get workbench: %s", err.Error())
	}

	if !workbench.Status.HasID() {
		return "", lo.ToPtr(Wait()), fmt.Errorf("workbench is not ready")
	}

	if err := controllerutil.SetOwnerReference(workbench, child, scheme); err != nil {
		return "", nil, fmt.Errorf("failed to set owner reference: %w", err)
	}

	return workbench.Status.GetID(), nil, nil
}
