package controller

import (
	"context"
	"fmt"

	"k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/internal/credentials"
	"github.com/pluralsh/console/go/controller/internal/utils"
	"github.com/samber/lo"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	consoleclient "github.com/pluralsh/console/go/controller/internal/client"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

const ObserverFinalizer = "deployments.plural.sh/observer-protection"

// ObserverReconciler reconciles a Observer object
type ObserverReconciler struct {
	client.Client
	Scheme             *runtime.Scheme
	ConsoleClient      consoleclient.ConsoleClient
	CredentialsCache   credentials.NamespaceCredentialsCache
	HelmRepositoryAuth *HelmRepositoryAuth
}

//+kubebuilder:rbac:groups=deployments.plural.sh,resources=observers,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=observers/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=observers/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.16.3/pkg/reconcile
func (r *ObserverReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, reterr error) {
	logger := log.FromContext(ctx)
	observer := &v1alpha1.Observer{}
	if err := r.Get(ctx, req.NamespacedName, observer); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	utils.MarkCondition(observer.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, "")
	scope, err := NewDefaultScope(ctx, r.Client, observer)
	if err != nil {
		logger.Error(err, "failed to create observer scope")
		utils.MarkCondition(observer.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	// Always patch object when exiting this function, so we can persist any object changes.
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	// Switch to namespace credentials if configured. This has to be done before sending any request to the console.
	nc, err := r.ConsoleClient.UseCredentials(req.Namespace, r.CredentialsCache)
	credentials.SyncCredentialsInfo(observer, observer.SetCondition, nc, err)
	if err != nil {
		logger.Error(err, "failed to use namespace credentials", "namespaceCredentials", nc, "namespacedName", req.NamespacedName)
		utils.MarkCondition(observer.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, fmt.Sprintf("failed to use %s namespace credentials: %s", nc, err.Error()))
		return ctrl.Result{}, err
	}

	// Mark resource as not ready. This will be overridden in the end.
	utils.MarkCondition(observer.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	// Handle proper resource deletion via finalizer
	result, err := r.addOrRemoveFinalizer(ctx, observer)
	if result != nil {
		return *result, err
	}
	// Check if resource already exists in the API and only sync the ID
	exists, err := r.isAlreadyExists(ctx, observer)
	if err != nil {
		utils.MarkCondition(observer.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if exists {
		utils.MarkCondition(observer.SetCondition, v1alpha1.ReadonlyConditionType, metav1.ConditionTrue, v1alpha1.ReadonlyConditionReason, v1alpha1.ReadonlyTrueConditionMessage.String())
		return r.handleExisting(ctx, observer)
	}

	// Get ObservabilityProvider SHA that can be saved back in the status to check for changes
	changed, sha, err := observer.Diff(utils.HashObject)
	if err != nil {
		logger.Error(err, "unable to calculate observer SHA")
		utils.MarkCondition(observer.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Sync ObservabilityProvider CRD with the Console API
	apiProvider, err := r.sync(ctx, observer, changed)
	if err != nil {
		logger.Error(err, "unable to create or update observer")
		if errors.IsNotFound(err) {
			utils.MarkCondition(observer.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, notFoundOrReadyError)
			return RequeueAfter(requeueWaitForResources), nil
		}
		utils.MarkCondition(observer.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	observer.Status.ID = &apiProvider.ID
	observer.Status.SHA = &sha

	utils.MarkCondition(observer.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(observer.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return ctrl.Result{}, reterr
}

func (r *ObserverReconciler) sync(
	ctx context.Context,
	observer *v1alpha1.Observer,
	changed bool,
) (*console.ObserverFragment, error) {
	logger := log.FromContext(ctx)

	exists, err := r.ConsoleClient.IsObserverExists(ctx, observer.ObserverName())
	if err != nil {
		return nil, err
	}

	// Read the Observer from Console API if it already exists and has not changed
	if exists && !changed {
		return r.ConsoleClient.GetObserver(ctx, nil, lo.ToPtr(observer.ObserverName()))
	}

	target, actions, projectID, err := r.getAttributes(ctx, observer)
	if err != nil {
		return nil, err
	}

	logger.Info("upsert Observer")
	return r.ConsoleClient.UpsertObserver(ctx, observer.Attributes(target, actions, projectID))
}

func (r *ObserverReconciler) getAttributes(ctx context.Context, observer *v1alpha1.Observer) (target console.ObserverTargetAttributes, actions []*console.ObserverActionAttributes, projectID *string, err error) {
	if observer.Spec.ProjectRef != nil {
		project := &v1alpha1.Project{}
		if err = r.Get(ctx, client.ObjectKey{Name: observer.Spec.ProjectRef.Name, Namespace: observer.Spec.ProjectRef.Namespace}, project); err != nil {
			return target, actions, projectID, err
		}
		if !project.Status.HasID() {
			err = fmt.Errorf("project ID is nil")
			return target, actions, projectID, err
		}
		projectID = project.Status.ID
	}
	target = console.ObserverTargetAttributes{
		Type:   lo.ToPtr(observer.Spec.Target.Type),
		Format: observer.Spec.Target.Format,
		Order:  observer.Spec.Target.Order,
	}
	if helm := observer.Spec.Target.Helm; helm != nil {
		var helmAuthAttr *console.HelmAuthAttributes
		helmAuthAttr, err = r.HelmRepositoryAuth.HelmAuthAttributes(ctx, helm.Provider, helm.Auth)
		if err != nil {
			return target, actions, projectID, err
		}
		target.Helm = &console.ObserverHelmAttributes{
			URL:      helm.URL,
			Chart:    helm.Chart,
			Provider: helm.Provider,
			Auth:     helmAuthAttr,
		}
	}
	if git := observer.Spec.Target.Git; git != nil {
		gitRepo := &v1alpha1.GitRepository{}
		if err = r.Get(ctx, client.ObjectKey{Name: git.GitRepositoryRef.Name, Namespace: git.GitRepositoryRef.Namespace}, gitRepo); err != nil {
			return target, actions, projectID, err
		}
		if !gitRepo.Status.HasID() {
			err = errors.NewNotFound(schema.GroupResource{}, gitRepo.Name)
			return target, actions, projectID, err
		}
		target.Git = &console.ObserverGitAttributes{
			RepositoryID: gitRepo.Status.GetID(),
			Type:         git.Type,
		}
	}

	if oci := observer.Spec.Target.OCI; oci != nil {
		var helmAuthAttr *console.HelmAuthAttributes
		helmAuthAttr, err = r.HelmRepositoryAuth.HelmAuthAttributes(ctx, oci.Provider, oci.Auth)
		if err != nil {
			return target, actions, projectID, err
		}
		target.Oci = &console.ObserverOciAttributes{
			URL:      oci.URL,
			Provider: oci.Provider,
			Auth:     helmAuthAttr,
		}
	}

	if len(observer.Spec.Actions) > 0 {
		actions = make([]*console.ObserverActionAttributes, len(observer.Spec.Actions))
		for i, action := range observer.Spec.Actions {
			a := &console.ObserverActionAttributes{
				Type:          action.Type,
				Configuration: console.ObserverActionConfigurationAttributes{},
			}
			if pr := action.Configuration.Pr; pr != nil {
				prAutomation := &v1alpha1.PrAutomation{}
				if err = r.Get(ctx, client.ObjectKey{Name: pr.PrAutomationRef.Name, Namespace: pr.PrAutomationRef.Namespace}, prAutomation); err != nil {
					return target, actions, projectID, err
				}
				if !prAutomation.Status.HasID() {
					err = errors.NewNotFound(schema.GroupResource{}, prAutomation.Name)
					return target, actions, projectID, err
				}

				a.Configuration.Pr = &console.ObserverPrActionAttributes{
					AutomationID:   prAutomation.Status.GetID(),
					Repository:     pr.Repository,
					BranchTemplate: pr.BranchTemplate,
				}
				a.Configuration.Pr.Context = "{}"
				if pr.Context.Raw != nil {
					a.Configuration.Pr.Context = string(pr.Context.Raw)
				}
			}
			if p := action.Configuration.Pipeline; p != nil {
				pipeline := &v1alpha1.Pipeline{}
				if err = r.Get(ctx, client.ObjectKey{Name: p.PipelineRef.Name, Namespace: p.PipelineRef.Namespace}, pipeline); err != nil {
					return target, actions, projectID, err
				}
				if !pipeline.Status.HasID() {
					err = errors.NewNotFound(schema.GroupResource{}, pipeline.Name)
					return target, actions, projectID, err
				}
				a.Configuration.Pipeline = &console.ObserverPipelineActionAttributes{
					PipelineID: pipeline.Status.GetID(),
				}
				a.Configuration.Pipeline.Context = "{}"
				if p.Context.Raw != nil {
					a.Configuration.Pipeline.Context = string(p.Context.Raw)
				}
			}
			actions[i] = a
		}

	}
	return target, actions, projectID, err
}

func (r *ObserverReconciler) handleExisting(ctx context.Context, observer *v1alpha1.Observer) (ctrl.Result, error) {
	exists, err := r.ConsoleClient.IsObserverExists(ctx, observer.ObserverName())
	if err != nil {
		return ctrl.Result{}, err
	}

	if !exists {
		observer.Status.ID = nil
		utils.MarkCondition(observer.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonNotFound, v1alpha1.SynchronizedNotFoundConditionMessage.String())
		return ctrl.Result{}, nil
	}

	apiProvider, err := r.ConsoleClient.GetObserver(ctx, nil, lo.ToPtr(observer.ObserverName()))
	if err != nil {
		utils.MarkCondition(observer.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	observer.Status.ID = &apiProvider.ID

	utils.MarkCondition(observer.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(observer.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return requeue, nil
}

func (r *ObserverReconciler) addOrRemoveFinalizer(ctx context.Context, observer *v1alpha1.Observer) (*ctrl.Result, error) {
	logger := log.FromContext(ctx)

	// If object is not being deleted and if it does not have our finalizer,
	// then lets add the finalizer. This is equivalent to registering our finalizer.
	if observer.ObjectMeta.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(observer, ObserverFinalizer) {
		controllerutil.AddFinalizer(observer, ObserverFinalizer)
		return nil, nil
	}

	// If object is being deleted cleanup and remove the finalizer.
	if !observer.ObjectMeta.DeletionTimestamp.IsZero() {
		// Remove from Console API if it exists
		exists, err := r.ConsoleClient.IsObserverExists(ctx, observer.ObserverName())
		if err != nil {
			return &ctrl.Result{}, err
		}

		if exists && !observer.Status.IsReadonly() {
			logger.Info("deleting Observer")
			if err := r.ConsoleClient.DeleteObserver(ctx, observer.Status.GetID()); err != nil {
				// if it fails to delete the external dependency here, return with error
				// so that it can be retried.
				utils.MarkCondition(observer.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return &ctrl.Result{}, err
			}

			// If deletion process started requeue so that we can make sure observability observer
			// has been deleted from Console API before removing the finalizer.
			return &requeue, nil
		}

		// Stop reconciliation as the item is being deleted
		controllerutil.RemoveFinalizer(observer, ObserverFinalizer)
		return &ctrl.Result{}, nil
	}

	return nil, nil
}

func (r *ObserverReconciler) isAlreadyExists(ctx context.Context, observer *v1alpha1.Observer) (bool, error) {
	if observer.Status.HasReadonlyCondition() {
		return observer.Status.IsReadonly(), nil
	}

	exists, err := r.ConsoleClient.IsObserverExists(ctx, observer.ObserverName())
	if err != nil {
		return false, err
	}

	if !exists {
		return false, nil
	}

	return !observer.Status.HasID(), nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *ObserverReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.Observer{}).
		Complete(r)
}