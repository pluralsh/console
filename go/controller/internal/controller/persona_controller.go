package controller

import (
	"context"
	"fmt"

	"github.com/pluralsh/console/go/controller/internal/credentials"
	"sigs.k8s.io/controller-runtime/pkg/controller"

	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	console "github.com/pluralsh/console/go/client"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/cache"
	consoleclient "github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/utils"
)

const (
	// PersonaFinalizer defines the name for the main finalizer that synchronizes
	// resource deletion from the Console API before removing the CRD.
	PersonaFinalizer = "deployments.plural.sh/personas-protection"
)

// PersonaReconciler reconciles a v1alpha1.Persona object.
// Implements reconcile.Reconciler and types.Controller.
type PersonaReconciler struct {
	client.Client
	ConsoleClient    consoleclient.ConsoleClient
	CredentialsCache credentials.NamespaceCredentialsCache
	UserGroupCache   cache.UserGroupCache
	Scheme           *runtime.Scheme
}

// +kubebuilder:rbac:groups=deployments.plural.sh,resources=personas,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=personas/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=deployments.plural.sh,resources=personas/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the v1alpha1.Persona closer to the desired state
// and syncs it with the Console API state.
func (in *PersonaReconciler) Reconcile(ctx context.Context, req reconcile.Request) (_ reconcile.Result, retErr error) {
	logger := log.FromContext(ctx)

	persona := new(v1alpha1.Persona)
	if err := in.Get(ctx, req.NamespacedName, persona); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	scope, err := NewDefaultScope(ctx, in.Client, persona)
	if err != nil {
		utils.MarkCondition(persona.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Always patch object when exiting this function, so we can persist any object changes.
	defer func() {
		if err := scope.PatchObject(); err != nil && retErr == nil {
			retErr = err
		}
	}()

	// Mark resource as not ready. This will be overridden in the end.
	utils.MarkCondition(persona.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	// Switch to namespace credentials if configured. This has to be done before sending any request to the console.
	nc, err := in.ConsoleClient.UseCredentials(req.Namespace, in.CredentialsCache)
	credentials.SyncCredentialsInfo(persona, persona.SetCondition, nc, err)
	if err != nil {
		logger.Error(err, "failed to use namespace credentials", "namespaceCredentials", nc, "namespacedName", req.NamespacedName)
		utils.MarkCondition(persona.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, fmt.Sprintf("failed to use %s namespace credentials: %s", nc, err.Error()))
		return ctrl.Result{}, err
	}

	// Handle proper resource deletion via finalizer
	result := in.addOrRemoveFinalizer(ctx, persona)
	if result != nil {
		return *result, nil
	}

	// Get persona SHA that can be saved back in the status to check for changes
	changed, sha, err := persona.Diff(utils.HashObject)
	if err != nil {
		logger.Error(err, "unable to calculate persona SHA")
		utils.MarkCondition(persona.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Sync persona CRD with the Console API
	apiPersona, err := in.sync(ctx, persona, changed)
	if err != nil {
		return handleRequeue(nil, err, persona.SetCondition)
	}

	persona.Status.ID = &apiPersona.ID
	persona.Status.SHA = &sha

	utils.MarkCondition(persona.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(persona.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return requeue, nil
}

func (in *PersonaReconciler) addOrRemoveFinalizer(ctx context.Context, persona *v1alpha1.Persona) *ctrl.Result {
	if persona.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(persona, PersonaFinalizer) {
		controllerutil.AddFinalizer(persona, PersonaFinalizer)
	}

	// If the persona is being deleted, cleanup and remove the finalizer.
	if !persona.DeletionTimestamp.IsZero() {
		// If the persona does not have an ID, the finalizer can be removed.
		if !persona.Status.HasID() {
			controllerutil.RemoveFinalizer(persona, PersonaFinalizer)
			return &ctrl.Result{}
		}

		exists, err := in.ConsoleClient.IsPersonaExists(ctx, persona.Status.GetID())
		if err != nil {
			return &requeue
		}

		// Remove persona from Console API if it exists.
		if exists {
			if err = in.ConsoleClient.DeletePersona(ctx, persona.Status.GetID()); err != nil {
				// If it fails to delete the external dependency here, return with the error
				// so that it can be retried.
				utils.MarkCondition(persona.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return &requeue
			}
		}

		// If our finalizer is present, remove it.
		controllerutil.RemoveFinalizer(persona, PersonaFinalizer)

		// Stop reconciliation as the item does no longer exist.
		return &ctrl.Result{}
	}

	return nil
}

func (in *PersonaReconciler) sync(ctx context.Context, persona *v1alpha1.Persona, changed bool) (*console.PersonaFragment, error) {
	logger := log.FromContext(ctx)
	exists, err := in.ConsoleClient.IsPersonaExists(ctx, persona.Status.GetID())
	if err != nil {
		return nil, err
	}

	if err := in.ensure(persona); err != nil {
		return nil, err
	}

	// Update only if the persona has changed.
	if changed && exists {
		logger.Info(fmt.Sprintf("updating persona %s", persona.ConsoleName()))
		return in.ConsoleClient.UpdatePersona(ctx, persona.Status.GetID(), persona.Attributes())
	}

	// Read the persona from Console API if it already exists.
	if exists {
		return in.ConsoleClient.GetPersona(ctx, persona.Status.GetID())
	}

	logger.Info(fmt.Sprintf("%s persona does not exist, creating it", persona.ConsoleName()))
	return in.ConsoleClient.CreatePersona(ctx, persona.Attributes())
}

// ensure makes sure that user-friendly input such as userEmail/groupName in
// bindings are transformed into valid IDs on the v1alpha1.Binding object before creation
func (in *PersonaReconciler) ensure(persona *v1alpha1.Persona) error {
	if persona.Spec.Bindings == nil {
		return nil
	}

	bindings, err := ensureBindings(persona.Spec.Bindings, in.UserGroupCache)
	if err != nil {
		return err
	}
	persona.Spec.Bindings = bindings

	return nil
}

// SetupWithManager is responsible for initializing new reconciler within provided ctrl.Manager.
func (in *PersonaReconciler) SetupWithManager(mgr ctrl.Manager) error {
	mgr.GetLogger().Info("Starting reconciler", "reconciler", "persona_reconciler")
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		Watches(&v1alpha1.NamespaceCredentials{}, credentials.OnCredentialsChange(in.Client, new(v1alpha1.FlowList))).
		For(&v1alpha1.Persona{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(in)
}
