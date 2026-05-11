package common

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/argoproj/argo-rollouts/pkg/apis/rollouts"
	rolloutv1alpha1 "github.com/argoproj/argo-rollouts/pkg/apis/rollouts/v1alpha1"
	flaggerv1beta1 "github.com/fluxcd/flagger/pkg/apis/flagger/v1beta1"
	appsv1 "k8s.io/api/apps/v1"
	autoscalingv1 "k8s.io/api/autoscaling/v1"
	autoscalingv2 "k8s.io/api/autoscaling/v2"
	autoscalingv2beta1 "k8s.io/api/autoscaling/v2beta1"
	autoscalingv2beta2 "k8s.io/api/autoscaling/v2beta2"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/kubectl/pkg/util/podutils"

	"github.com/pluralsh/deployment-operator/internal/utils"
)

const (
	// Indicates that health assessment failed and actual health status is unknown
	HealthStatusUnknown HealthStatusCode = "Unknown"
	// Progressing health status means that resource is not healthy but still have a chance to reach healthy state
	HealthStatusProgressing HealthStatusCode = "Progressing"
	// Resource is 100% healthy
	HealthStatusHealthy HealthStatusCode = "Healthy"
	// Assigned to resources that are suspended or paused. The typical example is a
	// [suspended](https://kubernetes.io/docs/tasks/job/automated-tasks-with-cron-jobs/#suspend) CronJob.
	HealthStatusSuspended HealthStatusCode = "Suspended"
	HealthStatusPaused    HealthStatusCode = "Paused"
	// Degrade status is used if resource status indicates failure or resource could not reach healthy state
	// within some timeout.
	HealthStatusDegraded HealthStatusCode = "Degraded"
	// Indicates that resource is missing in the cluster.
	HealthStatusMissing HealthStatusCode = "Missing"
)

// Represents resource health status
type HealthStatusCode string

type HealthStatus struct {
	Status  HealthStatusCode `json:"status,omitempty"`
	Message string           `json:"message,omitempty"`
}

var (
	progressingStatus = &HealthStatus{
		Status:  HealthStatusProgressing,
		Message: "Waiting to Autoscale",
	}

	nonstaleGvks = []schema.GroupVersionKind{
		{Group: "cert-manager.io", Kind: "Certificate"},
		{Group: "deployments.plural.sh", Kind: "MetricsAggregate"},
		{Group: "deployments.plural.sh", Kind: "KubecostExtractor"},
		{Group: "deployments.plural.sh", Kind: "UpgradeInsights"},
	}
)

type hpaCondition struct {
	Type    string
	Reason  string
	Message string
	Status  string
}

func getHPAHealth(obj *unstructured.Unstructured) (*HealthStatus, error) {
	gvk := obj.GroupVersionKind()
	failedConversionMsg := "failed to convert unstructured HPA to typed: %v"

	switch gvk {
	case autoscalingv1.SchemeGroupVersion.WithKind(HorizontalPodAutoscalerKind):
		var hpa autoscalingv1.HorizontalPodAutoscaler
		err := runtime.DefaultUnstructuredConverter.FromUnstructured(obj.Object, &hpa)
		if err != nil {
			return nil, fmt.Errorf(failedConversionMsg, err)
		}
		return getAutoScalingV1HPAHealth(&hpa)
	case autoscalingv2beta1.SchemeGroupVersion.WithKind(HorizontalPodAutoscalerKind):
		var hpa autoscalingv2beta1.HorizontalPodAutoscaler
		err := runtime.DefaultUnstructuredConverter.FromUnstructured(obj.Object, &hpa)
		if err != nil {
			return nil, fmt.Errorf(failedConversionMsg, err)
		}
		return getAutoScalingV2beta1HPAHealth(&hpa)
	case autoscalingv2beta2.SchemeGroupVersion.WithKind(HorizontalPodAutoscalerKind):
		var hpa autoscalingv2beta2.HorizontalPodAutoscaler
		err := runtime.DefaultUnstructuredConverter.FromUnstructured(obj.Object, &hpa)
		if err != nil {
			return nil, fmt.Errorf(failedConversionMsg, err)
		}
		return getAutoScalingV2beta2HPAHealth(&hpa)
	case autoscalingv2.SchemeGroupVersion.WithKind(HorizontalPodAutoscalerKind):
		var hpa autoscalingv2.HorizontalPodAutoscaler
		err := runtime.DefaultUnstructuredConverter.FromUnstructured(obj.Object, &hpa)
		if err != nil {
			return nil, fmt.Errorf(failedConversionMsg, err)
		}
		return getAutoScalingV2HPAHealth(&hpa)
	default:
		return nil, fmt.Errorf("unsupported HPA GVK: %s", gvk)
	}
}

func getArgoRolloutHealth(obj *unstructured.Unstructured) (*HealthStatus, error) {
	var argo rolloutv1alpha1.Rollout
	var msg string
	if err := runtime.DefaultUnstructuredConverter.FromUnstructured(obj.Object, &argo); err != nil {
		return nil, err
	}
	switch argo.Status.Phase {
	case rolloutv1alpha1.RolloutPhasePaused:
		return &HealthStatus{
			Status:  HealthStatusPaused,
			Message: argo.Status.Message,
		}, nil

	case rolloutv1alpha1.RolloutPhaseDegraded:
		return &HealthStatus{
			Status:  HealthStatusDegraded,
			Message: argo.Status.Message,
		}, nil

	case rolloutv1alpha1.RolloutPhaseHealthy:
		return &HealthStatus{
			Status:  HealthStatusHealthy,
			Message: argo.Status.Message,
		}, nil
	default:
		return &HealthStatus{
			Status:  HealthStatusProgressing,
			Message: msg,
		}, nil
	}
}

func getCanaryHealth(obj *unstructured.Unstructured) (*HealthStatus, error) {
	var canary flaggerv1beta1.Canary
	if err := runtime.DefaultUnstructuredConverter.FromUnstructured(obj.Object, &canary); err != nil {
		return nil, err
	}
	var msg string
	for _, cond := range canary.Status.Conditions {
		if cond.Type == "Promoted" {
			msg = cond.Message
		}
	}

	phase := canary.Status.Phase
	if phase == flaggerv1beta1.CanaryPhaseSucceeded || phase == flaggerv1beta1.CanaryPhaseInitialized {
		return &HealthStatus{
			Status:  HealthStatusHealthy,
			Message: msg,
		}, nil
	}

	if phase == flaggerv1beta1.CanaryPhaseWaitingPromotion || phase == flaggerv1beta1.CanaryPhaseWaiting {
		return &HealthStatus{
			Status:  HealthStatusPaused,
			Message: msg,
		}, nil
	}

	if phase == flaggerv1beta1.CanaryPhaseFailed {
		return &HealthStatus{
			Status:  HealthStatusDegraded,
			Message: msg,
		}, nil
	}

	status := &HealthStatus{
		Status:  HealthStatusProgressing,
		Message: msg,
	}
	return status, nil
}

func getAutoScalingV2HPAHealth(hpa *autoscalingv2.HorizontalPodAutoscaler) (*HealthStatus, error) {
	statusConditions := hpa.Status.Conditions
	conditions := make([]hpaCondition, 0, len(statusConditions))
	for _, statusCondition := range statusConditions {
		conditions = append(conditions, hpaCondition{
			Type:    string(statusCondition.Type),
			Reason:  statusCondition.Reason,
			Message: statusCondition.Message,
			Status:  string(statusCondition.Status),
		})
	}

	return checkConditions(conditions, progressingStatus)
}

func getAutoScalingV2beta2HPAHealth(hpa *autoscalingv2beta2.HorizontalPodAutoscaler) (*HealthStatus, error) {
	statusConditions := hpa.Status.Conditions
	conditions := make([]hpaCondition, 0, len(statusConditions))
	for _, statusCondition := range statusConditions {
		conditions = append(conditions, hpaCondition{
			Type:    string(statusCondition.Type),
			Reason:  statusCondition.Reason,
			Message: statusCondition.Message,
			Status:  string(statusCondition.Status),
		})
	}

	return checkConditions(conditions, progressingStatus)
}

func getAutoScalingV2beta1HPAHealth(hpa *autoscalingv2beta1.HorizontalPodAutoscaler) (*HealthStatus, error) {
	statusConditions := hpa.Status.Conditions
	conditions := make([]hpaCondition, 0, len(statusConditions))
	for _, statusCondition := range statusConditions {
		conditions = append(conditions, hpaCondition{
			Type:    string(statusCondition.Type),
			Reason:  statusCondition.Reason,
			Message: statusCondition.Message,
			Status:  string(statusCondition.Status),
		})
	}

	return checkConditions(conditions, progressingStatus)
}

func getAutoScalingV1HPAHealth(hpa *autoscalingv1.HorizontalPodAutoscaler) (*HealthStatus, error) {
	annotation, ok := hpa.GetAnnotations()["autoscaling.alpha.kubernetes.io/conditions"]
	if !ok {
		return progressingStatus, nil
	}

	var conditions []hpaCondition
	err := json.Unmarshal([]byte(annotation), &conditions)
	if err != nil {
		failedMessage := "failed to convert conditions annotation to typed: %v"
		return nil, fmt.Errorf(failedMessage, err)
	}

	if len(conditions) == 0 {
		return progressingStatus, nil
	}

	return checkConditions(conditions, progressingStatus)
}

func checkConditions(conditions []hpaCondition, progressingStatus *HealthStatus) (*HealthStatus, error) {
	for _, condition := range conditions {
		if isDegraded(&condition) {
			return &HealthStatus{
				Status:  HealthStatusDegraded,
				Message: condition.Message,
			}, nil
		}

		if isHealthy(&condition) {
			return &HealthStatus{
				Status:  HealthStatusHealthy,
				Message: condition.Message,
			}, nil
		}
	}

	return progressingStatus, nil
}

func isDegraded(condition *hpaCondition) bool {
	degraded_states := []hpaCondition{
		{Type: "AbleToScale", Reason: "FailedGetScale"},
		{Type: "AbleToScale", Reason: "FailedUpdateScale"},
		{Type: "ScalingActive", Reason: "FailedGetResourceMetric"},
		{Type: "ScalingActive", Reason: "InvalidSelector"},
	}
	for _, degraded_state := range degraded_states {
		if condition.Type == degraded_state.Type && condition.Reason == degraded_state.Reason {
			return true
		}
	}
	return false
}

func isHealthy(condition *hpaCondition) bool {
	healthyConditionTypes := []string{"AbleToScale", "ScalingLimited"}
	for _, conditionType := range healthyConditionTypes {
		if condition.Type == conditionType && condition.Status == "True" {
			return true
		}
	}
	return false
}

func getJobHealth(obj *unstructured.Unstructured) (*HealthStatus, error) {
	gvk := obj.GroupVersionKind()
	switch gvk {
	case batchv1.SchemeGroupVersion.WithKind(JobKind):
		var job batchv1.Job
		err := runtime.DefaultUnstructuredConverter.FromUnstructured(obj.Object, &job)
		if err != nil {
			return nil, fmt.Errorf("failed to convert unstructured Job to typed: %w", err)
		}
		return getBatchv1JobHealth(&job)
	default:
		return nil, fmt.Errorf("unsupported Job GVK: %s", gvk)
	}
}

func getBatchv1JobHealth(job *batchv1.Job) (*HealthStatus, error) {
	failed := false
	var failMsg string
	complete := false
	var message string
	isSuspended := false
	for _, condition := range job.Status.Conditions {
		switch condition.Type {
		case batchv1.JobFailed:
			failed = true
			complete = true
			failMsg = condition.Message
		case batchv1.JobComplete:
			complete = true
			message = condition.Message
		case batchv1.JobSuspended:
			complete = true
			message = condition.Message
			if condition.Status == corev1.ConditionTrue {
				isSuspended = true
			}
		}
	}

	if !complete {
		return &HealthStatus{
			Status:  HealthStatusProgressing,
			Message: message,
		}, nil
	}
	if failed {
		return &HealthStatus{
			Status:  HealthStatusDegraded,
			Message: failMsg,
		}, nil
	}
	if isSuspended {
		return &HealthStatus{
			Status:  HealthStatusSuspended,
			Message: failMsg,
		}, nil
	}

	return &HealthStatus{
		Status:  HealthStatusHealthy,
		Message: message,
	}, nil
}

func getNodeHealth(obj *unstructured.Unstructured) (*HealthStatus, error) {
	gvk := obj.GroupVersionKind()
	switch gvk {
	case corev1.SchemeGroupVersion.WithKind(NodeKind):
		var node corev1.Node
		err := runtime.DefaultUnstructuredConverter.FromUnstructured(obj.Object, &node)
		if err != nil {
			return nil, fmt.Errorf("failed to convert unstructured Node to typed: %w", err)
		}
		return getCorev1NodeHealth(&node)
	default:
		return nil, fmt.Errorf("unsupported Node GVK: %s", gvk)
	}
}

func getCorev1NodeHealth(node *corev1.Node) (*HealthStatus, error) {
	for _, condition := range node.Status.Conditions {
		if condition.Type == corev1.NodeReady {
			if condition.Status == corev1.ConditionTrue {
				return &HealthStatus{
					Status:  HealthStatusHealthy,
					Message: condition.Message,
				}, nil
			}
			return &HealthStatus{
				Status:  HealthStatusDegraded,
				Message: condition.Message,
			}, nil
		}
	}

	return &HealthStatus{
		Status: HealthStatusUnknown,
	}, nil
}

func getPodHealth(obj *unstructured.Unstructured) (*HealthStatus, error) {
	gvk := obj.GroupVersionKind()
	switch gvk {
	case corev1.SchemeGroupVersion.WithKind(PodKind):
		var pod corev1.Pod
		err := runtime.DefaultUnstructuredConverter.FromUnstructured(obj.Object, &pod)
		if err != nil {
			return nil, fmt.Errorf("failed to convert unstructured Pod to typed: %w", err)
		}
		return getCorev1PodHealth(&pod)
	default:
		return nil, fmt.Errorf("unsupported Pod GVK: %s", gvk)
	}
}

func FindPodStatusCondition(conditions []corev1.PodCondition, conditionType corev1.PodConditionType) *corev1.PodCondition {
	for i := range conditions {
		if conditions[i].Type == conditionType {
			return &conditions[i]
		}
	}

	return nil
}

func getCorev1PodHealth(pod *corev1.Pod) (*HealthStatus, error) {
	// This logic cannot be applied when the pod.Spec.RestartPolicy is: corev1.RestartPolicyOnFailure,
	// corev1.RestartPolicyNever, otherwise it breaks the resource hook logic.
	// The issue is, if we mark a pod with ImagePullBackOff as Degraded, and the pod is used as a resource hook,
	// then we will prematurely fail the PreSync/PostSync hook. Meanwhile, when that error condition is resolved
	// (e.g. the image is available), the resource hook pod will unexpectedly be executed even though the sync has
	// completed.
	if pod.Spec.RestartPolicy == corev1.RestartPolicyAlways {
		var status HealthStatusCode
		var messages []string

		for _, containerStatus := range pod.Status.ContainerStatuses {
			waiting := containerStatus.State.Waiting
			// Article listing common container errors: https://medium.com/kokster/debugging-crashloopbackoffs-with-init-containers-26f79e9fb5bf
			if waiting != nil && (strings.HasPrefix(waiting.Reason, "Err") || strings.HasSuffix(waiting.Reason, "Error") || strings.HasSuffix(waiting.Reason, "BackOff")) {
				status = HealthStatusDegraded
				messages = append(messages, waiting.Message)
			}
		}

		if cond := FindPodStatusCondition(pod.Status.Conditions, corev1.PodScheduled); cond != nil {
			if status == "" && cond.Status == corev1.ConditionFalse {
				// status older than 5min
				cutoffTime := metav1.NewTime(time.Now().Add(-5 * time.Minute))
				if cond.LastTransitionTime.Before(&cutoffTime) {
					status = HealthStatusDegraded
					messages = append(messages, cond.Message)
				}
			}
		}

		if status != "" {
			return &HealthStatus{
				Status:  status,
				Message: strings.Join(messages, ", "),
			}, nil
		}
	}

	getFailMessage := func(ctr *corev1.ContainerStatus) string {
		if ctr.State.Terminated != nil {
			if ctr.State.Terminated.Message != "" {
				return ctr.State.Terminated.Message
			}
			if ctr.State.Terminated.Reason == "OOMKilled" {
				return ctr.State.Terminated.Reason
			}
			if ctr.State.Terminated.ExitCode != 0 {
				return fmt.Sprintf("container %q failed with exit code %d", ctr.Name, ctr.State.Terminated.ExitCode)
			}
		}
		return ""
	}

	switch pod.Status.Phase {
	case corev1.PodPending:
		return &HealthStatus{
			Status:  HealthStatusProgressing,
			Message: pod.Status.Message,
		}, nil
	case corev1.PodSucceeded:
		return &HealthStatus{
			Status:  HealthStatusHealthy,
			Message: pod.Status.Message,
		}, nil
	case corev1.PodFailed:
		if pod.Status.Message != "" {
			// Pod has a nice error message. Use that.
			return &HealthStatus{Status: HealthStatusDegraded, Message: pod.Status.Message}, nil
		}
		for _, ctr := range append(pod.Status.InitContainerStatuses, pod.Status.ContainerStatuses...) {
			if msg := getFailMessage(&ctr); msg != "" {
				return &HealthStatus{Status: HealthStatusDegraded, Message: msg}, nil
			}
		}

		return &HealthStatus{Status: HealthStatusDegraded, Message: ""}, nil
	case corev1.PodRunning:
		switch pod.Spec.RestartPolicy {
		case corev1.RestartPolicyAlways:
			// if pod is ready, it is automatically healthy
			if podutils.IsPodReady(pod) {
				return &HealthStatus{
					Status:  HealthStatusHealthy,
					Message: pod.Status.Message,
				}, nil
			}
			// if it's not ready, check to see if any container terminated, if so, it's degraded
			for _, ctrStatus := range pod.Status.ContainerStatuses {
				if ctrStatus.LastTerminationState.Terminated != nil {
					return &HealthStatus{
						Status:  HealthStatusDegraded,
						Message: pod.Status.Message,
					}, nil
				}
			}
			// otherwise we are progressing towards a ready state
			return &HealthStatus{
				Status:  HealthStatusProgressing,
				Message: pod.Status.Message,
			}, nil
		case corev1.RestartPolicyOnFailure, corev1.RestartPolicyNever:
			// pods set with a restart policy of OnFailure or Never, have a finite life.
			// These pods are typically resource hooks. Thus, we consider these as Progressing
			// instead of healthy.
			return &HealthStatus{
				Status:  HealthStatusProgressing,
				Message: pod.Status.Message,
			}, nil
		}
	}
	return &HealthStatus{
		Status:  HealthStatusUnknown,
		Message: pod.Status.Message,
	}, nil
}

func getPVCHealth(obj *unstructured.Unstructured) (*HealthStatus, error) {
	gvk := obj.GroupVersionKind()
	switch gvk {
	case corev1.SchemeGroupVersion.WithKind(PersistentVolumeClaimKind):
		var pvc corev1.PersistentVolumeClaim
		err := runtime.DefaultUnstructuredConverter.FromUnstructured(obj.Object, &pvc)
		if err != nil {
			return nil, fmt.Errorf("failed to convert unstructured PersistentVolumeClaim to typed: %w", err)
		}
		return getCorev1PVCHealth(&pvc)
	default:
		return nil, fmt.Errorf("unsupported PersistentVolumeClaim GVK: %s", gvk)
	}
}

func getCorev1PVCHealth(pvc *corev1.PersistentVolumeClaim) (*HealthStatus, error) {
	var status HealthStatusCode
	switch pvc.Status.Phase {
	case corev1.ClaimLost:
		status = HealthStatusDegraded
	case corev1.ClaimPending:
		status = HealthStatusProgressing
	case corev1.ClaimBound:
		status = HealthStatusHealthy
	default:
		status = HealthStatusUnknown
	}
	return &HealthStatus{Status: status}, nil
}

func getServiceHealth(obj *unstructured.Unstructured) (*HealthStatus, error) {
	gvk := obj.GroupVersionKind()
	switch gvk {
	case corev1.SchemeGroupVersion.WithKind(ServiceKind):
		var service corev1.Service
		err := runtime.DefaultUnstructuredConverter.FromUnstructured(obj.Object, &service)
		if err != nil {
			return nil, fmt.Errorf("failed to convert unstructured Service to typed: %w", err)
		}
		return getCorev1ServiceHealth(&service)
	default:
		return nil, fmt.Errorf("unsupported Service GVK: %s", gvk)
	}
}

func getCorev1ServiceHealth(service *corev1.Service) (*HealthStatus, error) {
	health := HealthStatus{Status: HealthStatusHealthy}
	if service.Spec.Type == corev1.ServiceTypeLoadBalancer {
		if len(service.Status.LoadBalancer.Ingress) > 0 {
			health.Status = HealthStatusHealthy
		} else {
			health.Status = HealthStatusProgressing
		}
	}
	return &health, nil
}

func getIngressHealth(obj *unstructured.Unstructured) (*HealthStatus, error) {
	ingresses, _, _ := unstructured.NestedSlice(obj.Object, "status", "loadBalancer", "ingress")
	health := HealthStatus{}
	if len(ingresses) > 0 {
		health.Status = HealthStatusHealthy
	} else {
		health.Status = HealthStatusProgressing
	}
	return &health, nil
}

func getReplicaSetHealth(obj *unstructured.Unstructured) (*HealthStatus, error) {
	gvk := obj.GroupVersionKind()
	switch gvk {
	case appsv1.SchemeGroupVersion.WithKind(ReplicaSetKind):
		var replicaSet appsv1.ReplicaSet
		err := runtime.DefaultUnstructuredConverter.FromUnstructured(obj.Object, &replicaSet)
		if err != nil {
			return nil, fmt.Errorf("failed to convert unstructured ReplicaSet to typed: %w", err)
		}
		return getAppsv1ReplicaSetHealth(&replicaSet)
	default:
		return nil, fmt.Errorf("unsupported ReplicaSet GVK: %s", gvk)
	}
}

func getAppsv1ReplicaSetHealth(replicaSet *appsv1.ReplicaSet) (*HealthStatus, error) {
	if replicaSet.Generation <= replicaSet.Status.ObservedGeneration {
		cond := getAppsv1ReplicaSetCondition(replicaSet.Status, appsv1.ReplicaSetReplicaFailure)
		if cond != nil && cond.Status == corev1.ConditionTrue {
			return &HealthStatus{
				Status:  HealthStatusDegraded,
				Message: cond.Message,
			}, nil
		} else if replicaSet.Spec.Replicas != nil && replicaSet.Status.AvailableReplicas < *replicaSet.Spec.Replicas {
			return &HealthStatus{
				Status:  HealthStatusProgressing,
				Message: fmt.Sprintf("Waiting for rollout to finish: %d out of %d new replicas are available...", replicaSet.Status.AvailableReplicas, *replicaSet.Spec.Replicas),
			}, nil
		}
	} else {
		return &HealthStatus{
			Status:  HealthStatusProgressing,
			Message: "Waiting for rollout to finish: observed replica set generation less than desired generation",
		}, nil
	}

	return &HealthStatus{
		Status: HealthStatusHealthy,
	}, nil
}

func getAppsv1ReplicaSetCondition(status appsv1.ReplicaSetStatus, condType appsv1.ReplicaSetConditionType) *appsv1.ReplicaSetCondition {
	for i := range status.Conditions {
		c := status.Conditions[i]
		if c.Type == condType {
			return &c
		}
	}
	return nil
}

func getDeploymentHealth(obj *unstructured.Unstructured) (*HealthStatus, error) {
	gvk := obj.GroupVersionKind()
	switch gvk {
	case appsv1.SchemeGroupVersion.WithKind(DeploymentKind):
		var deployment appsv1.Deployment
		err := runtime.DefaultUnstructuredConverter.FromUnstructured(obj.Object, &deployment)
		if err != nil {
			return nil, fmt.Errorf("failed to convert unstructured Deployment to typed: %w", err)
		}
		return getAppsv1DeploymentHealth(&deployment)
	default:
		return nil, fmt.Errorf("unsupported Deployment GVK: %s", gvk)
	}
}

func getAppsv1DeploymentHealth(deployment *appsv1.Deployment) (*HealthStatus, error) {
	if deployment.Spec.Paused {
		return &HealthStatus{
			Status:  HealthStatusSuspended,
			Message: "Deployment is paused",
		}, nil
	}
	// Borrowed at kubernetes/kubectl/rollout_status.go https://github.com/kubernetes/kubernetes/blob/5232ad4a00ec93942d0b2c6359ee6cd1201b46bc/pkg/kubectl/rollout_status.go#L80
	if deployment.Generation <= deployment.Status.ObservedGeneration {
		cond := getAppsv1DeploymentCondition(deployment.Status, appsv1.DeploymentProgressing)
		if cond != nil && cond.Reason == "ProgressDeadlineExceeded" {
			return &HealthStatus{
				Status:  HealthStatusDegraded,
				Message: fmt.Sprintf("Deployment %q exceeded its progress deadline", deployment.Name),
			}, nil
		}
		if deployment.Spec.Replicas != nil && deployment.Status.UpdatedReplicas < *deployment.Spec.Replicas {
			return &HealthStatus{
				Status:  HealthStatusProgressing,
				Message: fmt.Sprintf("Waiting for rollout to finish: %d out of %d new replicas have been updated...", deployment.Status.UpdatedReplicas, *deployment.Spec.Replicas),
			}, nil
		}
		if deployment.Status.Replicas > deployment.Status.UpdatedReplicas {
			return &HealthStatus{
				Status:  HealthStatusProgressing,
				Message: fmt.Sprintf("Waiting for rollout to finish: %d old replicas are pending termination...", deployment.Status.Replicas-deployment.Status.UpdatedReplicas),
			}, nil
		}
		if deployment.Status.AvailableReplicas < deployment.Status.UpdatedReplicas {
			return &HealthStatus{
				Status:  HealthStatusProgressing,
				Message: fmt.Sprintf("Waiting for rollout to finish: %d of %d updated replicas are available...", deployment.Status.AvailableReplicas, deployment.Status.UpdatedReplicas),
			}, nil
		}
		return &HealthStatus{
			Status: HealthStatusHealthy,
		}, nil
	}
	return &HealthStatus{
		Status:  HealthStatusProgressing,
		Message: "Waiting for rollout to finish: observed deployment generation less than desired generation",
	}, nil
}

func getAppsv1DeploymentCondition(status appsv1.DeploymentStatus, condType appsv1.DeploymentConditionType) *appsv1.DeploymentCondition {
	for i := range status.Conditions {
		c := status.Conditions[i]
		if c.Type == condType {
			return &c
		}
	}
	return nil
}

func getStatefulSetHealth(obj *unstructured.Unstructured) (*HealthStatus, error) {
	gvk := obj.GroupVersionKind()
	switch gvk {
	case appsv1.SchemeGroupVersion.WithKind(StatefulSetKind):
		var sts appsv1.StatefulSet
		err := runtime.DefaultUnstructuredConverter.FromUnstructured(obj.Object, &sts)
		if err != nil {
			return nil, fmt.Errorf("failed to convert unstructured StatefulSet to typed: %w", err)
		}
		return getAppsv1StatefulSetHealth(&sts)
	default:
		return nil, fmt.Errorf("unsupported StatefulSet GVK: %s", gvk)
	}
}

func getAppsv1StatefulSetHealth(sts *appsv1.StatefulSet) (*HealthStatus, error) {
	// Borrowed at kubernetes/kubectl/rollout_status.go https://github.com/kubernetes/kubernetes/blob/5232ad4a00ec93942d0b2c6359ee6cd1201b46bc/pkg/kubectl/rollout_status.go#L131
	if sts.Status.ObservedGeneration == 0 || sts.Generation > sts.Status.ObservedGeneration {
		return &HealthStatus{
			Status:  HealthStatusProgressing,
			Message: "Waiting for statefulset spec update to be observed...",
		}, nil
	}
	if sts.Spec.Replicas != nil && sts.Status.ReadyReplicas < *sts.Spec.Replicas {
		return &HealthStatus{
			Status:  HealthStatusProgressing,
			Message: fmt.Sprintf("Waiting for %d pods to be ready...", *sts.Spec.Replicas-sts.Status.ReadyReplicas),
		}, nil
	}
	if sts.Spec.UpdateStrategy.Type == appsv1.RollingUpdateStatefulSetStrategyType && sts.Spec.UpdateStrategy.RollingUpdate != nil {
		if sts.Spec.Replicas != nil && sts.Spec.UpdateStrategy.RollingUpdate.Partition != nil {
			if sts.Status.UpdatedReplicas < (*sts.Spec.Replicas - *sts.Spec.UpdateStrategy.RollingUpdate.Partition) {
				return &HealthStatus{
					Status: HealthStatusProgressing,
					Message: fmt.Sprintf("Waiting for partitioned roll out to finish: %d out of %d new pods have been updated...",
						sts.Status.UpdatedReplicas, (*sts.Spec.Replicas - *sts.Spec.UpdateStrategy.RollingUpdate.Partition)),
				}, nil
			}
		}
		return &HealthStatus{
			Status:  HealthStatusHealthy,
			Message: fmt.Sprintf("partitioned roll out complete: %d new pods have been updated...", sts.Status.UpdatedReplicas),
		}, nil
	}
	if sts.Spec.UpdateStrategy.Type == appsv1.OnDeleteStatefulSetStrategyType {
		return &HealthStatus{
			Status:  HealthStatusHealthy,
			Message: fmt.Sprintf("statefulset has %d ready pods", sts.Status.ReadyReplicas),
		}, nil
	}
	if sts.Status.UpdateRevision != sts.Status.CurrentRevision {
		return &HealthStatus{
			Status:  HealthStatusProgressing,
			Message: fmt.Sprintf("waiting for statefulset rolling update to complete %d pods at revision %s...", sts.Status.UpdatedReplicas, sts.Status.UpdateRevision),
		}, nil
	}
	return &HealthStatus{
		Status:  HealthStatusHealthy,
		Message: fmt.Sprintf("statefulset rolling update complete %d pods at revision %s...", sts.Status.CurrentReplicas, sts.Status.CurrentRevision),
	}, nil
}

func getDaemonSetHealth(obj *unstructured.Unstructured) (*HealthStatus, error) {
	gvk := obj.GroupVersionKind()
	switch gvk {
	case appsv1.SchemeGroupVersion.WithKind(DaemonSetKind):
		var daemon appsv1.DaemonSet
		err := runtime.DefaultUnstructuredConverter.FromUnstructured(obj.Object, &daemon)
		if err != nil {
			return nil, fmt.Errorf("failed to convert unstructured DaemonSet to typed: %w", err)
		}
		return getAppsv1DaemonSetHealth(&daemon)
	default:
		return nil, fmt.Errorf("unsupported DaemonSet GVK: %s", gvk)
	}
}

func getAppsv1DaemonSetHealth(daemon *appsv1.DaemonSet) (*HealthStatus, error) {
	// Borrowed at kubernetes/kubectl/rollout_status.go https://github.com/kubernetes/kubernetes/blob/5232ad4a00ec93942d0b2c6359ee6cd1201b46bc/pkg/kubectl/rollout_status.go#L110
	if daemon.Generation <= daemon.Status.ObservedGeneration {
		if daemon.Spec.UpdateStrategy.Type == appsv1.OnDeleteDaemonSetStrategyType {
			return &HealthStatus{
				Status:  HealthStatusHealthy,
				Message: fmt.Sprintf("daemon set %d out of %d new pods have been updated", daemon.Status.UpdatedNumberScheduled, daemon.Status.DesiredNumberScheduled),
			}, nil
		}
		if daemon.Status.UpdatedNumberScheduled < daemon.Status.DesiredNumberScheduled {
			return &HealthStatus{
				Status:  HealthStatusProgressing,
				Message: fmt.Sprintf("Waiting for daemon set %q rollout to finish: %d out of %d new pods have been updated...", daemon.Name, daemon.Status.UpdatedNumberScheduled, daemon.Status.DesiredNumberScheduled),
			}, nil
		}
		if daemon.Status.NumberAvailable < daemon.Status.DesiredNumberScheduled {
			return &HealthStatus{
				Status:  HealthStatusProgressing,
				Message: fmt.Sprintf("Waiting for daemon set %q rollout to finish: %d of %d updated pods are available...", daemon.Name, daemon.Status.NumberAvailable, daemon.Status.DesiredNumberScheduled),
			}, nil
		}
	} else {
		return &HealthStatus{
			Status:  HealthStatusProgressing,
			Message: "Waiting for rollout to finish: observed daemon set generation less than desired generation",
		}, nil
	}
	return &HealthStatus{
		Status: HealthStatusHealthy,
	}, nil
}

type ConditionSimple struct {
	Type               string `json:"type"`
	Status             string `json:"status"`
	LastTransitionTime string `json:"lastTransitionTime"`
}

const readyCondition = "Ready"

func GetHealthCheckFuncByGroupVersionKind(gvk schema.GroupVersionKind) func(obj *unstructured.Unstructured) (*HealthStatus, error) {
	switch gvk.Group {
	case "apps":
		switch gvk.Kind {
		case DeploymentKind:
			return getDeploymentHealth
		case StatefulSetKind:
			return getStatefulSetHealth
		case ReplicaSetKind:
			return getReplicaSetHealth
		case DaemonSetKind:
			return getDaemonSetHealth
		}
	case "extensions":
		if gvk.Kind == IngressKind {
			return getIngressHealth
		}
	case "networking.k8s.io":
		if gvk.Kind == IngressKind {
			return getIngressHealth
		}
	case "":
		switch gvk.Kind {
		case ServiceKind:
			return getServiceHealth
		case PersistentVolumeClaimKind:
			return getPVCHealth
		case PodKind:
			return getPodHealth
		case NodeKind:
			return getNodeHealth
		}
	case "batch":
		if gvk.Kind == JobKind {
			return getJobHealth
		}
	case "flagger.app":
		if gvk.Kind == CanaryKind {
			return getCanaryHealth
		}
	case rollouts.Group:
		if gvk.Kind == rollouts.RolloutKind {
			return getArgoRolloutHealth
		}
	case "autoscaling":
		if gvk.Kind == HorizontalPodAutoscalerKind {
			return getHPAHealth
		}
	}

	return nil
}

func GetOtherHealthStatus(obj *unstructured.Unstructured) (*HealthStatus, error) {
	defaultReadyStatus := &HealthStatus{
		Status: HealthStatusHealthy,
	}
	conds, found, err := unstructured.NestedSlice(obj.Object, "status", "conditions")
	if err != nil || !found {
		return defaultReadyStatus, nil
	}

	conditions := utils.UnstructuredToConditions(conds)

	if cond := meta.FindStatusCondition(conditions, readyCondition); cond != nil {
		status := HealthStatusProgressing

		// status older than 5min
		cutoffTime := metav1.NewTime(time.Now().Add(-5 * time.Minute))
		if cond.LastTransitionTime.Before(&cutoffTime) && staleIsFailing(obj) {
			status = HealthStatusDegraded
		}

		if meta.IsStatusConditionTrue(conditions, readyCondition) {
			status = HealthStatusHealthy
		}
		return &HealthStatus{
			Status: status,
		}, nil
	}

	return defaultReadyStatus, nil
}

func staleIsFailing(obj *unstructured.Unstructured) bool {
	gvk := obj.GetObjectKind().GroupVersionKind()

	for _, val := range nonstaleGvks {
		if val.Group == gvk.Group && val.Kind == gvk.Kind {
			return true
		}
	}

	return false
}
