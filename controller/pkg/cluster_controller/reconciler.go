package cluster_controller

import (
	"context"
	"fmt"
	"reflect"
	"time"

	"github.com/go-logr/logr"
	console "github.com/pluralsh/console-client-go"
	"github.com/pluralsh/console/controller/apis/deployments/v1alpha1"
	consoleclient "github.com/pluralsh/console/controller/pkg/client"
	"github.com/pluralsh/console/controller/pkg/errors"
	"github.com/pluralsh/console/controller/pkg/kubernetes"
	"github.com/pluralsh/console/controller/pkg/utils"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/util/retry"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	ctrlruntimeclient "sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

const (
	RequeueAfter     = 30 * time.Second
	ClusterFinalizer = "deployments.plural.sh/cluster-protection"
)

// Reconciler reconciles a Cluster object.
type Reconciler struct {
	client.Client
	ConsoleClient consoleclient.ConsoleClient
	Log           logr.Logger
	Scheme        *runtime.Scheme
}

// SetupWithManager sets up the controller with the Manager.
func (r *Reconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.Cluster{}).
		Complete(r)
}

func (r *Reconciler) Reconcile(ctx context.Context, req reconcile.Request) (reconcile.Result, error) {
	cluster := &v1alpha1.Cluster{}
	if err := r.Get(ctx, req.NamespacedName, cluster); err != nil {
		r.Log.Error(err, "unable to fetch cluster")
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	if !cluster.GetDeletionTimestamp().IsZero() {
		return r.delete(ctx, cluster)
	}

	var apiCluster *console.ClusterFragment
	var err error
	if cluster.Status.ID != nil {
		apiCluster, err = r.ConsoleClient.GetCluster(cluster.Status.ID)
		if err != nil && !errors.IsNotFound(err) {
			return ctrl.Result{}, err
		}
	}

	var providerId *string
	if cluster.Spec.Cloud != "byok" {
		provider, err := r.getProvider(ctx, cluster)
		if err != nil {
			return ctrl.Result{}, err
		}

		providerId = provider.Status.ID
		if providerId == nil {
			r.Log.Info("provider does not have ID set yet")
			return ctrl.Result{RequeueAfter: RequeueAfter}, nil
		}

		err = utils.TryAddOwnerRef(ctx, r.Client, provider, cluster, r.Scheme)
		if err != nil {
			return ctrl.Result{}, err
		}
	}

	if apiCluster == nil {
		apiCluster, err = r.ConsoleClient.CreateCluster(cluster.Attributes(providerId))
		if err != nil {
			return ctrl.Result{}, err
		}
	}
	if err := kubernetes.TryAddFinalizer(ctx, r.Client, cluster, ClusterFinalizer); err != nil {
		return ctrl.Result{}, err
	}

	sha, err := utils.HashObject(cluster.UpdateAttributes())
	if err != nil {
		return ctrl.Result{}, err
	}
	if cluster.Status.ID != nil && cluster.Status.SHA != nil && cluster.Status.SHA != &sha {
		apiCluster, err = r.ConsoleClient.UpdateCluster(*cluster.Status.ID, cluster.UpdateAttributes())
		if err != nil {
			return ctrl.Result{}, err
		}
	}

	if err := r.updateStatus(ctx, cluster, func(r *v1alpha1.Cluster) {
		r.Status.ID = &apiCluster.ID
		r.Status.KasURL = apiCluster.KasURL
		r.Status.CurrentVersion = apiCluster.CurrentVersion
		r.Status.PingedAt = apiCluster.PingedAt
		r.Status.SHA = &sha
	}); err != nil {
		return ctrl.Result{}, err
	}

	return ctrl.Result{RequeueAfter: RequeueAfter}, nil
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
