package controller

import (
	"context"
	"fmt"

	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/predicate"

	apierrors "k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/cache"
	consoleclient "github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/credentials"
	"github.com/pluralsh/console/go/controller/internal/utils"
)

const (
	ComplianceReportGeneratorFinalizer = "deployments.plural.sh/compliance-report-generator-protection"
)

// ComplianceReportGeneratorReconciler reconciles a ComplianceReportGenerator resource.
type ComplianceReportGeneratorReconciler struct {
	client.Client
	Scheme           *runtime.Scheme
	ConsoleClient    consoleclient.ConsoleClient
	CredentialsCache credentials.NamespaceCredentialsCache
	UserGroupCache   cache.UserGroupCache
}

//+kubebuilder:rbac:groups=deployments.plural.sh,resources=complianceReportGenerators,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=complianceReportGenerators/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=complianceReportGenerators/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.16.3/pkg/reconcile
func (r *ComplianceReportGeneratorReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, reterr error) {
	logger := log.FromContext(ctx)

	complianceReportGenerator := &v1alpha1.ComplianceReportGenerator{}
	if err := r.Get(ctx, req.NamespacedName, complianceReportGenerator); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	utils.MarkCondition(complianceReportGenerator.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	scope, err := NewDefaultScope(ctx, r.Client, complianceReportGenerator)
	if err != nil {
		utils.MarkCondition(complianceReportGenerator.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
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
	credentials.SyncCredentialsInfo(complianceReportGenerator, complianceReportGenerator.SetCondition, nc, err)
	if err != nil {
		logger.Error(err, "failed to use namespace credentials", "namespaceCredentials", nc, "namespacedName", req.NamespacedName)
		utils.MarkCondition(complianceReportGenerator.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, fmt.Sprintf("failed to use %s namespace credentials: %s", nc, err.Error()))
		return ctrl.Result{}, err
	}

	if !complianceReportGenerator.GetDeletionTimestamp().IsZero() {
		return ctrl.Result{}, r.handleDelete(ctx, complianceReportGenerator)
	}

	if err = r.ensure(complianceReportGenerator); err != nil {
		return handleRequeue(nil, err, complianceReportGenerator.SetCondition)
	}

	changed, sha, err := complianceReportGenerator.Diff(utils.HashObject)
	if err != nil {
		logger.Error(err, "unable to calculate compliance report generator SHA")
		utils.MarkCondition(complianceReportGenerator.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if changed {
		apiComplianceReportGenerator, err := r.ConsoleClient.UpsertComplianceReportGenerator(ctx, complianceReportGenerator.Attributes())
		if err != nil {
			logger.Error(err, "unable to create or update compliance report generator")
			utils.MarkCondition(complianceReportGenerator.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}
		if !controllerutil.ContainsFinalizer(complianceReportGenerator, ComplianceReportGeneratorFinalizer) {
			controllerutil.AddFinalizer(complianceReportGenerator, ComplianceReportGeneratorFinalizer)
		}
		complianceReportGenerator.Status.ID = &apiComplianceReportGenerator.ID
		complianceReportGenerator.Status.SHA = &sha
	}
	utils.MarkCondition(complianceReportGenerator.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(complianceReportGenerator.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return ctrl.Result{}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *ComplianceReportGeneratorReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		Watches(&v1alpha1.NamespaceCredentials{}, credentials.OnCredentialsChange(r.Client, new(v1alpha1.ComplianceReportGeneratorList))).
		For(&v1alpha1.ComplianceReportGenerator{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(r)
}

// ensure makes sure that user-friendly input such as userEmail/groupName in
// bindings are transformed into valid IDs on the v1alpha1.Binding object before creation
func (r *ComplianceReportGeneratorReconciler) ensure(server *v1alpha1.ComplianceReportGenerator) error {
	if server.Spec.ReadBindings == nil {
		return nil
	}
	bindings, req, err := ensureBindings(server.Spec.ReadBindings, r.UserGroupCache)
	if err != nil {
		return err
	}
	server.Spec.ReadBindings = bindings

	if req {
		return apierrors.NewNotFound(schema.GroupResource{}, "bindings")
	}

	return nil
}

func (r *ComplianceReportGeneratorReconciler) handleDelete(ctx context.Context, complianceReportGenerator *v1alpha1.ComplianceReportGenerator) error {
	if controllerutil.ContainsFinalizer(complianceReportGenerator, ComplianceReportGeneratorFinalizer) {
		if complianceReportGenerator.Status.GetID() != "" {
			existingComplianceReportGenerator, err := r.ConsoleClient.GetComplianceReportGenerator(ctx, complianceReportGenerator.Status.ID, nil)
			if err != nil && !apierrors.IsNotFound(err) {
				utils.MarkCondition(complianceReportGenerator.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return err
			}
			if existingComplianceReportGenerator != nil {
				if err := r.ConsoleClient.DeleteComplianceReportGenerator(ctx, complianceReportGenerator.Status.GetID()); err != nil {
					utils.MarkCondition(complianceReportGenerator.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
					return err
				}
			}
		}
		controllerutil.RemoveFinalizer(complianceReportGenerator, ComplianceReportGeneratorFinalizer)
	}
	return nil
}
