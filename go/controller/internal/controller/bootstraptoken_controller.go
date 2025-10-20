package controller

import (
	"context"

	"github.com/pluralsh/console/go/controller/internal/common"
	"github.com/pluralsh/console/go/controller/internal/identity"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/predicate"

	consoleapi "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	consoleclient "github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/utils"
)

const (
	// BootstrapTokenProtectionFinalizerName defines name for the main finalizer that synchronizes
	// resource deletion from the Console API prior to removing the CRD.
	BootstrapTokenProtectionFinalizerName = "projects.deployments.plural.sh/bootstrap-token-protection"
)

// BootstrapTokenReconciler reconciles a BootstrapToken object
type BootstrapTokenReconciler struct {
	client.Client
	ConsoleClient consoleclient.ConsoleClient
	Scheme        *runtime.Scheme
}

//+kubebuilder:rbac:groups=deployments.plural.sh,resources=bootstraptokens,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=bootstraptokens/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=bootstraptokens/finalizers,verbs=update
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=projects,verbs=get
//+kubebuilder:rbac:groups=core,resources=secrets,verbs=get;create;patch

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.16.3/pkg/reconcile
func (in *BootstrapTokenReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, retErr error) {
	bootstrapToken := new(v1alpha1.BootstrapToken)
	if err := in.Get(ctx, req.NamespacedName, bootstrapToken); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	scope, err := NewDefaultScope(ctx, in.Client, bootstrapToken)
	if err != nil {
		return ctrl.Result{}, err
	}

	// Always patch object when exiting this function, so we can persist any object changes.
	defer func() {
		if err := scope.PatchObject(); err != nil && retErr == nil {
			retErr = err
		}
	}()

	utils.MarkCondition(bootstrapToken.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(bootstrapToken.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, "")

	// Handle proper resource deletion via finalizer
	if result := in.addOrRemoveFinalizer(ctx, bootstrapToken); result != nil {
		return *result, nil
	}

	// Check if token already exists and return early.
	if bootstrapToken.Status.HasID() {
		utils.MarkCondition(bootstrapToken.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
		utils.MarkCondition(bootstrapToken.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
		return ctrl.Result{}, nil
	}

	project, result, err := common.Project(ctx, in.Client, in.Scheme, bootstrapToken)
	if result != nil || err != nil {
		return common.HandleRequeue(result, err, bootstrapToken.SetCondition)
	}

	// Create token and generate secret
	apiBootstrapToken, err := in.sync(ctx, bootstrapToken, *project)
	if err != nil {
		return common.HandleRequeue(nil, err, bootstrapToken.SetCondition)
	}

	bootstrapToken.Status.ID = &apiBootstrapToken.ID

	utils.MarkCondition(bootstrapToken.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(bootstrapToken.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return ctrl.Result{}, nil
}

func (in *BootstrapTokenReconciler) addOrRemoveFinalizer(ctx context.Context, bootstrapToken *v1alpha1.BootstrapToken) *ctrl.Result {
	// If object is not being deleted and if it does not have our finalizer,
	// then lets add the finalizer. This is equivalent to registering our finalizer.
	if bootstrapToken.GetDeletionTimestamp().IsZero() && !controllerutil.ContainsFinalizer(bootstrapToken, BootstrapTokenProtectionFinalizerName) {
		controllerutil.AddFinalizer(bootstrapToken, BootstrapTokenProtectionFinalizerName)
	}

	// If object is not being deleted, do nothing
	if bootstrapToken.GetDeletionTimestamp().IsZero() {
		return nil
	}

	// if object is being deleted but there is no console ID available to delete the resource
	// remove the finalizer and stop reconciliation
	if !bootstrapToken.Status.HasID() {
		// stop reconciliation as there is no console ID available to delete the resource
		controllerutil.RemoveFinalizer(bootstrapToken, BootstrapTokenProtectionFinalizerName)
		return &ctrl.Result{}
	}

	// try to delete the resource
	if err := in.ConsoleClient.DeleteBootstrapToken(ctx, bootstrapToken.Status.GetID()); err != nil {
		// If it fails to delete the external dependency here, return with error
		// so that it can be retried.
		utils.MarkCondition(bootstrapToken.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return lo.ToPtr(bootstrapToken.Spec.Reconciliation.Requeue())
	}

	// stop reconciliation as the item has been deleted
	controllerutil.RemoveFinalizer(bootstrapToken, BootstrapTokenProtectionFinalizerName)
	return &ctrl.Result{}
}

func (in *BootstrapTokenReconciler) sync(ctx context.Context, bootstrapToken *v1alpha1.BootstrapToken, project v1alpha1.Project) (*consoleapi.BootstrapTokenBase, error) {
	attributes := consoleapi.BootstrapTokenAttributes{ProjectID: lo.FromPtr(project.ConsoleID())}

	if !lo.IsEmpty(bootstrapToken.Spec.User) {
		userID, err := identity.Cache().GetUserID(*bootstrapToken.Spec.User)
		if err != nil {
			return nil, err
		}

		attributes.UserID = lo.ToPtr(userID)
	}

	apiBootstrapToken, err := in.ConsoleClient.CreateBootstrapToken(ctx, attributes)
	if err != nil {
		return nil, err
	}

	if err = in.createSecret(ctx, bootstrapToken, apiBootstrapToken.Token); err != nil {
		return nil, err
	}

	return apiBootstrapToken, nil
}

func (in *BootstrapTokenReconciler) createSecret(ctx context.Context, bootstrapToken *v1alpha1.BootstrapToken, token string) error {
	logger := log.FromContext(ctx)
	secret := &corev1.Secret{
		ObjectMeta: v1.ObjectMeta{
			Name:      bootstrapToken.Spec.TokenSecretRef.Name,
			Namespace: bootstrapToken.Namespace,
		},
		StringData: map[string]string{"token": token},
	}

	if err := in.Create(ctx, secret); err != nil {
		return err
	}

	// This is the best effort action only as we can't do a full reconcile when owner ref fails.
	// Token and secret are already created at this point.
	if err := utils.TryAddOwnerRef(ctx, in.Client, bootstrapToken, secret, in.Scheme); err != nil {
		logger.Error(err, "unable to set owner reference on bootstrap token")
	}

	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (in *BootstrapTokenReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		For(&v1alpha1.BootstrapToken{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(in)
}
