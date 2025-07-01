package controller

import (
	"context"
	"fmt"
	"regexp"
	"time"

	"github.com/pluralsh/console/go/datastore/internal/utils"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	logf "sigs.k8s.io/controller-runtime/pkg/log"

	v1alpha1 "github.com/pluralsh/console/go/datastore/api/v1alpha1"
)

const (
	tooYoung = 30 * time.Minute
)

// NamespaceManagementReconciler reconciles a NamespaceManagement object
type NamespaceManagementReconciler struct {
	client.Client
	Scheme *runtime.Scheme
}

// +kubebuilder:rbac:groups=dbs.plural.sh,resources=namespacemanagements,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=dbs.plural.sh,resources=namespacemanagements/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=dbs.plural.sh,resources=namespacemanagements/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the NamespaceManagement object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.21.0/pkg/reconcile
func (r *NamespaceManagementReconciler) Reconcile(ctx context.Context, req ctrl.Request) (result ctrl.Result, retErr error) {
	logger := logf.FromContext(ctx)

	namespaceManagement := new(v1alpha1.NamespaceManagement)
	if err := r.Get(ctx, req.NamespacedName, namespaceManagement); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	scope, err := NewDefaultScope(ctx, r.Client, namespaceManagement)
	if err != nil {
		logger.V(5).Info(err.Error())
		utils.MarkCondition(namespaceManagement.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	defer func() {
		if err := scope.PatchObject(); err != nil && retErr == nil {
			retErr = err
		}
	}()

	dur, err := time.ParseDuration(namespaceManagement.Spec.Interval)
	if err != nil {
		utils.MarkCondition(namespaceManagement.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return ctrl.Result{}, err
	}

	result = ctrl.Result{RequeueAfter: dur}

	utils.MarkCondition(namespaceManagement.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	namespaces := &corev1.NamespaceList{}
	if err := r.List(ctx, namespaces); err != nil {
		return result, err
	}

	pattern, err := regexp.Compile(namespaceManagement.Spec.NamespacePattern)
	if err != nil {
		return result, err
	}
	for _, namespace := range namespaces.Items {
		if namespace.DeletionTimestamp != nil {
			logger.V(5).Info("Namespace is being deleted, ignoring for now", "namespace", namespace.Name)
			continue
		}

		createdAt := namespace.CreationTimestamp.Time
		recentlyCreated := time.Now().Add(-tooYoung)
		if createdAt.After(recentlyCreated) {
			logger.V(5).Info("Namespace created too recently, ignoring for now", "namespace", namespace.Name)
			continue
		}

		if pattern.MatchString(namespace.Name) {
			shouldPrune, err := r.checkSentinel(ctx, &namespace, namespaceManagement.Spec.Sentinel)
			if err != nil {
				utils.MarkCondition(namespaceManagement.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
				return result, err
			}
			if shouldPrune {
				if err := r.Delete(ctx, &namespace); err != nil {
					utils.MarkCondition(namespaceManagement.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
					return result, err
				}
				logger.V(5).Info("Namespace pruned", "namespace", namespace.Name)
			} else {
				logger.V(5).Info("Namespace not pruned", "namespace", namespace.Name)
			}
		}
	}
	utils.MarkCondition(namespaceManagement.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	return result, nil
}

func (r *NamespaceManagementReconciler) checkSentinel(ctx context.Context, namespace *corev1.Namespace, sentinel corev1.ObjectReference) (bool, error) {
	if sentinel.Kind == "Deployment" {
		deployment := &appsv1.Deployment{}
		ns := namespace.Name
		if sentinel.Namespace != "" {
			ns = sentinel.Namespace
		}
		err := r.Get(ctx, types.NamespacedName{Namespace: ns, Name: sentinel.Name}, deployment)
		if err == nil {
			return false, nil
		}

		err = client.IgnoreNotFound(err)
		return err == nil, err
	}

	return false, fmt.Errorf("ignoring sentinel of kind %s", sentinel.Kind)
}

// SetupWithManager sets up the controller with the Manager.
func (r *NamespaceManagementReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.NamespaceManagement{}).
		Named("namespacemanagement").
		Complete(r)
}
