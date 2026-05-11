package controller

import (
	"context"
	"time"

	"github.com/pluralsh/deployment-operator/pkg/client"
	"github.com/pluralsh/deployment-operator/pkg/controller/service"
	velerov1 "github.com/vmware-tanzu/velero/pkg/apis/velero/v1"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	k8sClient "sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"
)

// RestoreReconciler reconciles a Velero Restore custom resource.
type RestoreReconciler struct {
	k8sClient.Client
	Scheme        *runtime.Scheme
	ConsoleClient client.Client
}

const (
	timeoutKey     = "timeout"
	restoreNameKey = "name"
)

// Reconcile Velero Restore custom resources to ensure that Console stays in sync with Kubernetes cluster.
func (r *RestoreReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	logger := log.FromContext(ctx)

	// Read resource from Kubernetes cluster.
	restore := &velerov1.Restore{}
	if err := r.Get(ctx, req.NamespacedName, restore); err != nil {
		logger.Info("Unable to fetch restore")
		return ctrl.Result{}, k8sClient.IgnoreNotFound(err)
	}

	if !restore.DeletionTimestamp.IsZero() {
		return ctrl.Result{}, nil
	}

	if restore.Status.Phase == velerov1.RestorePhaseInProgress {
		configMap := &corev1.ConfigMap{}
		if err := r.Get(ctx, types.NamespacedName{Name: service.RestoreConfigMapName, Namespace: restore.Namespace}, configMap); err != nil {
			if apierrors.IsNotFound(err) {
				if err := CreateConfigMap(ctx, r.Client, restore); err != nil {
					logger.Error(err, "Unable to create config map")
					return ctrl.Result{}, err
				}
				return jitterRequeue(requeueAfter, jitter), nil
			}
			return ctrl.Result{}, err
		}

		now := time.Now()
		timeoutString := configMap.Data[timeoutKey]
		timeout, err := time.Parse(time.RFC3339, timeoutString)
		if err != nil {
			return ctrl.Result{}, err
		}
		if now.After(timeout) {
			if err := r.Delete(ctx, configMap); err != nil {
				logger.Error(err, "Unable to delete config map")
				return ctrl.Result{}, err
			}
		}
		return jitterRequeue(requeueAfter, jitter), nil
	}

	configMap := &corev1.ConfigMap{}
	if err := r.Get(ctx, types.NamespacedName{Name: service.RestoreConfigMapName, Namespace: restore.Namespace}, configMap); err != nil {
		if apierrors.IsNotFound(err) {
			return jitterRequeue(requeueAfter, jitter), nil
		}
		return ctrl.Result{}, err
	}

	if configMap.Data[restoreNameKey] == restore.Name {
		if err := r.Delete(ctx, configMap); err != nil {
			logger.Error(err, "Unable to delete config map")
			return ctrl.Result{}, err
		}
	}

	return jitterRequeue(requeueAfter, jitter), nil
}

func CreateConfigMap(ctx context.Context, client k8sClient.Client, restore *velerov1.Restore) error {
	start := restore.Status.StartTimestamp
	operationTimeout := restore.Spec.ItemOperationTimeout
	timeout := start.Add(operationTimeout.Duration)

	configMap := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:      service.RestoreConfigMapName,
			Namespace: restore.Namespace,
		},
		Data: map[string]string{
			timeoutKey:     timeout.Format(time.RFC3339),
			restoreNameKey: restore.Name,
		},
	}
	if err := client.Create(ctx, configMap); err != nil {
		return err
	}

	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *RestoreReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&velerov1.Restore{}).
		Complete(r)
}
