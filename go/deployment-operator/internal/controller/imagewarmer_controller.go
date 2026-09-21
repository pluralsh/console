package controller

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/internal/utils"
	"github.com/robfig/cron/v3"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/util/strategicpatch"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
)

const (
	imageWarmerContainerName  = "image-warmer"
	imageWarmerSpecAnnotation = "deployments.plural.sh/image-warmer-spec-sha"
	imageWarmerPollInterval   = 10 * time.Second
	imageWarmerSleepSeconds   = 3600
)

// ImageWarmerReconciler reconciles an ImageWarmer object.
type ImageWarmerReconciler struct {
	client.Client
	Scheme *runtime.Scheme
}

//+kubebuilder:rbac:groups=deployments.plural.sh,resources=imagewarmers,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=imagewarmers/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=imagewarmers/finalizers,verbs=update
//+kubebuilder:rbac:groups=apps,resources=daemonsets,verbs=get;list;watch;create;update;patch;delete

func (r *ImageWarmerReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, retErr error) {
	warmer := &v1alpha1.ImageWarmer{}
	if err := r.Get(ctx, req.NamespacedName, warmer); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	scope, err := NewDefaultScope(ctx, r.Client, warmer)
	if err != nil {
		return ctrl.Result{}, err
	}
	defer func() {
		if err := scope.PatchObject(); err != nil && retErr == nil {
			retErr = err
		}
	}()

	if !warmer.DeletionTimestamp.IsZero() {
		return ctrl.Result{}, nil
	}

	utils.MarkCondition(warmer.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, "")

	schedule, err := cron.ParseStandard(warmer.Spec.Cron)
	if err != nil {
		message := fmt.Sprintf("invalid cron expression: %v", err)
		utils.MarkCondition(warmer.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReasonError, message)
		return ctrl.Result{}, nil
	}

	now := time.Now()

	key := client.ObjectKeyFromObject(warmer)
	daemonSet := &appsv1.DaemonSet{}
	err = r.Get(ctx, key, daemonSet)
	if err == nil {
		expectedSHA, hashErr := utils.HashObject(warmer.Spec)
		if hashErr != nil {
			return ctrl.Result{}, hashErr
		}
		if daemonSet.Annotations[imageWarmerSpecAnnotation] != expectedSHA {
			if err := r.Delete(ctx, daemonSet); err != nil {
				return ctrl.Result{}, fmt.Errorf("failed to replace stale image warmer DaemonSet: %w", err)
			}
			return ctrl.Result{RequeueAfter: imageWarmerPollInterval}, nil
		}

		if daemonSet.Status.ObservedGeneration >= daemonSet.Generation &&
			daemonSet.Status.NumberReady == daemonSet.Status.DesiredNumberScheduled &&
			daemonSet.Status.NumberUnavailable == 0 {
			if err := r.Delete(ctx, daemonSet); err != nil {
				return ctrl.Result{}, fmt.Errorf("failed to remove completed image warmer DaemonSet: %w", err)
			}
			completed := metav1.NewTime(now)
			warmer.Status.LastSuccessfulTime = &completed
			utils.MarkCondition(warmer.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
			return ctrl.Result{RequeueAfter: untilNext(schedule, now)}, nil
		}

		return ctrl.Result{RequeueAfter: imageWarmerPollInterval}, nil
	}
	if !errors.IsNotFound(err) {
		return ctrl.Result{}, fmt.Errorf("failed to get image warmer DaemonSet: %w", err)
	}

	if warmer.Status.LastScheduleTime != nil {
		next := schedule.Next(warmer.Status.LastScheduleTime.Time)
		if next.After(now) {
			utils.MarkCondition(warmer.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
			return ctrl.Result{RequeueAfter: next.Sub(now)}, nil
		}
	}

	daemonSet, err = imageWarmerDaemonSet(warmer)
	if err != nil {
		utils.MarkCondition(warmer.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	if err := controllerutil.SetControllerReference(warmer, daemonSet, r.Scheme); err != nil {
		return ctrl.Result{}, fmt.Errorf("failed to set image warmer DaemonSet owner: %w", err)
	}
	if err := r.Create(ctx, daemonSet); err != nil && !errors.IsAlreadyExists(err) {
		return ctrl.Result{}, fmt.Errorf("failed to create image warmer DaemonSet: %w", err)
	}
	scheduled := metav1.NewTime(now)
	warmer.Status.LastScheduleTime = &scheduled
	return ctrl.Result{RequeueAfter: imageWarmerPollInterval}, nil
}

func (r *ImageWarmerReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.ImageWarmer{}).
		Owns(&appsv1.DaemonSet{}).
		Complete(r)
}

func untilNext(schedule cron.Schedule, now time.Time) time.Duration {
	next := schedule.Next(now)
	if next.Before(now) {
		return 0
	}
	return next.Sub(now)
}

func imageWarmerDaemonSet(warmer *v1alpha1.ImageWarmer) (*appsv1.DaemonSet, error) {
	runAsNonRoot := true
	runAsUser := int64(65532)
	runAsGroup := int64(65532)
	fsGroup := int64(65532)
	automountServiceAccountToken := false
	allowPrivilegeEscalation := false
	readOnlyRootFilesystem := true
	defaultTemplate := corev1.PodTemplateSpec{
		ObjectMeta: metav1.ObjectMeta{
			Labels: map[string]string{v1alpha1.ImageWarmerNameLabel: warmer.Name},
		},
		Spec: corev1.PodSpec{
			RestartPolicy:                corev1.RestartPolicyAlways,
			AutomountServiceAccountToken: &automountServiceAccountToken,
			SecurityContext: &corev1.PodSecurityContext{
				RunAsNonRoot: &runAsNonRoot,
				RunAsUser:    &runAsUser,
				RunAsGroup:   &runAsGroup,
				FSGroup:      &fsGroup,
				SeccompProfile: &corev1.SeccompProfile{
					Type: corev1.SeccompProfileTypeRuntimeDefault,
				},
			},
			Containers: []corev1.Container{{
				Name:            imageWarmerContainerName,
				Image:           warmer.Spec.Image,
				ImagePullPolicy: corev1.PullAlways,
				Command:         []string{"/bin/sh", "-c", fmt.Sprintf("sleep %d", imageWarmerSleepSeconds)},
				SecurityContext: &corev1.SecurityContext{
					AllowPrivilegeEscalation: &allowPrivilegeEscalation,
					ReadOnlyRootFilesystem:   &readOnlyRootFilesystem,
					RunAsNonRoot:             &runAsNonRoot,
					RunAsUser:                &runAsUser,
					RunAsGroup:               &runAsGroup,
					Capabilities: &corev1.Capabilities{
						Drop: []corev1.Capability{"ALL"},
					},
				},
			}},
		},
	}
	applyNodeSelector(&defaultTemplate.Spec, warmer.Spec.Selector)

	template, err := mergePodTemplate(defaultTemplate, warmer.Spec.Template)
	if err != nil {
		return nil, err
	}
	if template.Labels == nil {
		template.Labels = map[string]string{}
	}
	template.Labels[v1alpha1.ImageWarmerNameLabel] = warmer.Name

	sha, err := utils.HashObject(warmer.Spec)
	if err != nil {
		return nil, fmt.Errorf("failed to hash ImageWarmer spec: %w", err)
	}

	return &appsv1.DaemonSet{
		ObjectMeta: metav1.ObjectMeta{
			Name:      warmer.Name,
			Namespace: warmer.Namespace,
			Labels:    map[string]string{v1alpha1.ImageWarmerNameLabel: warmer.Name},
			Annotations: map[string]string{
				imageWarmerSpecAnnotation: sha,
			},
		},
		Spec: appsv1.DaemonSetSpec{
			Selector: &metav1.LabelSelector{
				MatchLabels: map[string]string{v1alpha1.ImageWarmerNameLabel: warmer.Name},
			},
			Template: template,
		},
	}, nil
}

func mergePodTemplate(base corev1.PodTemplateSpec, override *corev1.PodTemplateSpec) (corev1.PodTemplateSpec, error) {
	if override == nil {
		return base, nil
	}
	baseJSON, err := json.Marshal(base)
	if err != nil {
		return corev1.PodTemplateSpec{}, fmt.Errorf("failed to marshal default warmer template: %w", err)
	}
	overrideJSON, err := json.Marshal(override)
	if err != nil {
		return corev1.PodTemplateSpec{}, fmt.Errorf("failed to marshal warmer template override: %w", err)
	}
	mergedJSON, err := strategicpatch.StrategicMergePatch(baseJSON, overrideJSON, corev1.PodTemplateSpec{})
	if err != nil {
		return corev1.PodTemplateSpec{}, fmt.Errorf("failed to merge warmer template: %w", err)
	}
	var merged corev1.PodTemplateSpec
	if err := json.Unmarshal(mergedJSON, &merged); err != nil {
		return corev1.PodTemplateSpec{}, fmt.Errorf("failed to unmarshal warmer template: %w", err)
	}
	return merged, nil
}

func applyNodeSelector(spec *corev1.PodSpec, selector *metav1.LabelSelector) {
	if selector == nil {
		return
	}
	requirements := make([]corev1.NodeSelectorRequirement, 0, len(selector.MatchLabels)+len(selector.MatchExpressions))
	for key, value := range selector.MatchLabels {
		requirements = append(requirements, corev1.NodeSelectorRequirement{
			Key:      key,
			Operator: corev1.NodeSelectorOpIn,
			Values:   []string{value},
		})
	}
	for _, expression := range selector.MatchExpressions {
		requirements = append(requirements, corev1.NodeSelectorRequirement{
			Key:      expression.Key,
			Operator: corev1.NodeSelectorOperator(expression.Operator),
			Values:   expression.Values,
		})
	}
	if len(requirements) == 0 {
		return
	}
	if spec.Affinity == nil {
		spec.Affinity = &corev1.Affinity{}
	}
	spec.Affinity.NodeAffinity = &corev1.NodeAffinity{
		RequiredDuringSchedulingIgnoredDuringExecution: &corev1.NodeSelector{
			NodeSelectorTerms: []corev1.NodeSelectorTerm{{MatchExpressions: requirements}},
		},
	}
}
