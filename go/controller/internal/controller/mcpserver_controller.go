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
	MCPServerFinalizer = "deployments.plural.sh/mcp-server-protection"
)

// MCPServerReconciler reconciles a MCPServer resource.
type MCPServerReconciler struct {
	client.Client
	Scheme           *runtime.Scheme
	ConsoleClient    consoleclient.ConsoleClient
	CredentialsCache credentials.NamespaceCredentialsCache
	UserGroupCache   cache.UserGroupCache
}

//+kubebuilder:rbac:groups=deployments.plural.sh,resources=mcpservers,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=mcpservers/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=mcpservers/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.16.3/pkg/reconcile
func (r *MCPServerReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, reterr error) {
	logger := log.FromContext(ctx)

	mcpServer := &v1alpha1.MCPServer{}
	if err := r.Get(ctx, req.NamespacedName, mcpServer); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	utils.MarkCondition(mcpServer.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	scope, err := NewDefaultScope(ctx, r.Client, mcpServer)
	if err != nil {
		utils.MarkCondition(mcpServer.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
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
	credentials.SyncCredentialsInfo(mcpServer, mcpServer.SetCondition, nc, err)
	if err != nil {
		logger.Error(err, "failed to use namespace credentials", "namespaceCredentials", nc, "namespacedName", req.NamespacedName)
		utils.MarkCondition(mcpServer.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, fmt.Sprintf("failed to use %s namespace credentials: %s", nc, err.Error()))
		return ctrl.Result{}, err
	}

	if !mcpServer.GetDeletionTimestamp().IsZero() {
		return ctrl.Result{}, r.handleDelete(ctx, mcpServer)
	}

	if err = r.ensure(mcpServer); err != nil {
		return handleRequeue(nil, err, mcpServer.SetCondition)
	}

	changed, sha, err := mcpServer.Diff(utils.HashObject)
	if err != nil {
		logger.Error(err, "unable to calculate MCP server SHA")
		utils.MarkCondition(mcpServer.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if changed {
		apiMCPServer, err := r.ConsoleClient.UpsertMCPServer(ctx, mcpServer.Attributes())
		if err != nil {
			logger.Error(err, "unable to create or update MCP server")
			utils.MarkCondition(mcpServer.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return ctrl.Result{}, err
		}
		if !controllerutil.ContainsFinalizer(mcpServer, MCPServerFinalizer) {
			controllerutil.AddFinalizer(mcpServer, MCPServerFinalizer)
		}
		mcpServer.Status.ID = &apiMCPServer.ID
		mcpServer.Status.SHA = &sha
	}
	utils.MarkCondition(mcpServer.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(mcpServer.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")

	return ctrl.Result{}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *MCPServerReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		Watches(&v1alpha1.NamespaceCredentials{}, credentials.OnCredentialsChange(r.Client, new(v1alpha1.MCPServerList))).
		For(&v1alpha1.MCPServer{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(r)
}

// ensure makes sure that user-friendly input such as userEmail/groupName in
// bindings are transformed into valid IDs on the v1alpha1.Binding object before creation
func (r *MCPServerReconciler) ensure(server *v1alpha1.MCPServer) error {
	if server.Spec.Bindings == nil {
		return nil
	}
	bindings, req, err := ensureBindings(server.Spec.Bindings.Read, r.UserGroupCache)
	if err != nil {
		return err
	}
	server.Spec.Bindings.Read = bindings

	bindings, req2, err := ensureBindings(server.Spec.Bindings.Write, r.UserGroupCache)
	if err != nil {
		return err
	}
	server.Spec.Bindings.Write = bindings

	if req || req2 {
		return apierrors.NewNotFound(schema.GroupResource{}, "bindings")
	}

	return nil
}

func (r *MCPServerReconciler) handleDelete(ctx context.Context, mcpServer *v1alpha1.MCPServer) error {
	if controllerutil.ContainsFinalizer(mcpServer, MCPServerFinalizer) {
		if mcpServer.Status.GetID() != "" {
			existingMCPServer, err := r.ConsoleClient.GetMCPServer(ctx, mcpServer.Status.GetID())
			if err != nil && !apierrors.IsNotFound(err) {
				utils.MarkCondition(mcpServer.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return err
			}
			if existingMCPServer != nil {
				if err := r.ConsoleClient.DeleteMCPServer(ctx, mcpServer.Status.GetID()); err != nil {
					utils.MarkCondition(mcpServer.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
					return err
				}
			}
		}
		controllerutil.RemoveFinalizer(mcpServer, MCPServerFinalizer)
	}
	return nil
}
