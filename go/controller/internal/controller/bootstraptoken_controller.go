package controller

import (
	"context"
	goerrors "errors"
	"fmt"

	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"

	consoleapi "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/cache"
	consoleclient "github.com/pluralsh/console/go/controller/internal/client"
	operrors "github.com/pluralsh/console/go/controller/internal/errors"
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

	ConsoleClient  consoleclient.ConsoleClient
	Scheme         *runtime.Scheme
	UserGroupCache cache.UserGroupCache
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
	logger := log.FromContext(ctx)

	bootstrapToken := new(v1alpha1.BootstrapToken)
	if err := in.Get(ctx, req.NamespacedName, bootstrapToken); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	utils.MarkCondition(bootstrapToken.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(bootstrapToken.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, "")

	scope, err := NewDefaultScope(ctx, in.Client, bootstrapToken)
	if err != nil {
		utils.MarkCondition(bootstrapToken.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Always patch object when exiting this function, so we can persist any object changes.
	defer func() {
		if err := scope.PatchObject(); err != nil && retErr == nil {
			retErr = err
		}
	}()

	// Handle proper resource deletion via finalizer
	result := in.addOrRemoveFinalizer(ctx, bootstrapToken)
	if result != nil {
		return *result, nil
	}

	// Check if token already exists and return early.
	if !lo.IsEmpty(bootstrapToken.ConsoleID()) {
		utils.MarkCondition(bootstrapToken.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
		utils.MarkCondition(bootstrapToken.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
		return ctrl.Result{}, nil
	}

	// Create token and generate secret
	apiBootstrapToken, err := in.ensure(ctx, bootstrapToken)
	if err != nil {
		if goerrors.Is(err, operrors.ErrRetriable) {
			utils.MarkCondition(bootstrapToken.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return requeue, nil
		}

		return ctrl.Result{}, err
	}

	bootstrapToken.Status.ID = &apiBootstrapToken.ID

	utils.MarkCondition(bootstrapToken.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(bootstrapToken.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return ctrl.Result{}, nil
}

func (in *BootstrapTokenReconciler) getProject(ctx context.Context, bootstrapToken *v1alpha1.BootstrapToken) (*v1alpha1.Project, error) {
	logger := log.FromContext(ctx)
	project := &v1alpha1.Project{}
	if err := in.Get(ctx, client.ObjectKey{Name: bootstrapToken.Spec.ProjectRef.Name}, project); err != nil {
		return project, err
	}

	if project.Status.ID == nil {
		logger.Info("Project is not ready")
		return project, apierrors.NewNotFound(schema.GroupResource{Resource: "Project", Group: "deployments.plural.sh"}, bootstrapToken.Spec.ProjectRef.Name)
	}

	if err := controllerutil.SetOwnerReference(project, bootstrapToken, in.Scheme); err != nil {
		return project, fmt.Errorf("could not set bootstrapToken owner reference, got error: %+v", err)
	}

	return project, nil
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
		return &requeue
	}

	// stop reconciliation as the item has been deleted
	controllerutil.RemoveFinalizer(bootstrapToken, BootstrapTokenProtectionFinalizerName)
	return &ctrl.Result{}
}

func (in *BootstrapTokenReconciler) ensure(ctx context.Context, bootstrapToken *v1alpha1.BootstrapToken) (*consoleapi.BootstrapTokenBase, error) {
	attributes := consoleapi.BootstrapTokenAttributes{}

	// Configure optional user binding
	if !lo.IsEmpty(bootstrapToken.Spec.User) {
		userID, err := in.UserGroupCache.GetUserID(*bootstrapToken.Spec.User)
		if errors.IsNotFound(err) {
			return nil, operrors.ErrRetriable
		}

		if err != nil {
			return nil, err
		}

		attributes.UserID = lo.ToPtr(userID)
	}

	// Configure required project binding
	project, err := in.getProject(ctx, bootstrapToken)
	if errors.IsNotFound(err) {
		return nil, operrors.ErrRetriable
	}

	if err != nil {
		return nil, err
	}

	attributes.ProjectID = lo.FromPtr(project.ConsoleID())

	// Create the token
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
		For(&v1alpha1.BootstrapToken{}).
		Complete(in)
}
