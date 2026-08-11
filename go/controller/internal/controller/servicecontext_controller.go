package controller

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	console "github.com/pluralsh/console/go/client"
	consoleclient "github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/common"
	"github.com/pluralsh/console/go/controller/internal/utils"
	"github.com/samber/lo"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/predicate"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
)

const (
	ServiceContextProtectionFinalizerName = "projects.deployments.plural.sh/service-context-protection"
)

// ServiceContextReconciler reconciles a ServiceContext object
type ServiceContextReconciler struct {
	client.Client
	Scheme        *runtime.Scheme
	ConsoleClient consoleclient.ConsoleClient
}

//+kubebuilder:rbac:groups=deployments.plural.sh,resources=servicecontexts,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=servicecontexts/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=servicecontexts/finalizers,verbs=update
//+kubebuilder:rbac:groups=core,resources=secrets,verbs=get;list;watch;patch
//+kubebuilder:rbac:groups=core,resources=configmaps,verbs=get;list;watch;patch

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
func (r *ServiceContextReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, reterr error) {
	logger := log.FromContext(ctx)

	serviceContext := new(v1alpha1.ServiceContext)
	if err := r.Get(ctx, req.NamespacedName, serviceContext); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	scope, err := common.NewDefaultScope(ctx, r.Client, serviceContext)
	if err != nil {
		logger.Error(err, "failed to create scope")
		return ctrl.Result{}, err
	}
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	utils.MarkCondition(serviceContext.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	// Handle proper resource deletion via finalizer
	result := r.addOrRemoveFinalizer(serviceContext)
	if result != nil {
		return *result, reterr
	}

	if !r.handleExisting(serviceContext) && !serviceContext.DriftDetect() {
		utils.MarkCondition(serviceContext.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
		utils.MarkReadOnly(serviceContext)
		return serviceContext.Spec.Reconciliation.Requeue(), err
	}
	// Mark resource as managed by this operator.
	utils.MarkCondition(serviceContext.SetCondition, v1alpha1.ReadonlyConditionType, v1.ConditionFalse, v1alpha1.ReadonlyConditionReason, "")

	_, sha, err := serviceContext.Diff(utils.HashObject)
	if err != nil {
		logger.Error(err, "unable to calculate sa SHA")
		utils.MarkCondition(serviceContext.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	project, result, err := common.Project(ctx, r.Client, r.Scheme, serviceContext)
	if result != nil || err != nil {
		return common.HandleRequeue(result, err, serviceContext.SetCondition)
	}

	// Track secret/configmap references for updates
	apiServiceContext, err := r.sync(ctx, serviceContext, project)
	if err != nil {
		logger.Error(err, "unable to create or update sa")
		utils.MarkCondition(serviceContext.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	serviceContext.Status.ID = &apiServiceContext.ID
	serviceContext.Status.SHA = &sha

	utils.MarkCondition(serviceContext.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(serviceContext.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return serviceContext.Spec.Reconciliation.Requeue(), nil
}

func (r *ServiceContextReconciler) sync(ctx context.Context, sc *v1alpha1.ServiceContext, project *v1alpha1.Project) (*console.ServiceContextFragment, error) {
	// Start with existing configuration
	configMap := make(map[string]interface{})
	if len(sc.Spec.Configuration.Raw) > 0 {
		if err := json.Unmarshal(sc.Spec.Configuration.Raw, &configMap); err != nil {
			return nil, fmt.Errorf("failed to parse configuration JSON: %w", err)
		}
	}

	scopedKeys, configMapRefs, err := r.mergeConfigMapRefs(ctx, sc, configMap)
	if err != nil {
		return nil, err
	}
	if err := r.removeStaleConfigMapAnnotations(ctx, sc, configMapRefs); err != nil {
		return nil, err
	}

	// Merge secret data if specified
	if sc.Spec.SecretRef != nil {
		secret := &corev1.Secret{}
		namespace := sc.Spec.SecretRef.Namespace
		if namespace == "" {
			namespace = sc.GetNamespace()
		}

		if err := r.Get(ctx, types.NamespacedName{Name: sc.Spec.SecretRef.Name, Namespace: namespace}, secret); err != nil {
			return nil, fmt.Errorf("failed to get secret %s/%s: %w", namespace, sc.Spec.SecretRef.Name, err)
		}

		if err := utils.AddOwnerRefAnnotation(ctx, r.Client, sc, secret); err != nil {
			return nil, err
		}

		if secret.Data != nil {
			for k, v := range secret.Data {
				if scopedKeys[k] {
					return nil, fmt.Errorf("secret key %q conflicts with ConfigMap scope", k)
				}
				configMap[k] = string(v)
			}
		}
	}

	// Convert merged map back to JSON
	configJSON, err := json.Marshal(configMap)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal configuration JSON: %w", err)
	}

	attributes := console.ServiceContextAttributes{}
	attributes.Configuration = lo.ToPtr(string(configJSON))

	if project != nil {
		attributes.ProjectID = project.Status.ID
	}

	return r.ConsoleClient.SaveServiceContext(sc.ConsoleName(), attributes)
}

func (r *ServiceContextReconciler) mergeConfigMapRefs(ctx context.Context, sc *v1alpha1.ServiceContext, configuration map[string]interface{}) (map[string]bool, map[types.NamespacedName]struct{}, error) {
	if sc.Spec.ConfigMapRef != nil && len(sc.Spec.ConfigMapRefs) > 0 {
		return nil, nil, fmt.Errorf("spec.configMapRef and spec.configMapRefs are mutually exclusive")
	}

	refs := sc.Spec.ConfigMapRefs
	legacyRef := sc.Spec.ConfigMapRef != nil
	if legacyRef {
		refs = []v1alpha1.ConfigMapReference{{
			Name:      sc.Spec.ConfigMapRef.Name,
			Namespace: sc.Spec.ConfigMapRef.Namespace,
		}}
	}

	scopedKeys := make(map[string]bool)
	configMapRefs := make(map[types.NamespacedName]struct{})
	for i, ref := range refs {
		namespace := ref.Namespace
		if legacyRef {
			if namespace == "" {
				namespace = sc.GetNamespace()
			}
		} else {
			var err error
			namespace, err = validateConfigMapReference(ref, i, sc.GetNamespace())
			if err != nil {
				return nil, nil, err
			}
		}

		cm := &corev1.ConfigMap{}
		configMapRef := types.NamespacedName{Name: ref.Name, Namespace: namespace}
		if err := r.Get(ctx, configMapRef, cm); err != nil {
			return nil, nil, fmt.Errorf("failed to get configmap %s/%s: %w", namespace, ref.Name, err)
		}

		if err := utils.AddOwnerRefAnnotation(ctx, r.Client, sc, cm); err != nil {
			return nil, nil, err
		}
		configMapRefs[configMapRef] = struct{}{}

		if ref.Scope != "" {
			if _, exists := configuration[ref.Scope]; exists {
				return nil, nil, fmt.Errorf("configMapRefs[%d].scope %q conflicts with an existing configuration key", i, ref.Scope)
			}

			data := cm.Data
			if data == nil {
				data = map[string]string{}
			}
			configuration[ref.Scope] = data
			scopedKeys[ref.Scope] = true
			continue
		}

		for key, value := range cm.Data {
			if scopedKeys[key] {
				return nil, nil, fmt.Errorf("configMapRefs[%d] key %q conflicts with a ConfigMap scope", i, key)
			}
			configuration[key] = value
		}
	}

	return scopedKeys, configMapRefs, nil
}

func (r *ServiceContextReconciler) removeStaleConfigMapAnnotations(ctx context.Context, sc *v1alpha1.ServiceContext, configMapRefs map[types.NamespacedName]struct{}) error {
	configMaps := &corev1.ConfigMapList{}
	if err := r.List(ctx, configMaps); err != nil {
		return fmt.Errorf("failed to list configmaps while removing stale ServiceContext annotations: %w", err)
	}

	for i := range configMaps.Items {
		configMap := &configMaps.Items[i]
		if _, found := configMapRefs[client.ObjectKeyFromObject(configMap)]; found {
			continue
		}
		if err := utils.RemoveOwnerRefAnnotation(ctx, r.Client, sc, configMap); err != nil {
			return err
		}
	}

	return nil
}

func validateConfigMapReference(ref v1alpha1.ConfigMapReference, index int, defaultNamespace string) (string, error) {
	if strings.TrimSpace(ref.Name) == "" {
		return "", fmt.Errorf("configMapRefs[%d].name must not be empty", index)
	}
	if ref.Name != strings.TrimSpace(ref.Name) {
		return "", fmt.Errorf("configMapRefs[%d].name must not contain leading or trailing whitespace", index)
	}
	if ref.Namespace != "" && strings.TrimSpace(ref.Namespace) == "" {
		return "", fmt.Errorf("configMapRefs[%d].namespace must not be blank", index)
	}
	if ref.Scope != "" && strings.TrimSpace(ref.Scope) == "" {
		return "", fmt.Errorf("configMapRefs[%d].scope must not be blank", index)
	}

	if ref.Namespace == "" {
		return defaultNamespace, nil
	}

	return ref.Namespace, nil
}

func (r *ServiceContextReconciler) handleExisting(sc *v1alpha1.ServiceContext) bool {
	apiServiceContext, _ := r.ConsoleClient.GetServiceContext(sc.ConsoleName())
	if apiServiceContext == nil {
		utils.MarkCondition(sc.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonNotFound, v1alpha1.SynchronizedNotFoundConditionMessage.String())
		utils.MarkCondition(sc.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")
		sc.Status.ID = nil
		return false
	}

	sc.Status.ID = &apiServiceContext.ID

	utils.MarkCondition(sc.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(sc.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")

	return true
}

func (r *ServiceContextReconciler) addOrRemoveFinalizer(serviceContext *v1alpha1.ServiceContext) *ctrl.Result {
	// If object is not being deleted and if it does not have our finalizer,
	// then lets add the finalizer. This is equivalent to registering our finalizer.
	if serviceContext.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(serviceContext, ServiceContextProtectionFinalizerName) {
		controllerutil.AddFinalizer(serviceContext, ServiceContextProtectionFinalizerName)
	}

	// If object is not being deleted, do nothing
	if serviceContext.GetDeletionTimestamp().IsZero() {
		return nil
	}

	// if object is being deleted but there is no console ID available to delete the resource
	// remove the finalizer and stop reconciliation
	if !serviceContext.Status.HasID() {
		// stop reconciliation as there is no console ID available to delete the resource
		controllerutil.RemoveFinalizer(serviceContext, ServiceContextProtectionFinalizerName)
		return &ctrl.Result{}
	}

	_, err := r.ConsoleClient.GetServiceContext(serviceContext.GetName())
	if err != nil {
		if errors.IsNotFound(err) {
			controllerutil.RemoveFinalizer(serviceContext, ServiceContextProtectionFinalizerName)
			return &ctrl.Result{}
		}
		utils.MarkCondition(serviceContext.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return lo.ToPtr(common.Wait())
	}

	if !serviceContext.Status.IsReadonly() && serviceContext.Status.HasID() {
		// try to delete the resource
		if err := r.ConsoleClient.DeleteServiceContext(serviceContext.Status.GetID()); err != nil {
			// If it fails to delete the external dependency here, return with error
			// so that it can be retried.
			utils.MarkCondition(serviceContext.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return lo.ToPtr(common.Wait())
		}
	}

	// stop reconciliation as the item has been deleted
	controllerutil.RemoveFinalizer(serviceContext, ServiceContextProtectionFinalizerName)

	return &ctrl.Result{}
}

// SetupWithManager sets up the controller with the Manager.
func (r *ServiceContextReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		Watches(&corev1.Secret{}, utils.OwnerRefAnnotationEventHandler(r.Client, new(v1alpha1.ServiceContext))).
		Watches(&corev1.ConfigMap{}, utils.OwnerRefAnnotationEventHandler(r.Client, new(v1alpha1.ServiceContext))).
		For(&v1alpha1.ServiceContext{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(r)
}
