package controller

import (
	"context"
	"fmt"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/internal/common"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/predicate"

	apierrors "k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
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
}

//+kubebuilder:rbac:groups=deployments.plural.sh,resources=mcpservers,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=mcpservers/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=mcpservers/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
func (r *MCPServerReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, reterr error) {
	logger := log.FromContext(ctx)

	mcpServer := &v1alpha1.MCPServer{}
	if err := r.Get(ctx, req.NamespacedName, mcpServer); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	scope, err := common.NewDefaultScope(ctx, r.Client, mcpServer)
	if err != nil {
		logger.Error(err, "failed to create scope")
		return ctrl.Result{}, err
	}
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	utils.MarkCondition(mcpServer.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

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

	changed, sha, err := mcpServer.Diff(utils.HashObject)
	if err != nil {
		logger.Error(err, "unable to calculate MCP server SHA")
		utils.MarkCondition(mcpServer.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if changed {
		attrs, err := r.Attributes(mcpServer)
		if err != nil {
			return common.HandleRequeue(nil, err, mcpServer.SetCondition)
		}

		apiMCPServer, err := r.ConsoleClient.UpsertMCPServer(ctx, *attrs)
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

	return mcpServer.Spec.Reconciliation.Requeue(), nil
}

func (r *MCPServerReconciler) Attributes(mcp *v1alpha1.MCPServer) (*console.McpServerAttributes, error) {
	attrs := console.McpServerAttributes{
		Name:    mcp.GetServerName(),
		URL:     mcp.Spec.URL,
		Confirm: mcp.Spec.Confirm,
	}

	if mcp.Spec.Bindings != nil {
		var err error

		attrs.ReadBindings, err = common.BindingsAttributes(mcp.Spec.Bindings.Read)
		if err != nil {
			return nil, err
		}

		attrs.WriteBindings, err = common.BindingsAttributes(mcp.Spec.Bindings.Write)
		if err != nil {
			return nil, err
		}
	}

	if mcp.Spec.Authentication != nil {
		attrs.Authentication = &console.McpServerAuthenticationAttributes{
			Plural: mcp.Spec.Authentication.Plural,
		}

		if len(mcp.Spec.Authentication.Headers) > 0 {
			attrs.Authentication.Headers = make([]*console.McpHeaderAttributes, 0)
			for k, v := range mcp.Spec.Authentication.Headers {
				attrs.Authentication.Headers = append(attrs.Authentication.Headers, &console.McpHeaderAttributes{
					Name: k, Value: v,
				})
			}
		}
	}

	return &attrs, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *MCPServerReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		Watches(&v1alpha1.NamespaceCredentials{}, credentials.OnCredentialsChange(r.Client, new(v1alpha1.MCPServerList))).
		For(&v1alpha1.MCPServer{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(r)
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
