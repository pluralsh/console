package controller

import (
	"context"
	"fmt"
	"time"

	console "github.com/pluralsh/console/go/client"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	k8sClient "sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	"github.com/pluralsh/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/deployment-operator/internal/errors"
	"github.com/pluralsh/deployment-operator/internal/utils"
	"github.com/pluralsh/deployment-operator/pkg/cache"
	"github.com/pluralsh/deployment-operator/pkg/client"
)

const (
	VirtualClusterFinalizer  = "deployments.plural.sh/virtualcluster-protection"
	defaultWipeCacheInterval = time.Minute * 30
)

// VirtualClusterController reconciler a v1alpha1.VirtualCluster resource.
// Implements [reconcile.Reconciler] interface.
type VirtualClusterController struct {
	k8sClient.Client

	Scheme           *runtime.Scheme
	ExtConsoleClient client.Client
	ConsoleUrl       string

	userGroupCache cache.UserGroupCache
	consoleClient  client.Client
	myCluster      *console.MyCluster_MyCluster_
}

func (in *VirtualClusterController) Reconcile(ctx context.Context, req reconcile.Request) (_ reconcile.Result, reterr error) {
	logger := log.FromContext(ctx)

	// Read resource from Kubernetes cluster.
	vCluster := &v1alpha1.VirtualCluster{}
	if err := in.Get(ctx, req.NamespacedName, vCluster); err != nil {
		logger.Error(err, "unable to fetch virtual cluster")
		return ctrl.Result{}, k8sClient.IgnoreNotFound(err)
	}

	if err := in.initConsoleClient(ctx, vCluster); err != nil {
		return ctrl.Result{}, err
	}

	if err := in.initCluster(); err != nil {
		return ctrl.Result{}, err
	}

	logger.Info("reconciling VirtualCluster", "namespace", vCluster.Namespace, "name", vCluster.Name)
	utils.MarkCondition(vCluster.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	scope, err := NewDefaultScope(ctx, in.Client, vCluster)
	if err != nil {
		logger.Error(err, "failed to create scope")
		utils.MarkCondition(vCluster.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.ErrorConditionReason, err.Error())
		return ctrl.Result{}, err
	}

	// Always patch object when exiting this function, so we can persist any object changes.
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	// Handle resource deletion both in Kubernetes cluster and in Console API.
	result, err := in.addOrRemoveFinalizer(ctx, vCluster)
	if result != nil {
		return *result, err
	}

	// Get VirtualCluster SHA that can be saved back in the status to check for changes
	changed, sha, err := vCluster.Diff(utils.HashObject)
	if err != nil {
		logger.Error(err, "unable to calculate virtual cluster SHA")
		utils.MarkCondition(vCluster.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.ErrorConditionReason, err.Error())
		return ctrl.Result{}, err
	}

	// Sync VirtualCluster CRD with the Console API
	apiVCluster, err := in.sync(ctx, vCluster, changed)
	if err != nil {
		logger.Error(err, "unable to create or update virtual cluster")
		utils.MarkCondition(vCluster.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.ErrorConditionReason, err.Error())
		return ctrl.Result{}, err
	}

	vCluster.Status.ID = &apiVCluster.ID
	vCluster.Status.SHA = &sha

	utils.MarkCondition(vCluster.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(vCluster.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return ctrl.Result{}, reterr
}

func (in *VirtualClusterController) addOrRemoveFinalizer(ctx context.Context, vCluster *v1alpha1.VirtualCluster) (*ctrl.Result, error) {
	// If object is not being deleted
	if vCluster.GetDeletionTimestamp().IsZero() {
		// and does not contain finalizer
		if !controllerutil.ContainsFinalizer(vCluster, VirtualClusterFinalizer) {
			// add the finalizer
			controllerutil.AddFinalizer(vCluster, VirtualClusterFinalizer)
		}

		// do nothing
		return nil, nil
	}

	// If object is being deleted
	result, err := in.delete(ctx, vCluster)
	return &result, err
}

func (in *VirtualClusterController) delete(ctx context.Context, vCluster *v1alpha1.VirtualCluster) (reconcile.Result, error) {
	logger := log.FromContext(ctx)
	logger.Info("trying to delete VirtualCluster", "namespace", vCluster.Namespace, "name", vCluster.Name)

	// if virtual cluster is ready, delete
	if vCluster.Status.IsVClusterReady() && !vCluster.Spec.IsExternal() {
		if err := in.deleteVCluster(vCluster); err != nil {
			return ctrl.Result{}, err
		}

		utils.MarkCondition(vCluster.SetCondition, v1alpha1.VirtualClusterConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, "")
	}

	// if cluster ID has not been synced proceed with deletion
	if !vCluster.Status.HasID() {
		controllerutil.RemoveFinalizer(vCluster, VirtualClusterFinalizer)
		return ctrl.Result{}, nil
	}

	exists, err := in.consoleClient.IsClusterExists(vCluster.Status.GetID())
	if err != nil {
		return ctrl.Result{}, err
	}

	// if cluster exists in the API, detach
	if exists {
		if err = in.consoleClient.DetachCluster(vCluster.Status.GetID()); err != nil {
			return ctrl.Result{}, err
		}
	}

	// stop reconciliation as the cluster has been detached and cleaned up
	controllerutil.RemoveFinalizer(vCluster, VirtualClusterFinalizer)
	return ctrl.Result{}, nil
}

func (in *VirtualClusterController) sync(ctx context.Context, vCluster *v1alpha1.VirtualCluster, changed bool) (*console.TinyClusterFragment, error) {
	logger := log.FromContext(ctx)
	exists, err := in.consoleClient.IsClusterExists(vCluster.Status.GetID())
	if err != nil {
		return nil, err
	}

	if err := in.ensureCluster(vCluster); err != nil {
		return nil, err
	}

	if exists && !changed {
		return in.consoleClient.GetCluster(vCluster.Status.GetID())
	}

	logger.Info("upsert cluster", "name", vCluster.Name)
	createdVCluster, err := in.consoleClient.UpsertVirtualCluster(in.myCluster.ID, vCluster.Attributes())
	if err != nil {
		return nil, err
	}

	if in.shouldDeployVCluster(vCluster, changed) {
		err = in.deployVCluster(ctx, vCluster)
		if err != nil {
			utils.MarkCondition(vCluster.SetCondition, v1alpha1.VirtualClusterConditionType, metav1.ConditionFalse, v1alpha1.ErrorConditionReason, err.Error())
			return nil, err
		}

		utils.MarkCondition(vCluster.SetCondition, v1alpha1.VirtualClusterConditionType, metav1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	}

	if in.shouldDeployAgent(vCluster, changed) {
		err = in.deployAgent(ctx, vCluster, *createdVCluster.DeployToken)
		if err != nil {
			utils.MarkCondition(vCluster.SetCondition, v1alpha1.AgentConditionType, metav1.ConditionFalse, v1alpha1.ErrorConditionReason, err.Error())
			return nil, err
		}

		utils.MarkCondition(vCluster.SetCondition, v1alpha1.AgentConditionType, metav1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	}

	return &console.TinyClusterFragment{
		ID:      createdVCluster.ID,
		Name:    createdVCluster.Name,
		Handle:  createdVCluster.Handle,
		Self:    createdVCluster.Self,
		Project: createdVCluster.Project,
	}, nil
}

func (in *VirtualClusterController) shouldDeployVCluster(vCluster *v1alpha1.VirtualCluster, changed bool) bool {
	return !vCluster.Spec.IsExternal() && (!vCluster.Status.IsVClusterReady() || (vCluster.Status.HasID() && changed))
}

func (in *VirtualClusterController) shouldDeployAgent(vCluster *v1alpha1.VirtualCluster, changed bool) bool {
	return !vCluster.Status.IsAgentReady() || (vCluster.Status.HasID() && changed)
}

func (in *VirtualClusterController) handleCredentialsRef(ctx context.Context, vCluster *v1alpha1.VirtualCluster) (string, error) {
	secret := &corev1.Secret{}

	if err := in.Get(
		ctx,
		k8sClient.ObjectKey{Name: vCluster.Spec.CredentialsRef.Name, Namespace: vCluster.Namespace},
		secret,
	); err != nil {
		return "", err
	}

	token, exists := secret.Data[vCluster.Spec.CredentialsRef.Key]
	if !exists {
		return "", fmt.Errorf("secret %s/%s does not contain console token", vCluster.Namespace, vCluster.Spec.CredentialsRef.Name)
	}

	return string(token), nil
}

// ensureCluster makes sure that user-friendly input such as userEmail/groupName in
// bindings are transformed into valid IDs on the v1alpha1.Binding object before creation
func (in *VirtualClusterController) ensureCluster(cluster *v1alpha1.VirtualCluster) error {
	if cluster.Spec.Cluster == nil || cluster.Spec.Cluster.Bindings == nil {
		return nil
	}

	bindings, req, err := ensureBindings(cluster.Spec.Cluster.Bindings.Read, in.userGroupCache)
	if err != nil {
		return err
	}

	cluster.Spec.Cluster.Bindings.Read = bindings

	bindings, req2, err := ensureBindings(cluster.Spec.Cluster.Bindings.Write, in.userGroupCache)
	if err != nil {
		return err
	}

	cluster.Spec.Cluster.Bindings.Write = bindings

	if req || req2 {
		return errors.ErrRetriable
	}

	return nil
}

func (in *VirtualClusterController) initConsoleClient(ctx context.Context, vCluster *v1alpha1.VirtualCluster) error {
	if in.consoleClient != nil {
		return nil
	}

	token, err := in.handleCredentialsRef(ctx, vCluster)
	if err != nil {
		return err
	}

	in.consoleClient = client.New(fmt.Sprintf("%s/gql", in.ConsoleUrl), token)
	in.userGroupCache = cache.NewUserGroupCache(in.consoleClient)

	return nil
}

func (in *VirtualClusterController) initCluster() error {
	if in.myCluster != nil {
		return nil
	}

	myCluster, err := in.ExtConsoleClient.MyCluster()
	if err != nil {
		return err
	}

	in.myCluster = myCluster.MyCluster
	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (in *VirtualClusterController) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.VirtualCluster{}).
		Complete(in)
}
