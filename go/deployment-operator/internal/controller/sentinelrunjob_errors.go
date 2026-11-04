package controller

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	apierrs "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
)

const (
	// maxSentinelRunJobErrorLength mirrors the length limit on the console's sentinel_run_jobs.error column.
	maxSentinelRunJobErrorLength  = 2000
	sentinelPodUnschedulableGrace = 5 * time.Minute
	sentinelPodCreationGrace      = 5 * time.Minute
)

var errInvalidSentinelJobSpec = errors.New("invalid job spec")

// sentinelPodWaitingErrorReasons are container waiting reasons that will not resolve without user intervention.
var sentinelPodWaitingErrorReasons = map[string]struct{}{
	"ErrImagePull":               {},
	"ImagePullBackOff":           {},
	"InvalidImageName":           {},
	"ErrImageNeverPull":          {},
	"CreateContainerConfigError": {},
	"CreateContainerError":       {},
	"RunContainerError":          {},
	"CrashLoopBackOff":           {},
}

// isPermanentProvisioningError returns true when retrying job creation can never succeed without a config change.
func isPermanentProvisioningError(err error) bool {
	return errors.Is(err, errInvalidSentinelJobSpec) || apierrs.IsInvalid(err) || apierrs.IsBadRequest(err)
}

func provisioningErrorMessage(err error) string {
	return truncateSentinelRunJobError(fmt.Sprintf("failed to provision kubernetes job: %s", err.Error()))
}

// getJobErrorMessage inspects a sentinel job and its pods and returns a human-readable explanation of why it
// failed or is stuck, or an empty string if nothing is wrong.
func (r *SentinelRunJobReconciler) getJobErrorMessage(ctx context.Context, job *batchv1.Job, health *common.HealthStatus) string {
	if health != nil && health.Status == common.HealthStatusHealthy {
		return ""
	}

	pods, err := r.listJobPods(ctx, job)
	if err != nil {
		return ""
	}

	for _, pod := range pods {
		if msg := podErrorMessage(&pod); msg != "" {
			return truncateSentinelRunJobError(msg)
		}
	}

	if health != nil && health.Status == common.HealthStatusDegraded {
		return truncateSentinelRunJobError(jobFailedMessage(job, health))
	}

	if len(pods) == 0 && !job.CreationTimestamp.IsZero() && time.Since(job.CreationTimestamp.Time) > sentinelPodCreationGrace {
		return fmt.Sprintf(
			"no pods were created for job %s/%s after %s, this is usually caused by admission policies or resource quotas, check the job's events",
			job.Namespace, job.Name, sentinelPodCreationGrace,
		)
	}

	return ""
}

func (r *SentinelRunJobReconciler) listJobPods(ctx context.Context, job *batchv1.Job) ([]corev1.Pod, error) {
	if job.Spec.Selector == nil {
		return nil, nil
	}

	selector, err := metav1.LabelSelectorAsSelector(job.Spec.Selector)
	if err != nil {
		return nil, err
	}

	podList := &corev1.PodList{}
	if err := r.List(ctx, podList, client.InNamespace(job.Namespace), client.MatchingLabelsSelector{Selector: selector}); err != nil {
		return nil, err
	}

	pods := podList.Items
	sort.Slice(pods, func(i, j int) bool {
		return pods[j].CreationTimestamp.Before(&pods[i].CreationTimestamp)
	})
	return pods, nil
}

func podErrorMessage(pod *corev1.Pod) string {
	statuses := append(append([]corev1.ContainerStatus{}, pod.Status.InitContainerStatuses...), pod.Status.ContainerStatuses...)
	for _, cs := range statuses {
		if waiting := cs.State.Waiting; waiting != nil {
			if _, ok := sentinelPodWaitingErrorReasons[waiting.Reason]; ok {
				return withDetail(fmt.Sprintf("container %q in pod %s is waiting with reason %s", cs.Name, pod.Name, waiting.Reason), waiting.Message)
			}
		}

		if terminated := cs.State.Terminated; terminated != nil && terminated.ExitCode != 0 {
			msg := fmt.Sprintf("container %q in pod %s terminated with exit code %d", cs.Name, pod.Name, terminated.ExitCode)
			if terminated.Reason == "OOMKilled" {
				msg = fmt.Sprintf("container %q in pod %s was OOMKilled, consider raising its memory limits", cs.Name, pod.Name)
			} else if terminated.Reason != "" {
				msg = fmt.Sprintf("%s (reason %s)", msg, terminated.Reason)
			}
			return withDetail(msg, terminated.Message)
		}
	}

	if pod.Status.Phase == corev1.PodFailed && pod.Status.Reason != "" {
		return withDetail(fmt.Sprintf("pod %s failed with reason %s", pod.Name, pod.Status.Reason), pod.Status.Message)
	}

	if cond := common.FindPodStatusCondition(pod.Status.Conditions, corev1.PodScheduled); cond != nil &&
		cond.Status == corev1.ConditionFalse &&
		cond.Reason == corev1.PodReasonUnschedulable &&
		time.Since(cond.LastTransitionTime.Time) > sentinelPodUnschedulableGrace {
		return withDetail(fmt.Sprintf("pod %s could not be scheduled", pod.Name), cond.Message)
	}

	return ""
}

func jobFailedMessage(job *batchv1.Job, health *common.HealthStatus) string {
	for _, cond := range job.Status.Conditions {
		if cond.Type == batchv1.JobFailed && cond.Status == corev1.ConditionTrue {
			return withDetail(fmt.Sprintf("job %s/%s failed with reason %s", job.Namespace, job.Name, cond.Reason), cond.Message)
		}
	}
	return withDetail(fmt.Sprintf("job %s/%s failed", job.Namespace, job.Name), health.Message)
}

func withDetail(msg, detail string) string {
	if detail = strings.TrimSpace(detail); detail != "" {
		return fmt.Sprintf("%s: %s", msg, detail)
	}
	return msg
}

func truncateSentinelRunJobError(msg string) string {
	if runes := []rune(msg); len(runes) > maxSentinelRunJobErrorLength {
		return string(runes[:maxSentinelRunJobErrorLength-3]) + "..."
	}
	return msg
}
