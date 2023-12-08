package servicecontroller

import (
	"context"
	"reflect"
	"time"

	"github.com/pluralsh/console/controller/apis/deployments/v1alpha1"
	consoleclient "github.com/pluralsh/console/controller/pkg/client"

	"go.uber.org/zap"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/client-go/util/retry"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	ctrlruntimeclient "sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
)

// Reconciler reconciles a Service object
type Reconciler struct {
	client.Client
	ConsoleClient consoleclient.ConsoleClient
	Log           *zap.SugaredLogger
}

func (r *Reconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	service := &v1alpha1.Service{}
	if err := r.Get(ctx, req.NamespacedName, service); err != nil {
		if apierrors.IsNotFound(err) {
			return ctrl.Result{}, nil
		}
		return ctrl.Result{}, err
	}
	if !service.GetDeletionTimestamp().IsZero() {
		return r.handleDelete(ctx, service)
	}

	return ctrl.Result{
		// update status
		RequeueAfter: 30 * time.Second,
	}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *Reconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.Service{}).
		Complete(r)
}

func (r *Reconciler) handleDelete(ctx context.Context, service *v1alpha1.Service) (ctrl.Result, error) {
	if controllerutil.ContainsFinalizer(service, "") {

	}
	return ctrl.Result{}, nil
}

type RepoPatchFunc func(service *v1alpha1.Service)

func UpdateServiceStatus(ctx context.Context, client ctrlruntimeclient.Client, service *v1alpha1.Service, patch RepoPatchFunc) error {
	key := ctrlruntimeclient.ObjectKeyFromObject(service)

	return retry.RetryOnConflict(retry.DefaultRetry, func() error {
		// fetch the current state of the cluster
		if err := client.Get(ctx, key, service); err != nil {
			return err
		}

		// modify it
		original := service.DeepCopy()
		patch(service)

		// save some work
		if reflect.DeepEqual(original.Status, service.Status) {
			return nil
		}

		// update the status
		return client.Status().Patch(ctx, service, ctrlruntimeclient.MergeFrom(original))
	})
}
