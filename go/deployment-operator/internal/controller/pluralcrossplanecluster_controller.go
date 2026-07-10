package controller

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/internal/crossplane"
	internalerrors "github.com/pluralsh/console/go/deployment-operator/internal/errors"
	"github.com/pluralsh/console/go/deployment-operator/internal/helm"
	"github.com/pluralsh/console/go/deployment-operator/internal/utils"
	"github.com/pluralsh/console/go/deployment-operator/pkg/cache"
	"github.com/pluralsh/console/go/deployment-operator/pkg/client"
	"github.com/samber/lo"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	ctrl "sigs.k8s.io/controller-runtime"
	k8sClient "sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

const PluralCrossplaneClusterFinalizer = "deployments.plural.sh/plural-crossplane-cluster-protection"

type PluralCrossplaneClusterController struct {
	k8sClient.Client
	Scheme     *runtime.Scheme
	ConsoleUrl string

	userGroupCache cache.UserGroupCache
	consoleClient  client.Client
}

func (in *PluralCrossplaneClusterController) Reconcile(ctx context.Context, req ctrl.Request) (_ reconcile.Result, reterr error) {
	logger := log.FromContext(ctx)

	pluralCrossplaneCluster := &v1alpha1.PluralCrossplaneCluster{}

	if err := in.Get(ctx, req.NamespacedName, pluralCrossplaneCluster); err != nil {
		logger.Info("Unable to fetch PluralCrossplaneCluster")
		return ctrl.Result{}, k8sClient.IgnoreNotFound(err)
	}

	utils.MarkCondition(pluralCrossplaneCluster.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	scope, err := NewDefaultScope(ctx, in.Client, pluralCrossplaneCluster)
	if err != nil {
		logger.Error(err, "failed to create scope")
		utils.MarkCondition(pluralCrossplaneCluster.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return ctrl.Result{}, err
	}

	// Always patch object when exiting this function, so we can persist any object changes.
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	// Handle resource deletion both in Kubernetes cluster and in Console API.
	result, err := in.addOrRemoveFinalizer(ctx, pluralCrossplaneCluster)
	if result != nil {
		return *result, err
	}

	// Synchronize the console token to make sure it is available
	consoleToken, err := pluralCrossplaneCluster.GetConsoleToken(ctx, in.Client)
	if err != nil {
		if apierrors.IsNotFound(err) {
			utils.MarkCondition(pluralCrossplaneCluster.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, "waiting for console token secret")
			return jitterRequeue(requeueAfter, jitter), nil
		}
		logger.Error(err, "failed to get console token from secret")
		utils.MarkCondition(pluralCrossplaneCluster.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return ctrl.Result{}, err
	}
	consoleToken = strings.TrimSpace(consoleToken)

	changed, sha, err := pluralCrossplaneCluster.Diff(utils.HashObject)
	if err != nil {
		logger.Error(err, "unable to calculate PluralCrossplaneCluster SHA")
		utils.MarkCondition(pluralCrossplaneCluster.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.ErrorConditionReason, err.Error())
		return ctrl.Result{}, err
	}

	if pluralCrossplaneCluster.Status.HasID() && !changed {
		// Cluster already synchronized
		utils.MarkCondition(pluralCrossplaneCluster.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
		return ctrl.Result{}, nil
	}

	crossplaneCluster, err := crossplane.GetCluster(ctx, in.Client, pluralCrossplaneCluster.Spec.CrossplaneClusterRef)
	if err != nil {
		if errors.Is(err, crossplane.ErrUnsupportedProvider) {
			logger.Error(err, "unsupported Crossplane cluster provider")
			utils.MarkCondition(pluralCrossplaneCluster.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
			return jitterRequeue(requeueAfter, jitter), nil
		}
		if crossplane.IsClusterNotFound(err) {
			logger.Info("Crossplane managed cluster not found or CRD not installed yet")
			utils.MarkCondition(pluralCrossplaneCluster.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, "waiting for Crossplane cluster to be created")
			return jitterRequeue(requeueAfter, jitter), nil
		}

		logger.Error(err, "failed to get Crossplane managed cluster")
		utils.MarkCondition(pluralCrossplaneCluster.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return ctrl.Result{}, err
	}
	if !crossplane.IsReady(crossplaneCluster) {
		utils.MarkCondition(pluralCrossplaneCluster.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, "waiting for Crossplane cluster to be ready")
		return jitterRequeue(requeueAfter, jitter), nil
	}

	kubeconfig, err := crossplane.GetKubeconfig(ctx, in.Client, crossplaneCluster, connectionSecretNamespace(pluralCrossplaneCluster))
	if err != nil {
		if apierrors.IsNotFound(err) {
			utils.MarkCondition(pluralCrossplaneCluster.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, "waiting for Crossplane connection secret")
			return jitterRequeue(requeueAfter, jitter), nil
		}
		logger.Error(err, "failed to read Crossplane connection secret")
		utils.MarkCondition(pluralCrossplaneCluster.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return ctrl.Result{}, err
	}

	if err := in.initConsoleClient(consoleToken); err != nil {
		logger.Error(err, "Unable to initialize console client")
		utils.MarkCondition(pluralCrossplaneCluster.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return ctrl.Result{}, err
	}

	consoleClusterID, deployToken, err := in.syncConsoleCluster(pluralCrossplaneCluster)
	if err != nil {
		logger.Error(err, "failed to sync console cluster")
		utils.MarkCondition(pluralCrossplaneCluster.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		if apierrors.IsNotFound(err) {
			return jitterRequeue(requeueAfter, jitter), nil
		}
		return ctrl.Result{}, err
	}

	if err = in.deployAgent(pluralCrossplaneCluster, kubeconfig, deployToken); err != nil {
		if !strings.Contains(err.Error(), "another operation (install/upgrade/rollback) is in progress") {
			logger.Error(err, "failed to deploy agent")
			return reconcile.Result{}, err
		}
	}

	pluralCrossplaneCluster.Status.SHA = lo.ToPtr(sha)
	pluralCrossplaneCluster.Status.ID = lo.ToPtr(consoleClusterID)
	utils.MarkCondition(pluralCrossplaneCluster.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return ctrl.Result{}, nil
}

func (in *PluralCrossplaneClusterController) deployAgent(cluster *v1alpha1.PluralCrossplaneCluster, kubeconfig []byte, deployToken string) error {
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
		helm.WithRepository(cluster.Spec.GetAgent().GetRepoUrl()),
		helm.WithChartName(cluster.Spec.GetAgent().GetChartName()),
		helm.WithKubeconfig(string(kubeconfig)),
		helm.WithValues(values),
	)
	if err != nil {
		return err
	}

	return deployer.Upgrade(true)
}

func (in *PluralCrossplaneClusterController) syncConsoleCluster(cluster *v1alpha1.PluralCrossplaneCluster) (id, token string, err error) {
	err = in.ensureCluster(cluster)
	if err != nil {
		return
	}
	existingConsoleCluster, err := in.consoleClient.GetClusterByHandle(cluster.ClusterName())
	if err != nil {
		if apierrors.IsNotFound(err) {
			newConsoleCluster, err := in.consoleClient.CreateCluster(cluster.Attributes())
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
	err = in.consoleClient.UpdateCluster(id, cluster.UpdateAttributes())

	return
}

func (in *PluralCrossplaneClusterController) ensureCluster(cluster *v1alpha1.PluralCrossplaneCluster) error {
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
		return apierrors.NewNotFound(schema.GroupResource{}, "bindings not yet resolved")
	}

	return nil
}

func connectionSecretNamespace(cluster *v1alpha1.PluralCrossplaneCluster) string {
	if ns := cluster.Spec.CrossplaneClusterRef.Namespace; ns != "" {
		return ns
	}

	return cluster.Namespace
}

func (in *PluralCrossplaneClusterController) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		For(&v1alpha1.PluralCrossplaneCluster{}).
		Complete(in)
}

func (in *PluralCrossplaneClusterController) addOrRemoveFinalizer(ctx context.Context, cluster *v1alpha1.PluralCrossplaneCluster) (*ctrl.Result, error) {
	if cluster.GetDeletionTimestamp().IsZero() {
		if !controllerutil.ContainsFinalizer(cluster, PluralCrossplaneClusterFinalizer) {
			controllerutil.AddFinalizer(cluster, PluralCrossplaneClusterFinalizer)
		}
		return nil, nil
	}
	if !cluster.Status.HasID() {
		controllerutil.RemoveFinalizer(cluster, PluralCrossplaneClusterFinalizer)
		return nil, nil
	}
	if in.consoleClient == nil {
		consoleToken, err := cluster.GetConsoleToken(ctx, in.Client)
		if err != nil {
			return nil, err
		}
		consoleToken = strings.TrimSpace(consoleToken)
		if err := in.initConsoleClient(consoleToken); err != nil {
			return nil, err
		}
	}
	err := in.consoleClient.DetachCluster(cluster.Status.GetID())
	if err != nil && !internalerrors.IsNotFound(err) {
		return nil, err
	}

	controllerutil.RemoveFinalizer(cluster, PluralCrossplaneClusterFinalizer)
	return nil, nil
}

func (in *PluralCrossplaneClusterController) initConsoleClient(consoleToken string) error {
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
