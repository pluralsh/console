package controller

import (
	"context"
	"fmt"
	"strings"

	"github.com/pluralsh/deployment-operator/api/v1alpha1"
	internalerrors "github.com/pluralsh/deployment-operator/internal/errors"
	"github.com/pluralsh/deployment-operator/internal/helm"
	"github.com/pluralsh/deployment-operator/internal/utils"
	"github.com/pluralsh/deployment-operator/pkg/cache"
	"github.com/pluralsh/deployment-operator/pkg/client"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	clusterv1 "sigs.k8s.io/cluster-api/api/core/v1beta2"
	utilkubeconfig "sigs.k8s.io/cluster-api/util/kubeconfig"
	ctrl "sigs.k8s.io/controller-runtime"
	k8sClient "sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

const PluralCAPIClusterFinalizer = "deployments.plural.sh/plural-capi-cluster-protection"

type PluralCAPIClusterController struct {
	k8sClient.Client
	Scheme     *runtime.Scheme
	ConsoleUrl string

	userGroupCache cache.UserGroupCache
	consoleClient  client.Client
}

func (in *PluralCAPIClusterController) Reconcile(ctx context.Context, req ctrl.Request) (_ reconcile.Result, reterr error) {
	logger := log.FromContext(ctx)

	pluralCapiCluster := &v1alpha1.PluralCAPICluster{}

	if err := in.Get(ctx, req.NamespacedName, pluralCapiCluster); err != nil {
		logger.Info("Unable to fetch PluralCAPICluster")
		return ctrl.Result{}, k8sClient.IgnoreNotFound(err)
	}

	utils.MarkCondition(pluralCapiCluster.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	scope, err := NewDefaultScope(ctx, in.Client, pluralCapiCluster)
	if err != nil {
		logger.Error(err, "failed to create scope")
		utils.MarkCondition(pluralCapiCluster.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return ctrl.Result{}, err
	}

	// Always patch object when exiting this function, so we can persist any object changes.
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	// Handle resource deletion both in Kubernetes cluster and in Console API.
	result, err := in.addOrRemoveFinalizer(ctx, pluralCapiCluster)
	if result != nil {
		return *result, err
	}

	// Synchronize the console token to make sure it is available
	consoleToken, err := pluralCapiCluster.GetConsoleToken(ctx, in.Client)
	if err != nil {
		if errors.IsNotFound(err) {
			utils.MarkCondition(pluralCapiCluster.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, "waiting for console token secret")
			return jitterRequeue(requeueAfter, jitter), nil
		}
		logger.Error(err, "failed to get console token from secret")
		utils.MarkCondition(pluralCapiCluster.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return ctrl.Result{}, err
	}
	consoleToken = strings.TrimSpace(consoleToken)

	changed, sha, err := pluralCapiCluster.Diff(utils.HashObject)
	if err != nil {
		logger.Error(err, "unable to calculate PluralCapiCluster SHA")
		utils.MarkCondition(pluralCapiCluster.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.ErrorConditionReason, err.Error())
		return ctrl.Result{}, err
	}

	if pluralCapiCluster.Status.HasID() && !changed {
		// Cluster already synchronized
		utils.MarkCondition(pluralCapiCluster.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
		return ctrl.Result{}, nil
	}

	// If the CAPI cluster is not ready, requeue
	capiCluster, err := in.getCAPICluster(ctx, pluralCapiCluster.Spec.CapiClusterRef)
	if err != nil {
		if errors.IsNotFound(err) || meta.IsNoMatchError(err) {
			logger.Info("CAPI cluster not found or CRD not installed yet")
			utils.MarkCondition(pluralCapiCluster.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, "waiting for CAPI cluster to be created")
			return jitterRequeue(requeueAfter, jitter), nil
		}

		logger.Error(err, "failed to get CAPI cluster")
		utils.MarkCondition(pluralCapiCluster.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return ctrl.Result{}, err
	}
	if !isCAPIClusterReady(capiCluster) {
		utils.MarkCondition(pluralCapiCluster.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, "waiting for CAPI cluster to be ready")
		return jitterRequeue(requeueAfter, jitter), nil
	}

	if err := in.initConsoleClient(consoleToken); err != nil {
		logger.Error(err, "Unable to initialize console client")
		utils.MarkCondition(pluralCapiCluster.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return ctrl.Result{}, err
	}

	consoleClusterID, deployToken, err := in.syncConsoleCluster(pluralCapiCluster)
	if err != nil {
		logger.Error(err, "failed to sync console cluster")
		utils.MarkCondition(pluralCapiCluster.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		if errors.IsNotFound(err) {
			return jitterRequeue(requeueAfter, jitter), nil
		}
		return ctrl.Result{}, err
	}

	err = in.deployAgent(ctx, pluralCapiCluster, capiCluster, deployToken)
	if err != nil {
		logger.Error(err, "failed to deploy agent")
		return reconcile.Result{}, err
	}

	pluralCapiCluster.Status.SHA = lo.ToPtr(sha)
	pluralCapiCluster.Status.ID = lo.ToPtr(consoleClusterID)
	// Mark synchronized condition as true
	utils.MarkCondition(pluralCapiCluster.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return ctrl.Result{}, nil
}

func (in *PluralCAPIClusterController) deployAgent(ctx context.Context, pluralCapiCluster *v1alpha1.PluralCAPICluster, capiCluster *clusterv1.Cluster, deployToken string) error {
	kubeconfig, err := in.getKubeconfig(ctx, capiCluster)
	if err != nil {
		return err
	}
	url, err := sanitizeURL(in.ConsoleUrl)
	if err != nil {
		return err
	}
	values := map[string]any{
		"secrets": map[string]string{
			"deployToken": deployToken,
		},
		"consoleUrl": fmt.Sprintf("%s/ext/gql", url),
	}

	deployer, err := helm.New(
		helm.WithReleaseName(v1alpha1.AgentDefaultReleaseName),
		helm.WithReleaseNamespace(v1alpha1.AgentDefaultNamespace),
		helm.WithRepository(pluralCapiCluster.Spec.GetAgent().GetRepoUrl()),
		helm.WithChartName(pluralCapiCluster.Spec.GetAgent().GetChartName()),
		helm.WithKubeconfig(string(kubeconfig)),
		helm.WithValues(values),
	)
	if err != nil {
		return err
	}

	return deployer.Upgrade(true)
}

func (in *PluralCAPIClusterController) getKubeconfig(ctx context.Context, cluster *clusterv1.Cluster) ([]byte, error) {
	obj := k8sClient.ObjectKey{
		Namespace: cluster.Namespace,
		Name:      cluster.Name,
	}
	return utilkubeconfig.FromSecret(ctx, in.Client, obj)
}

func (in *PluralCAPIClusterController) initConsoleClient(consoleToken string) error {
	if in.consoleClient == nil {
		url, err := sanitizeURL(in.ConsoleUrl)
		if err != nil {
			return err
		}
		in.consoleClient = client.New(fmt.Sprintf("%s/gql", url), consoleToken)
		in.userGroupCache = cache.NewUserGroupCache(in.consoleClient)
	}
	return nil
}

func (in *PluralCAPIClusterController) syncConsoleCluster(pluralCapiCluster *v1alpha1.PluralCAPICluster) (id, token string, err error) {
	err = in.ensureCluster(pluralCapiCluster)
	if err != nil {
		return
	}
	existingConsoleCluster, err := in.consoleClient.GetClusterByHandle(pluralCapiCluster.ClusterName())
	if err != nil {
		if errors.IsNotFound(err) {
			newConsoleCluster, err := in.consoleClient.CreateCluster(pluralCapiCluster.Attributes())
			if err != nil {
				return "", "", err
			}
			if newConsoleCluster.CreateCluster.DeployToken == nil {
				return "", "", fmt.Errorf("could not fetch deploy token from cluster")
			}
			return newConsoleCluster.CreateCluster.ID, lo.FromPtr(newConsoleCluster.CreateCluster.DeployToken), nil
		}
		return
	}
	id = existingConsoleCluster.ID
	token, err = in.consoleClient.GetDeployToken(&id, nil)
	if err != nil {
		return
	}
	err = in.consoleClient.UpdateCluster(id, pluralCapiCluster.UpdateAttributes())

	return
}

func (in *PluralCAPIClusterController) getCAPICluster(ctx context.Context, ref corev1.ObjectReference) (*clusterv1.Cluster, error) {
	cluster := &clusterv1.Cluster{}
	if err := in.Get(ctx, k8sClient.ObjectKey{Name: ref.Name, Namespace: ref.Namespace}, cluster); err != nil {
		return nil, err
	}
	return cluster, nil
}

func (in *PluralCAPIClusterController) ensureCluster(cluster *v1alpha1.PluralCAPICluster) error {
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
		return errors.NewNotFound(schema.GroupResource{}, "bindings not yet resolved")
	}

	return nil
}

func (in *PluralCAPIClusterController) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		For(&v1alpha1.PluralCAPICluster{}).
		Complete(in)
}

func (in *PluralCAPIClusterController) addOrRemoveFinalizer(ctx context.Context, cluster *v1alpha1.PluralCAPICluster) (*ctrl.Result, error) {
	if cluster.GetDeletionTimestamp().IsZero() {
		if !controllerutil.ContainsFinalizer(cluster, PluralCAPIClusterFinalizer) {
			controllerutil.AddFinalizer(cluster, PluralCAPIClusterFinalizer)
		}
		return nil, nil
	}
	if !cluster.Status.HasID() {
		controllerutil.RemoveFinalizer(cluster, PluralCAPIClusterFinalizer)
		return nil, nil
	}
	if in.consoleClient == nil {
		consoleToken, err := cluster.GetConsoleToken(ctx, in.Client)
		if err != nil {
			return nil, err
		}
		if err := in.initConsoleClient(consoleToken); err != nil {
			return nil, err
		}
	}
	err := in.consoleClient.DetachCluster(cluster.Status.GetID())
	if err != nil && internalerrors.IsNotFound(err) {
		return nil, err
	}

	controllerutil.RemoveFinalizer(cluster, PluralCAPIClusterFinalizer)
	return nil, nil
}

func isCAPIClusterReady(cluster *clusterv1.Cluster) bool {
	// Check if cluster phase is Provisioned
	if cluster.Status.Phase != string(clusterv1.ClusterPhaseProvisioned) {
		return false
	}

	return meta.IsStatusConditionTrue(cluster.Status.Conditions, clusterv1.AvailableCondition)
}
