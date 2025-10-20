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
func (in *BootstrapTokenReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, reterr error) {
	logger := log.FromContext(ctx)

	token := new(v1alpha1.BootstrapToken)
	if err := in.Get(ctx, req.NamespacedName, token); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	scope, err := common.NewDefaultScope(ctx, in.Client, token)
	if err != nil {
		logger.Error(err, "failed to create scope")
		return ctrl.Result{}, err
	}
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	utils.MarkCondition(token.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(token.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, "")

	// Handle resource deletion via finalizer.
	if result := in.addOrRemoveFinalizer(ctx, token); result != nil {
		return *result, nil
	}

	// Check if the token already exists and return early.
	if token.Status.HasID() {
		utils.MarkCondition(token.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
		utils.MarkCondition(token.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
		return ctrl.Result{}, nil
	}

	project, result, err := common.Project(ctx, in.Client, in.Scheme, token)
	if result != nil || err != nil {
		return common.HandleRequeue(result, err, token.SetCondition)
	}

	// Create the token and generate the secret.
	apiBootstrapToken, err := in.sync(ctx, token, *project)
	if err != nil {
		return common.HandleRequeue(nil, err, token.SetCondition)
	}

	token.Status.ID = &apiBootstrapToken.ID

	utils.MarkCondition(token.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(token.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return token.Spec.Reconciliation.Requeue(), nil
}

func (in *BootstrapTokenReconciler) addOrRemoveFinalizer(ctx context.Context, token *v1alpha1.BootstrapToken) *ctrl.Result {
	// If the object is not being deleted and if it does not have our finalizer, then let's add the finalizer.
	// This is equivalent to registering our finalizer.
	if token.GetDeletionTimestamp().IsZero() && !controllerutil.ContainsFinalizer(token, BootstrapTokenProtectionFinalizerName) {
		controllerutil.AddFinalizer(token, BootstrapTokenProtectionFinalizerName)
	}

	// If the object is not being deleted, do nothing.
	if token.GetDeletionTimestamp().IsZero() {
		return nil
	}

	// If the object is being deleted, but there is no console ID available to delete the resource,
	// remove the finalizer and stop reconciliation.
	if !token.Status.HasID() {
		// stop reconciliation as there is no console ID available to delete the resource
		controllerutil.RemoveFinalizer(token, BootstrapTokenProtectionFinalizerName)
		return &ctrl.Result{}
	}

	// Try to delete the resource.
	if err := in.ConsoleClient.DeleteBootstrapToken(ctx, token.Status.GetID()); err != nil {
		// If it fails to delete the external dependency here, return with an error so that it can be retried.
		utils.MarkCondition(token.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return lo.ToPtr(token.Spec.Reconciliation.Requeue())
	}

	// Stop reconciliation as the item has been deleted.
	controllerutil.RemoveFinalizer(token, BootstrapTokenProtectionFinalizerName)
	return &ctrl.Result{}
}

func (in *BootstrapTokenReconciler) sync(ctx context.Context, token *v1alpha1.BootstrapToken, project v1alpha1.Project) (*consoleapi.BootstrapTokenBase, error) {
	attributes := consoleapi.BootstrapTokenAttributes{ProjectID: lo.FromPtr(project.ConsoleID())}

	if !lo.IsEmpty(token.Spec.User) {
		userID, err := identity.Cache().GetUserID(*token.Spec.User)
		if err != nil {
			return nil, err
		}

		attributes.UserID = lo.ToPtr(userID)
	}

	apiToken, err := in.ConsoleClient.CreateBootstrapToken(ctx, attributes)
	if err != nil {
		return nil, err
	}

	if err = in.createSecret(ctx, token, apiToken.Token); err != nil {
		return nil, err
	}

	return apiToken, nil
}

func (in *BootstrapTokenReconciler) createSecret(ctx context.Context, token *v1alpha1.BootstrapToken, value string) error {
	logger := log.FromContext(ctx)

	secret := &corev1.Secret{
		ObjectMeta: v1.ObjectMeta{
			Name:      token.Spec.TokenSecretRef.Name,
			Namespace: token.Namespace,
		},
		StringData: map[string]string{"token": value},
	}

	if err := in.Create(ctx, secret); err != nil {
		return err
	}

	// This is the best effort action only as we can't do a full reconciling when adding the owner ref fails.
	// Token and secret are already created at this point.
	if err := utils.TryAddOwnerRef(ctx, in.Client, token, secret, in.Scheme); err != nil {
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
