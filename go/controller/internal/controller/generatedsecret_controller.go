package controller

import (
	"context"
	"fmt"
	"reflect"
	"strings"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/utils"
	"github.com/pluralsh/polly/template"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/handler"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

const (
	generatedSecretAnnotationName = "deployments.plural.sh/generated-secret"
	GeneratedSecretFinalizer      = "deployments.plural.sh/generated-secret-protection"
)

// GeneratedSecretReconciler reconciles a GeneratedSecret object
type GeneratedSecretReconciler struct {
	client.Client
	Scheme *runtime.Scheme
}

//+kubebuilder:rbac:groups=deployments.plural.sh,resources=generatedsecrets,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=generatedsecrets/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=generatedsecrets/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.16.3/pkg/reconcile
func (r *GeneratedSecretReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, reterr error) {
	logger := log.FromContext(ctx)
	generatedSecret := &v1alpha1.GeneratedSecret{}

	if err := r.Get(ctx, req.NamespacedName, generatedSecret); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	if !generatedSecret.GetDeletionTimestamp().IsZero() {
		return r.handleDelete(ctx, generatedSecret)
	}
	utils.MarkCondition(generatedSecret.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")
	scope, err := NewDefaultScope(ctx, r.Client, generatedSecret)
	if err != nil {
		logger.Error(err, "failed to create scope")
		utils.MarkCondition(generatedSecret.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	// Always patch object when exiting this function, so we can persist any object changes.
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	bindings, err := r.prepareBindings(ctx, generatedSecret)
	if err != nil {
		utils.MarkCondition(generatedSecret.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	if generatedSecret.Spec.Template == nil {
		generatedSecret.Spec.Template = make(map[string]string)
	}

	data, err := r.persistData(ctx, generatedSecret, generatedSecret.Spec.Template, bindings)
	if err != nil {
		utils.MarkCondition(generatedSecret.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	for _, destination := range generatedSecret.Spec.Destinations {
		destSecretRef := &corev1.SecretReference{Name: destination.Name, Namespace: destination.Namespace}
		destSecret, err := utils.GetSecret(ctx, r.Client, destSecretRef)
		// create if it doesn't exist
		if err != nil {
			if !errors.IsNotFound(err) {
				utils.MarkCondition(generatedSecret.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return ctrl.Result{}, err
			}
			if err := r.ensureNamespace(ctx, destination.Namespace); err != nil {
				utils.MarkCondition(generatedSecret.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return ctrl.Result{}, err
			}
			if err := r.createSecret(ctx, destination.Namespace, destination.Name, generatedSecret.Namespace, generatedSecret.Name, data); err != nil {
				utils.MarkCondition(generatedSecret.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return ctrl.Result{}, err
			}

			continue
		}
		// update destination secret if it's different then persisted data
		if !reflect.DeepEqual(data, destSecret.Data) {
			destSecret.Data = data
			if err := r.Update(ctx, destSecret); err != nil {
				utils.MarkCondition(generatedSecret.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return ctrl.Result{}, err
			}
		}
	}

	generatedSecret.Status.RenderedTemplateSecretRef = &corev1.LocalObjectReference{Name: generatedSecret.GetSecretName()}
	utils.MarkCondition(generatedSecret.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	controllerutil.AddFinalizer(generatedSecret, GeneratedSecretFinalizer)

	return ctrl.Result{}, nil
}

func (r *GeneratedSecretReconciler) prepareBindings(ctx context.Context, generatedSecret *v1alpha1.GeneratedSecret) (map[string]interface{}, error) {
	bindings := map[string]interface{}{}

	if generatedSecret.Spec.ConfigurationRef != nil {
		data := make(map[string]string)
		secretRef := &corev1.SecretReference{Name: generatedSecret.Spec.ConfigurationRef.Name, Namespace: generatedSecret.Spec.ConfigurationRef.Namespace}
		secret, err := utils.GetSecret(ctx, r.Client, secretRef)
		if err != nil {
			return nil, err
		}
		for k, v := range secret.Data {
			value := string(v)
			data[k] = value
		}
		bindings["configuration"] = data
	}
	return bindings, nil
}

func (r *GeneratedSecretReconciler) persistData(ctx context.Context, gs *v1alpha1.GeneratedSecret, tmp map[string]string, bindings map[string]interface{}) (map[string][]byte, error) {
	data, err := templateData(tmp, bindings)
	if err != nil {
		return nil, err
	}
	secretRef := &corev1.SecretReference{Name: gs.GetSecretName(), Namespace: gs.Namespace}
	templatedSecret, err := utils.GetSecret(ctx, r.Client, secretRef)
	if err != nil {
		if !errors.IsNotFound(err) {
			utils.MarkCondition(gs.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return nil, err
		}
		if err := r.createSecret(ctx, gs.Namespace, gs.GetSecretName(), gs.Namespace, gs.GetSecretName(), data); err != nil {
			return nil, err
		}

		return data, r.tryAddSecretControllerRef(ctx, gs, secretRef)
	}
	persistedData := templatedSecret.Data
	// merges maps from left to right.
	data = lo.Assign(data, persistedData)
	if !reflect.DeepEqual(persistedData, data) {
		templatedSecret.Data = data
		if err := r.Update(ctx, templatedSecret); err != nil {
			return nil, err
		}
	}

	return data, nil
}

func (r *GeneratedSecretReconciler) ensureNamespace(ctx context.Context, namespace string) error {
	if namespace == "" {
		return nil
	}
	if err := r.Get(ctx, client.ObjectKey{Name: namespace}, &corev1.Namespace{}); err != nil {
		if !errors.IsNotFound(err) {
			return err
		}
		return r.Create(ctx, &corev1.Namespace{
			ObjectMeta: v1.ObjectMeta{
				Name: namespace,
			},
		})
	}
	return nil
}

func (r *GeneratedSecretReconciler) createSecret(ctx context.Context, namespace, name, generatedSecretNamespace, generatedSecretName string, data map[string][]byte) error {
	if generatedSecretNamespace == "" {
		generatedSecretNamespace = "default"
	}
	secret := &corev1.Secret{
		ObjectMeta: v1.ObjectMeta{
			Name:      name,
			Namespace: namespace,
			Annotations: map[string]string{
				generatedSecretAnnotationName: generatedSecretNamespace + "/" + generatedSecretName,
			},
		},
		Data: data,
	}

	if err := r.Create(ctx, secret); err != nil {
		return err
	}
	return nil
}

func (r *GeneratedSecretReconciler) tryAddSecretControllerRef(ctx context.Context, gs *v1alpha1.GeneratedSecret, secretRef *corev1.SecretReference) error {
	secret, err := utils.GetSecret(ctx, r.Client, secretRef)
	if err != nil {
		return err
	}
	return utils.TryAddControllerRef(ctx, r.Client, gs, secret, r.Scheme)
}

func templateData(tmp map[string]string, bindings map[string]interface{}) (map[string][]byte, error) {
	data := make(map[string][]byte)
	for k, v := range tmp {
		out, err := template.RenderLiquid([]byte(v), bindings)
		if err != nil {
			return nil, err
		}
		data[k] = out
	}
	return data, nil
}

func (r *GeneratedSecretReconciler) handleDelete(ctx context.Context, generatedSecret *v1alpha1.GeneratedSecret) (ctrl.Result, error) {
	logger := log.FromContext(ctx)
	if !controllerutil.ContainsFinalizer(generatedSecret, GeneratedSecretFinalizer) {
		return ctrl.Result{}, nil
	}
	for _, destination := range generatedSecret.Spec.Destinations {
		destSecretRef := &corev1.SecretReference{Name: destination.Name, Namespace: destination.Namespace}
		destSecret, err := utils.GetSecret(ctx, r.Client, destSecretRef)
		if err != nil {
			if !errors.IsNotFound(err) {
				return ctrl.Result{}, err
			}
			logger.Info("Secret already deleted", "namespace", destination.Namespace, "name", destination.Name)
			continue
		}
		if err := r.Delete(ctx, destSecret); err != nil {
			return ctrl.Result{}, err
		}
		logger.Info("Secret deleted successfully", "namespace", destination.Namespace, "name", destination.Name)
	}

	return ctrl.Result{}, utils.TryRemoveFinalizer(ctx, r.Client, generatedSecret, GeneratedSecretFinalizer)
}

// requestFromSecret returns a reconcile.Request for the generated secret if changed secret has specific annotation.
func requestFromSecret() handler.EventHandler {
	return handler.EnqueueRequestsFromMapFunc(func(ctx context.Context, obj client.Object) []reconcile.Request {
		if obj.GetAnnotations() != nil && obj.GetAnnotations()[generatedSecretAnnotationName] != "" {
			generatedSecret := obj.GetAnnotations()[generatedSecretAnnotationName]
			namespaceName := strings.Split(generatedSecret, "/")
			if len(namespaceName) != 2 {
				err := fmt.Errorf("the annotation has wrong format %s", generatedSecret)
				utilruntime.HandleError(err)
				return nil
			}
			return []reconcile.Request{
				{
					NamespacedName: types.NamespacedName{Namespace: namespaceName[0], Name: namespaceName[1]},
				},
			}
		}
		return nil
	})
}

// SetupWithManager sets up the controller with the Manager.
func (r *GeneratedSecretReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.GeneratedSecret{}).
		Owns(&corev1.Secret{}, builder.WithPredicates(predicate.ResourceVersionChangedPredicate{})).
		Watches(&corev1.Secret{}, requestFromSecret()).
		Complete(r)
}
