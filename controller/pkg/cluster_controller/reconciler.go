package cluster_controller

import (
	"context"
	"fmt"
	"reflect"
	"time"

	"github.com/pluralsh/console/controller/apis/deployments/v1alpha1"
	consoleclient "github.com/pluralsh/console/controller/pkg/client"
	"github.com/pluralsh/console/controller/pkg/errors"
	"github.com/pluralsh/console/controller/pkg/kubernetes"
	"go.uber.org/zap"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/util/retry"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	ctrlruntimeclient "sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
)

const (
	ClusterFinalizer = "deployments.plural.sh/cluster-protection"
)

// Reconciler reconciles a Cluster object.
type Reconciler struct {
	client.Client
	ConsoleClient consoleclient.ConsoleClient
	Log           *zap.SugaredLogger
	Scheme        *runtime.Scheme
}

// SetupWithManager sets up the controller with the Manager.
func (r *Reconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.Cluster{}).
		Complete(r)
}

func (r *Reconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	cluster := &v1alpha1.Cluster{}
	if err := r.Get(ctx, req.NamespacedName, cluster); err != nil {
		r.Log.Error(err, "unable to fetch cluster")
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	if !cluster.GetDeletionTimestamp().IsZero() {
		return r.delete(ctx, cluster)
	}

	apiCluster, err := r.ConsoleClient.GetCluster(cluster.Status.ID)
	if err != nil && !errors.IsNotFound(err) {
		return ctrl.Result{}, err // TODO: Error handling?
	}

	// TODO: Move?
	var providerId *string
	if cluster.Spec.Cloud != "byok" {
		provider, err := r.getProvider(ctx, cluster)
		if err != nil {
			return ctrl.Result{}, err
		}

		if provider.Status.ID == nil {
			r.Log.Info(fmt.Errorf("provider does not have ID set yet"))
			return ctrl.Result{RequeueAfter: 30 * time.Second}, nil
		}

		providerId = provider.Status.ID
	}

	if apiCluster == nil {
		// TODO: Set owner ref.
		response, err := r.ConsoleClient.CreateCluster(cluster.Attributes(providerId))
		if err != nil {
			return ctrl.Result{}, err
		}
		apiCluster = response
	}
	if err := kubernetes.TryAddFinalizer(ctx, r.Client, cluster, ClusterFinalizer); err != nil {
		return ctrl.Result{}, err
	}

	if err := r.updateStatus(ctx, cluster, func(r *v1alpha1.Cluster) {
		r.Status.ID = &apiCluster.ID
		r.Status.KasURL = apiCluster.KasURL
		r.Status.CurrentVersion = apiCluster.CurrentVersion
		r.Status.PingedAt = apiCluster.PingedAt
	}); err != nil {
		return ctrl.Result{}, err
	}

	return ctrl.Result{RequeueAfter: 30 * time.Second}, nil
}

func (r *Reconciler) delete(ctx context.Context, cluster *v1alpha1.Cluster) (ctrl.Result, error) {
	if controllerutil.ContainsFinalizer(cluster, ClusterFinalizer) {
		r.Log.Info("delete cluster")
		if cluster.Status.ID == nil {
			return ctrl.Result{}, fmt.Errorf("cluster ID can not be nil")
		}

		apiCluster, err := r.ConsoleClient.GetCluster(cluster.Status.ID)
		if err != nil && !errors.IsNotFound(err) {
			return ctrl.Result{}, err
		}

		if apiCluster != nil {
			if _, err := r.ConsoleClient.DeleteCluster(*cluster.Status.ID); err != nil && !errors.IsNotFound(err) {
				return ctrl.Result{}, err
			}
		}

		if err := kubernetes.TryRemoveFinalizer(ctx, r.Client, cluster, ClusterFinalizer); err != nil {
			return ctrl.Result{}, err
		}
	}

	return ctrl.Result{}, nil
}

func (r *Reconciler) updateStatus(ctx context.Context, cluster *v1alpha1.Cluster, patch func(cluster *v1alpha1.Cluster)) error {
	return retry.RetryOnConflict(retry.DefaultRetry, func() error {
		if err := r.Client.Get(ctx, ctrlruntimeclient.ObjectKeyFromObject(cluster), cluster); err != nil {
			return fmt.Errorf("could not fetch current cluster state, got error: %+v", err)
		}

		original := cluster.DeepCopy()

		patch(cluster)

		if reflect.DeepEqual(original.Status, cluster.Status) {
			return nil
		}

		return r.Client.Status().Patch(ctx, cluster, ctrlruntimeclient.MergeFrom(original))
	})
}

func (r *Reconciler) getProvider(ctx context.Context, cluster *v1alpha1.Cluster) (*v1alpha1.Provider, error) {
	if cluster.Spec.ProviderRef == nil {
		return nil, fmt.Errorf("could not get provider, reference is not set")
	}

	provider := &v1alpha1.Provider{}
	err := r.Get(ctx, types.NamespacedName{
		Name:      cluster.Spec.ProviderRef.Name,
		Namespace: cluster.Spec.ProviderRef.Namespace,
	}, provider)
	if err != nil {
		return nil, fmt.Errorf("could not get provider, got error: %+v", err)
	}

	return provider, nil
}
