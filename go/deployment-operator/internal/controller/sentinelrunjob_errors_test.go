package controller

import (
	"errors"
	"fmt"
	"strings"
	"testing"
	"time"

	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
)

func TestPodErrorMessage(t *testing.T) {
	cases := []struct {
		name string
		pod  corev1.Pod
		want string
	}{
		{
			name: "image_pull_backoff",
			pod: corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{Name: "p"},
				Status: corev1.PodStatus{ContainerStatuses: []corev1.ContainerStatus{{
					Name:  "default",
					State: corev1.ContainerState{Waiting: &corev1.ContainerStateWaiting{Reason: "ImagePullBackOff", Message: "Back-off pulling image \"bad:tag\""}},
				}}},
			},
			want: `container "default" in pod p is waiting with reason ImagePullBackOff: Back-off pulling image "bad:tag"`,
		},
		{
			name: "container_creating_is_not_an_error",
			pod: corev1.Pod{
				Status: corev1.PodStatus{ContainerStatuses: []corev1.ContainerStatus{{
					Name:  "default",
					State: corev1.ContainerState{Waiting: &corev1.ContainerStateWaiting{Reason: "ContainerCreating"}},
				}}},
			},
		},
		{
			name: "oom_killed",
			pod: corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{Name: "p"},
				Status: corev1.PodStatus{ContainerStatuses: []corev1.ContainerStatus{{
					Name:  "default",
					State: corev1.ContainerState{Terminated: &corev1.ContainerStateTerminated{Reason: "OOMKilled", ExitCode: 137}},
				}}},
			},
			want: `container "default" in pod p was OOMKilled, consider raising its memory limits`,
		},
		{
			name: "unschedulable_after_grace",
			pod: corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{Name: "p"},
				Status: corev1.PodStatus{Conditions: []corev1.PodCondition{{
					Type:               corev1.PodScheduled,
					Status:             corev1.ConditionFalse,
					Reason:             corev1.PodReasonUnschedulable,
					Message:            "0/3 nodes are available: 3 Insufficient cpu.",
					LastTransitionTime: metav1.NewTime(time.Now().Add(-10 * time.Minute)),
				}}},
			},
			want: "pod p could not be scheduled: 0/3 nodes are available: 3 Insufficient cpu.",
		},
		{
			name: "unschedulable_within_grace",
			pod: corev1.Pod{
				Status: corev1.PodStatus{Conditions: []corev1.PodCondition{{
					Type:               corev1.PodScheduled,
					Status:             corev1.ConditionFalse,
					Reason:             corev1.PodReasonUnschedulable,
					LastTransitionTime: metav1.NewTime(time.Now()),
				}}},
			},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := podErrorMessage(&tc.pod); got != tc.want {
				t.Errorf("podErrorMessage() = %q, want %q", got, tc.want)
			}
		})
	}
}

func TestJobFailedMessage(t *testing.T) {
	job := &batchv1.Job{
		ObjectMeta: metav1.ObjectMeta{Name: "j", Namespace: "ns"},
		Status: batchv1.JobStatus{Conditions: []batchv1.JobCondition{{
			Type:    batchv1.JobFailed,
			Status:  corev1.ConditionTrue,
			Reason:  "DeadlineExceeded",
			Message: "Job was active longer than specified deadline",
		}}},
	}

	got := jobFailedMessage(job, &common.HealthStatus{Status: common.HealthStatusDegraded})
	want := "job ns/j failed with reason DeadlineExceeded: Job was active longer than specified deadline"
	if got != want {
		t.Errorf("jobFailedMessage() = %q, want %q", got, want)
	}
}

func TestIsPermanentProvisioningError(t *testing.T) {
	if !isPermanentProvisioningError(fmt.Errorf("%w: %w", errInvalidSentinelJobSpec, errors.New("bad quantity"))) {
		t.Error("expected invalid job spec to be permanent")
	}
	if isPermanentProvisioningError(errors.New("connection refused")) {
		t.Error("expected generic error to be transient")
	}
}

func TestTruncateSentinelRunJobError(t *testing.T) {
	got := truncateSentinelRunJobError(strings.Repeat("a", maxSentinelRunJobErrorLength+10))
	if len([]rune(got)) != maxSentinelRunJobErrorLength || !strings.HasSuffix(got, "...") {
		t.Errorf("unexpected truncation, length %d", len([]rune(got)))
	}
}
