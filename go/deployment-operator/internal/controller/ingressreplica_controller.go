package controller

import (
	"context"

	"github.com/pluralsh/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/deployment-operator/internal/utils"
	"github.com/samber/lo"
	networkv1 "k8s.io/api/networking/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	k8sClient "sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

// IngressReplicaReconciler reconciles a IngressReplica resource.
type IngressReplicaReconciler struct {
	k8sClient.Client
	Scheme *runtime.Scheme
}

// Reconcile IngressReplica ensure that stays in sync with Kubernetes cluster.
func (r *IngressReplicaReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ reconcile.Result, reterr error) {
	logger := log.FromContext(ctx)

	// Read resource from Kubernetes cluster.
	ingressReplica := &v1alpha1.IngressReplica{}
	if err := r.Get(ctx, req.NamespacedName, ingressReplica); err != nil {
		logger.Error(err, "unable to fetch IngressReplica")
		return ctrl.Result{}, k8sClient.IgnoreNotFound(err)
	}

	logger.Info("reconciling IngressReplica", "namespace", ingressReplica.Namespace, "name", ingressReplica.Name)
	utils.MarkCondition(ingressReplica.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	scope, err := NewDefaultScope(ctx, r.Client, ingressReplica)
	if err != nil {
		logger.Error(err, "failed to create scope")
		utils.MarkCondition(ingressReplica.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return ctrl.Result{}, err
	}

	// Always patch object when exiting this function, so we can persist any object changes.
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	if !ingressReplica.DeletionTimestamp.IsZero() {
		return ctrl.Result{}, nil
	}

	oldIngress := &networkv1.Ingress{}
	if err := r.Get(ctx, k8sClient.ObjectKey{Name: ingressReplica.Spec.IngressRef.Name, Namespace: ingressReplica.Spec.IngressRef.Namespace}, oldIngress); err != nil {
		logger.Error(err, "failed to get old Ingress")
		utils.MarkCondition(ingressReplica.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return ctrl.Result{}, err
	}

	sha, err := utils.HashObject(ingressReplica.Spec)
	if err != nil {
		logger.Error(err, "failed to hash IngressReplica.Spec")
		utils.MarkCondition(ingressReplica.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return ctrl.Result{}, err
	}

	newIngress := &networkv1.Ingress{}
	if err := r.Get(ctx, k8sClient.ObjectKey{Name: ingressReplica.Name, Namespace: ingressReplica.Namespace}, newIngress); err != nil {
		if !apierrors.IsNotFound(err) {
			logger.Error(err, "failed to get new Ingress")
			utils.MarkCondition(ingressReplica.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
			return ctrl.Result{}, err
		}

		newIngress = genIngress(ingressReplica, oldIngress)
		if err := r.Create(ctx, newIngress); err != nil {
			logger.Error(err, "failed to create new Ingress")
			utils.MarkCondition(ingressReplica.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
			return ctrl.Result{}, err
		}
		ingressReplica.Status.SHA = &sha
		utils.MarkCondition(ingressReplica.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
		return ctrl.Result{}, nil
	}

	// update a new ingress
	if !ingressReplica.Status.IsSHAEqual(sha) {
		updateIngress(ingressReplica, newIngress, oldIngress)
		if err := r.Update(ctx, newIngress); err != nil {
			logger.Error(err, "failed to update new Ingress")
			utils.MarkCondition(ingressReplica.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
			return ctrl.Result{}, err
		}
	}
	ingressReplica.Status.SHA = &sha
	utils.MarkCondition(ingressReplica.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	return ctrl.Result{}, reterr
}

// SetupWithManager sets up the controller with the Manager.
func (r *IngressReplicaReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.IngressReplica{}).
		Complete(r)
}

func genIngress(ingressReplica *v1alpha1.IngressReplica, oldIngress *networkv1.Ingress) *networkv1.Ingress {
	newIngress := &networkv1.Ingress{
		ObjectMeta: metav1.ObjectMeta{
			Name:      ingressReplica.Name,
			Namespace: ingressReplica.Namespace,
		},
		Spec: networkv1.IngressSpec{
			IngressClassName: oldIngress.Spec.IngressClassName,
			DefaultBackend:   oldIngress.Spec.DefaultBackend,
		},
	}
	updateIngress(ingressReplica, newIngress, oldIngress)
	return newIngress
}

func updateIngress(ingressReplica *v1alpha1.IngressReplica, newIngress *networkv1.Ingress, oldIngress *networkv1.Ingress) {
	if newIngress.Labels == nil {
		newIngress.Labels = map[string]string{}
	}
	if oldIngress.Labels == nil {
		oldIngress.Labels = map[string]string{}
	}
	if ingressReplica.Labels == nil {
		ingressReplica.Labels = map[string]string{}
	}
	// merge from left to right
	newIngress.Labels = lo.Assign(newIngress.Labels, oldIngress.Labels, ingressReplica.Labels)

	if newIngress.Annotations == nil {
		newIngress.Annotations = map[string]string{}
	}
	if oldIngress.Annotations == nil {
		oldIngress.Annotations = map[string]string{}
	}
	if ingressReplica.Annotations == nil {
		ingressReplica.Annotations = map[string]string{}
	}
	// merge from left to right
	newIngress.Annotations = lo.Assign(newIngress.Annotations, oldIngress.Annotations, ingressReplica.Annotations)

	if ingressReplica.Spec.IngressClassName != nil {
		newIngress.Spec.IngressClassName = ingressReplica.Spec.IngressClassName
	}
	if len(ingressReplica.Spec.TLS) > 0 {
		newIngress.Spec.TLS = ingressReplica.Spec.TLS
	}
	for _, rule := range oldIngress.Spec.Rules {
		ir := networkv1.IngressRule{
			Host:             rule.Host,
			IngressRuleValue: rule.IngressRuleValue,
		}
		if newHost, ok := ingressReplica.Spec.HostMappings[rule.Host]; ok {
			ir.Host = newHost
		}

		newIngress.Spec.Rules = append(newIngress.Spec.Rules, ir)
	}
}
