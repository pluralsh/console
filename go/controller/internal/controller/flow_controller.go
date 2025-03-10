package controller

import (
	"context"
	"fmt"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"

	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/predicate"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/cache"
	consoleclient "github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/credentials"
	"github.com/pluralsh/console/go/controller/internal/utils"
	"k8s.io/apimachinery/pkg/api/errors"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
)

const (
	FlowFinalizer = "deployments.plural.sh/flow-protection"
)

// FlowReconciler reconciles a Flow object
type FlowReconciler struct {
	client.Client
	Scheme           *runtime.Scheme
	ConsoleClient    consoleclient.ConsoleClient
	CredentialsCache credentials.NamespaceCredentialsCache
	UserGroupCache   cache.UserGroupCache
}

//+kubebuilder:rbac:groups=deployments.plural.sh,resources=flows,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=flows/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=flows/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.16.3/pkg/reconcile
func (r *FlowReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, reterr error) {
	logger := log.FromContext(ctx)

	flow := &v1alpha1.Flow{}
	if err := r.Get(ctx, req.NamespacedName, flow); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	utils.MarkCondition(flow.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	scope, err := NewDefaultScope(ctx, r.Client, flow)
	if err != nil {
		utils.MarkCondition(flow.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
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
	credentials.SyncCredentialsInfo(flow, flow.SetCondition, nc, err)
	if err != nil {
		logger.Error(err, "failed to use namespace credentials", "namespaceCredentials", nc, "namespacedName", req.NamespacedName)
		utils.MarkCondition(flow.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, fmt.Sprintf("failed to use %s namespace credentials: %s", nc, err.Error()))
		return ctrl.Result{}, err
	}

	if !flow.GetDeletionTimestamp().IsZero() {
		return ctrl.Result{}, r.handleDelete(ctx, flow)
	}

	if err = r.ensure(flow); err != nil {
		return handleRequeue(nil, err, flow.SetCondition)
	}
	changed, sha, err := flow.Diff(utils.HashObject)
	if err != nil {
		logger.Error(err, "unable to calculate flow SHA")
		utils.MarkCondition(flow.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if changed {
		projectID, res, err := r.getProjectIdAndSetOwnerRef(ctx, flow)
		if res != nil || err != nil {
			return handleRequeue(res, err, flow.SetCondition)
		}

		apiFlow, err := r.ConsoleClient.UpsertFlow(ctx, flow.Attributes(projectID))
		if err != nil {
			logger.Error(err, "unable to create or update flow")
			utils.MarkCondition(flow.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}
		if !controllerutil.ContainsFinalizer(flow, FlowFinalizer) {
			controllerutil.AddFinalizer(flow, FlowFinalizer)
		}
		flow.Status.ID = &apiFlow.ID
		flow.Status.SHA = &sha
	}
	utils.MarkCondition(flow.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(flow.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return ctrl.Result{}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *FlowReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		Watches(&v1alpha1.NamespaceCredentials{}, credentials.OnCredentialsChange(r.Client, new(v1alpha1.FlowList))).
		For(&v1alpha1.Flow{}, builder.WithPredicates(predicate.ResourceVersionChangedPredicate{})).
		Complete(r)
}

func (r *FlowReconciler) handleDelete(ctx context.Context, flow *v1alpha1.Flow) error {
	if controllerutil.ContainsFinalizer(flow, FlowFinalizer) {
		if flow.Status.GetID() != "" {
			existingFlow, err := r.ConsoleClient.GetFlow(ctx, flow.Status.GetID())
			if err != nil && !errors.IsNotFound(err) {
				utils.MarkCondition(flow.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return err
			}
			if existingFlow != nil {
				if err := r.ConsoleClient.DeleteFlow(ctx, flow.Status.GetID()); err != nil {
					utils.MarkCondition(flow.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
					return err
				}
			}
		}
		controllerutil.RemoveFinalizer(flow, FlowFinalizer)
	}
	return nil
}

// ensure makes sure that user-friendly input such as userEmail/groupName in
// bindings are transformed into valid IDs on the v1alpha1.Binding object before creation
func (r *FlowReconciler) ensure(flow *v1alpha1.Flow) error {
	if flow.Spec.Bindings == nil {
		return nil
	}
	bindings, req, err := ensureBindings(flow.Spec.Bindings.Read, r.UserGroupCache)
	if err != nil {
		return err
	}
	flow.Spec.Bindings.Read = bindings

	bindings, req2, err := ensureBindings(flow.Spec.Bindings.Write, r.UserGroupCache)
	if err != nil {
		return err
	}
	flow.Spec.Bindings.Write = bindings

	if req || req2 {
		return apierrors.NewNotFound(schema.GroupResource{}, "bindings")
	}

	return nil
}

func (r *FlowReconciler) getProjectIdAndSetOwnerRef(ctx context.Context, flow *v1alpha1.Flow) (*string, *ctrl.Result, error) {
	if !flow.Spec.HasProjectRef() {
		return nil, nil, nil
	}

	project := &v1alpha1.Project{}
	if err := r.Get(ctx, types.NamespacedName{Name: flow.Spec.ProjectRef.Name}, project); err != nil {
		return nil, nil, err
	}

	if !project.Status.HasID() {
		return nil, &waitForResources, fmt.Errorf("project is not ready")
	}

	if err := controllerutil.SetOwnerReference(project, flow, r.Scheme); err != nil {
		return nil, nil, fmt.Errorf("could not set owner reference: %+v", err)
	}

	return project.Status.ID, nil, nil
}
