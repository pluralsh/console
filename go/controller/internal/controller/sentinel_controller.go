package controller

import (
	"context"
	"encoding/json"
	"fmt"

	console "github.com/pluralsh/console/go/client"
	consoleclient "github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/common"
	"github.com/pluralsh/console/go/controller/internal/credentials"
	"github.com/pluralsh/console/go/controller/internal/utils"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/predicate"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
)

const SentinelFinalizer = "deployments.plural.sh/sentinel-protection"

// SentinelReconciler reconciles a Sentinel object
type SentinelReconciler struct {
	client.Client
	Scheme           *runtime.Scheme
	ConsoleClient    consoleclient.ConsoleClient
	CredentialsCache credentials.NamespaceCredentialsCache
}

//+kubebuilder:rbac:groups=deployments.plural.sh,resources=sentinels,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=sentinels/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=sentinels/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.16.3/pkg/reconcile
func (r *SentinelReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, reterr error) {
	logger := ctrl.LoggerFrom(ctx)

	sentinel := &v1alpha1.Sentinel{}
	if err := r.Get(ctx, req.NamespacedName, sentinel); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	utils.MarkCondition(sentinel.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")
	scope, err := common.NewDefaultScope(ctx, r.Client, sentinel)
	if err != nil {
		utils.MarkCondition(sentinel.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	// Always patch an object when exiting this function, so we can persist any object changes.
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	// Switch to namespace credentials if configured. This has to be done before sending any request to the console.
	nc, err := r.ConsoleClient.UseCredentials(req.Namespace, r.CredentialsCache)
	credentials.SyncCredentialsInfo(sentinel, sentinel.SetCondition, nc, err)
	if err != nil {
		logger.Error(err, "failed to use namespace credentials", "namespaceCredentials", nc, "namespacedName", req.NamespacedName)
		utils.MarkCondition(sentinel.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, fmt.Sprintf("failed to use %s namespace credentials: %s", nc, err.Error()))
		return ctrl.Result{}, err
	}

	if result := r.addOrRemoveFinalizer(ctx, sentinel); result != nil {
		return *result, nil
	}

	repository := &v1alpha1.GitRepository{}
	if sentinel.Spec.RepositoryRef != nil {
		if err := r.Get(ctx, client.ObjectKey{Name: sentinel.Spec.RepositoryRef.Name, Namespace: sentinel.Spec.RepositoryRef.Namespace}, repository); err != nil {
			return common.HandleRequeue(nil, err, sentinel.SetCondition)
		}
		if !repository.Status.HasID() {
			utils.MarkCondition(sentinel.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, "repository is not ready")
			return common.Wait(), nil
		}
		if repository.Status.Health == v1alpha1.GitHealthFailed {
			utils.MarkCondition(sentinel.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, "repository is not healthy")
			return common.Wait(), nil
		}
	}
	project := &v1alpha1.Project{}
	if sentinel.Spec.ProjectRef != nil {
		var res *ctrl.Result
		project, res, err = common.Project(ctx, r.Client, r.Scheme, sentinel)
		if res != nil || err != nil {
			return common.HandleRequeue(res, err, sentinel.SetCondition)
		}
	}

	attr, err := r.attributes(ctx, sentinel, repository, project)
	if err != nil {
		utils.MarkCondition(sentinel.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	sha, err := utils.HashObject(attr)
	if err != nil {
		utils.MarkCondition(sentinel.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	existingSentinel, err := r.sync(ctx, sentinel, attr)
	if err != nil {
		utils.MarkCondition(sentinel.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	if sentinel.Status.HasSHA() && !sentinel.Status.IsSHAEqual(sha) {
		if _, err := r.ConsoleClient.UpdateSentinel(ctx, existingSentinel.ID, attr); err != nil {
			utils.MarkCondition(sentinel.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, err.Error())
			return ctrl.Result{}, err
		}
	}

	sentinel.Status.ID = lo.ToPtr(existingSentinel.ID)
	sentinel.Status.SHA = lo.ToPtr(sha)

	utils.MarkCondition(sentinel.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(sentinel.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return sentinel.Spec.Reconciliation.Requeue(), nil
}

func (r *SentinelReconciler) sync(ctx context.Context, sentinel *v1alpha1.Sentinel, attr *console.SentinelAttributes) (*console.SentinelFragment, error) {
	if sentinel.Status.HasID() {
		return r.ConsoleClient.GetSentinel(ctx, sentinel.Status.GetID())
	}

	return r.ConsoleClient.CreateSentinel(ctx, attr)
}

func (r *SentinelReconciler) attributes(ctx context.Context, sentinel *v1alpha1.Sentinel, repository *v1alpha1.GitRepository, project *v1alpha1.Project) (*console.SentinelAttributes, error) {
	attr := &console.SentinelAttributes{
		Name:        lo.ToPtr(sentinel.ConsoleName()),
		Description: sentinel.Spec.Description,
	}
	if repository.Status.HasID() {
		attr.RepositoryID = lo.ToPtr(repository.Status.GetID())
	}
	if project.Status.HasID() {
		attr.ProjectID = lo.ToPtr(project.Status.GetID())
	}

	checkAttr, err := r.getSentinelCheckAttributes(ctx, sentinel)
	if err != nil {
		return nil, err
	}
	attr.Checks = checkAttr

	attr.Git = r.getGitAttributes(sentinel)

	return attr, nil
}

func (r *SentinelReconciler) getSentinelCheckAttributes(ctx context.Context, sentinel *v1alpha1.Sentinel) ([]*console.SentinelCheckAttributes, error) {
	if len(sentinel.Spec.Checks) == 0 {
		return nil, nil
	}
	checks := make([]*console.SentinelCheckAttributes, len(sentinel.Spec.Checks))
	for i, check := range sentinel.Spec.Checks {
		checks[i] = &console.SentinelCheckAttributes{
			Type:     check.Type,
			Name:     check.Name,
			RuleFile: check.RuleFile,
		}
		if check.Configuration != nil {
			configuration := &console.SentinelCheckConfigurationAttributes{}
			if check.Configuration.Log != nil {
				configuration.Log = &console.SentinelCheckLogConfigurationAttributes{
					Namespaces: check.Configuration.Log.Namespaces,
					Query:      check.Configuration.Log.Query,
					Duration:   check.Configuration.Log.Duration,
				}
				if len(check.Configuration.Log.Facets) > 0 {
					configuration.Log.Facets = make([]*console.LogFacetInput, 0, len(check.Configuration.Log.Facets))
					for k, v := range check.Configuration.Log.Facets {
						configuration.Log.Facets = append(configuration.Log.Facets, &console.LogFacetInput{
							Key:   k,
							Value: v,
						})
					}
				}
				if check.Configuration.Log.ClusterRef != nil {
					helper := utils.NewConsoleHelper(ctx, r.Client)
					clusterID, err := helper.IDFromRef(check.Configuration.Log.ClusterRef, &v1alpha1.Cluster{})
					if err != nil {
						return nil, err
					}
					configuration.Log.ClusterID = clusterID
				}
			}
			if check.Configuration.Kubernetes != nil {
				configuration.Kubernetes = &console.SentinelCheckKubernetesConfigurationAttributes{
					Group:     check.Configuration.Kubernetes.Group,
					Version:   check.Configuration.Kubernetes.Version,
					Kind:      check.Configuration.Kubernetes.Kind,
					Name:      check.Configuration.Kubernetes.Name,
					Namespace: check.Configuration.Kubernetes.Namespace,
				}
				helper := utils.NewConsoleHelper(ctx, r.Client)
				clusterID, err := helper.IDFromRef(&check.Configuration.Kubernetes.ClusterRef, &v1alpha1.Cluster{})
				if err != nil {
					return nil, err
				}
				configuration.Kubernetes.ClusterID = lo.FromPtr(clusterID)
			}
			if check.Configuration.IntegrationTest != nil {
				configuration.IntegrationTest = &console.SentinelCheckIntegrationTestConfigurationAttributes{
					Distro: check.Configuration.IntegrationTest.Distro,
				}
				if check.Configuration.IntegrationTest.Job != nil {
					jobSpec, err := common.GateJobAttributes(check.Configuration.IntegrationTest.Job)
					if err != nil {
						return nil, err
					}
					configuration.IntegrationTest.Job = jobSpec
				}
				if len(check.Configuration.IntegrationTest.Tags) > 0 {
					jsonTags, err := json.Marshal(check.Configuration.IntegrationTest.Tags)
					if err != nil {
						return nil, err
					}
					configuration.IntegrationTest.Tags = lo.ToPtr(string(jsonTags))
				}
			}
			checks[i].Configuration = configuration
		}
	}

	return checks, nil
}

func (r *SentinelReconciler) getGitAttributes(sentinel *v1alpha1.Sentinel) *console.GitRefAttributes {
	if sentinel.Spec.Git == nil {
		return nil
	}

	git := &console.GitRefAttributes{
		Ref:    sentinel.Spec.Git.Ref,
		Folder: sentinel.Spec.Git.Folder,
	}

	return git
}

func (r *SentinelReconciler) addOrRemoveFinalizer(ctx context.Context, sentinel *v1alpha1.Sentinel) *ctrl.Result {
	// If the service is not being deleted and if it does not have the finalizer, then let's add it.
	if sentinel.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(sentinel, SentinelFinalizer) {
		controllerutil.AddFinalizer(sentinel, SentinelFinalizer)
	}

	// If the service is being deleted, cleanup and remove the finalizer.
	if !sentinel.DeletionTimestamp.IsZero() {
		// If the service does not have an ID, the finalizer can be removed.
		if !sentinel.Status.HasID() {
			controllerutil.RemoveFinalizer(sentinel, SentinelFinalizer)
			return &ctrl.Result{}
		}

		exists, err := r.ConsoleClient.IsSentinelExists(ctx, sentinel.Status.GetID())
		if err != nil {
			return lo.ToPtr(sentinel.Spec.Reconciliation.Requeue())
		}
		if exists {
			if err := r.ConsoleClient.DeleteSentinel(ctx, sentinel.Status.GetID()); err != nil {
				utils.MarkCondition(sentinel.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return &ctrl.Result{}
			}
			// If the deletion process started requeue so that we can make sure the service
			// has been deleted from Console API before removing the finalizer.
			return lo.ToPtr(common.Wait())
		}
		// If our finalizer is present, remove it.
		controllerutil.RemoveFinalizer(sentinel, SentinelFinalizer)

		// Stop reconciliation as the item does no longer exist.
		return &ctrl.Result{}
	}

	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *SentinelReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		Watches(&v1alpha1.NamespaceCredentials{}, credentials.OnCredentialsChange(r.Client, new(v1alpha1.ServiceDeploymentList))). // Reconcile objects on credentials change.
		For(&v1alpha1.Sentinel{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Owns(&corev1.Secret{}, builder.WithPredicates(predicate.ResourceVersionChangedPredicate{})).
		Complete(r)
}
