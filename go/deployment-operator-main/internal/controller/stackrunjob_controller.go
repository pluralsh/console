/*
Copyright 2024.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package controller

import (
	"context"
	"fmt"
	"time"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/polly/algorithms"
	"github.com/pluralsh/deployment-operator/api/v1alpha1"
	clienterrors "github.com/pluralsh/deployment-operator/internal/errors"
	"github.com/pluralsh/deployment-operator/internal/utils"
	"github.com/pluralsh/deployment-operator/pkg/client"
	"github.com/pluralsh/deployment-operator/pkg/common"
	"github.com/samber/lo"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	apierrs "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	k8sClient "sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

const StackRunJobFinalizer = "deployments.plural.sh/stack-run-job-protection"

const jobTimeout = time.Minute * 40
const podTimeout = time.Minute * 2
const controlledJobMaxLifetime = time.Hour * 12
const defaultJobStatus = "Progressing"

// StackRunJobReconciler reconciles a Job resource.
type StackRunJobReconciler struct {
	k8sClient.Client
	Scheme        *runtime.Scheme
	ConsoleClient client.Client
	ConsoleURL    string
	DeployToken   string
}

// Reconcile StackRun's Job ensure that Console stays in sync with Kubernetes cluster.
func (r *StackRunJobReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ reconcile.Result, retErr error) {
	logger := log.FromContext(ctx)

	run := &v1alpha1.StackRunJob{}
	if err := r.Get(ctx, req.NamespacedName, run); err != nil {
		logger.Error(err, "unable to fetch StackRunJob")
		return ctrl.Result{}, k8sClient.IgnoreNotFound(err)
	}

	scope, err := NewDefaultScope(ctx, r.Client, run)
	if err != nil {
		return ctrl.Result{}, err
	}

	// Always patch object when exiting this function, so we can persist any object changes.
	// Registered second so it runs first (before the delete defer above).
	defer func() {
		if err := scope.PatchObject(); err != nil && retErr == nil {
			retErr = err
		}
	}()

	utils.MarkCondition(run.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(run.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReason, "")

	// Finalizer is needed to ensure that the Job and Secret are cleaned up after the StackRun reaches terminal state and will be deleted by the controller.
	// The object can be deleted before defer patches the status update with terminal state, so we need to ensure that the finalizer is removed and the object is deleted to avoid orphaned resources.
	if run.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(run, StackRunJobFinalizer) {
		controllerutil.AddFinalizer(run, StackRunJobFinalizer)
	}
	if !run.DeletionTimestamp.IsZero() && controllerutil.ContainsFinalizer(run, StackRunJobFinalizer) {
		controllerutil.RemoveFinalizer(run, StackRunJobFinalizer)
		return ctrl.Result{}, nil
	}

	maxStackRuns := common.GetConfigurationManager().GetMaxStackRunJobs()
	activeJobs, err := r.getNumberOfActiveJobs(ctx)
	if err != nil {
		return ctrl.Result{}, err
	}

	stackRun, err := r.ConsoleClient.GetStackRun(run.Spec.RunID)
	if err != nil {
		if clienterrors.IsNotFound(err) {
			if stackIsTimedOut(run) {
				logger.V(2).Info("stack run job timed out, deleting CR", "name", run.Name, "namespace", run.Namespace)
				err := r.Delete(ctx, run)
				return ctrl.Result{}, k8sClient.IgnoreNotFound(err)
			}
			return jitterRequeue(requeueAfter, jitter), nil
		}
		return ctrl.Result{}, err
	}

	if activeJobs >= maxStackRuns && stackRun.Status == console.StackStatusPending {
		logger.V(2).Info("maximum number of jobs reached", "activeJobs", activeJobs, "maxStackRuns", maxStackRuns)
		return jitterRequeue(requeueAfter, jitter), nil
	}

	run.Status.ID = lo.ToPtr(stackRun.ID)

	secret, err := r.reconcileSecret(ctx, run)
	if err != nil {
		return ctrl.Result{}, err
	}

	job, err := r.reconcileJob(ctx, run, stackRun)
	if err != nil {
		return ctrl.Result{}, err
	}

	run.Status.JobRef = &corev1.LocalObjectReference{Name: job.Name}

	if err := utils.TryAddOwnerRef(ctx, r.Client, job, secret, r.Scheme); err != nil {
		return ctrl.Result{}, err
	}
	if err := utils.TryAddControllerRef(ctx, r.Client, run, job, r.Scheme); err != nil {
		return ctrl.Result{}, err
	}

	status, err := r.reconcileJobStatus(ctx, run, stackRun.Status, job)
	if err != nil {
		return ctrl.Result{}, err
	}

	if err := r.ConsoleClient.UpdateStackRun(stackRun.ID, console.StackRunAttributes{
		Status: status,
		JobRef: &console.NamespacedName{
			Name:      job.Name,
			Namespace: job.Namespace,
		},
	}); err != nil {
		return ctrl.Result{}, err
	}

	if isTerminalStackRunStatus(status) {
		logger.V(2).Info("stack run reached terminal state, cleaning up CRD", "name", run.Name, "namespace", run.Namespace)
		if err := r.Delete(ctx, run); err != nil && !apierrs.IsNotFound(err) {
			return ctrl.Result{}, err
		}
	}

	utils.MarkCondition(run.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(run.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	return ctrl.Result{}, nil
}

// reconcileJobStatus evaluates the current job state and updates run.Status.JobStatus,
// returning the derived console status to report upstream.
func (r *StackRunJobReconciler) reconcileJobStatus(ctx context.Context, run *v1alpha1.StackRunJob, stackRunStatus console.StackStatus, job *batchv1.Job) (console.StackStatus, error) {
	logger := log.FromContext(ctx)
	status := stackRunStatus
	run.Status.JobStatus = defaultJobStatus
	run.Status.JobRef = &corev1.LocalObjectReference{Name: job.Name}

	switch {
	case isControlledJobTimedOut(job):
		if err := r.killJob(ctx, job); err != nil {
			return status, err
		}
		run.Status.JobStatus = string(console.StackStatusCancelled)
		logger.V(2).Info("stack run job exceeded max lifetime, cancelling", "name", job.Name, "namespace", job.Namespace)
		status = console.StackStatusCancelled
	// Exit if stack run is not in running state (run status already updated),
	// or if the job is still running (harness controls run status).
	case stackRunStatus != console.StackStatusRunning || job.Status.CompletionTime.IsZero():
		if isActiveJobTimout(stackRunStatus, job) || r.isActiveJobPodFailed(ctx, stackRunStatus, job) {
			if err := r.killJob(ctx, job); err != nil {
				return status, err
			}
			run.Status.JobStatus = string(console.StackStatusFailed)
			logger.V(2).Info("stack run job failed", "name", job.Name, "namespace", job.Namespace)
			status = console.StackStatusFailed
		}
	case hasSucceeded(job):
		logger.V(2).Info("stack run job succeeded", "name", job.Name, "namespace", job.Namespace)
		run.Status.JobStatus = string(console.StackStatusSuccessful)
		status = console.StackStatusSuccessful
	case hasFailed(job):
		logger.V(2).Info("stack run job failed", "name", job.Name, "namespace", job.Namespace)
		var err error
		status, err = r.getJobPodStatus(ctx, job.Spec.Selector.MatchLabels)
		if err != nil {
			status = console.StackStatusFailed
			logger.Error(err, "unable to get job pod status")
		}
		run.Status.JobStatus = string(status)
	}

	return status, nil
}

// isTerminalStackRunStatus returns true when the stack run has reached a final state
// that requires no further reconciliation.
func isTerminalStackRunStatus(status console.StackStatus) bool {
	switch status {
	case console.StackStatusSuccessful, console.StackStatusCancelled, console.StackStatusFailed:
		return true
	}
	return false
}

func (r *StackRunJobReconciler) getNumberOfActiveJobs(ctx context.Context) (int, error) {
	metaList := &v1alpha1.StackRunJobList{}
	if err := r.List(ctx, metaList); err != nil {
		return 0, err
	}
	activeRuns := 0
	for _, item := range metaList.Items {
		if item.DeletionTimestamp == nil && item.Status.JobStatus == defaultJobStatus {
			activeRuns++
		}
	}
	return activeRuns, nil
}

// GetRunResourceName returns a resource name used for a job and a secret connected to a given run.
func (r *StackRunJobReconciler) GetRunResourceName(run *console.StackRunMinimalFragment) string {
	return fmt.Sprintf("stack-%s", run.ID)
}

func (r *StackRunJobReconciler) getJobPodStatus(ctx context.Context, selector map[string]string) (console.StackStatus, error) {
	pod, err := r.getJobPod(ctx, selector)
	if err != nil {
		return console.StackStatusFailed, err
	}

	return r.getPodStatus(pod)
}

func (r *StackRunJobReconciler) getJobPod(ctx context.Context, selector map[string]string) (*corev1.Pod, error) {
	podList := &corev1.PodList{}
	if err := r.List(ctx, podList, &k8sClient.ListOptions{LabelSelector: labels.SelectorFromSet(selector)}); err != nil {
		return nil, err
	}

	if len(podList.Items) == 0 {
		return nil, fmt.Errorf("no pods found")
	}

	return &podList.Items[0], nil
}

func (r *StackRunJobReconciler) getPodStatus(pod *corev1.Pod) (console.StackStatus, error) {
	statusIndex := algorithms.Index(pod.Status.ContainerStatuses, func(status corev1.ContainerStatus) bool {
		return status.Name == stackRunDefaultJobContainer
	})
	if statusIndex == -1 {
		return console.StackStatusFailed, fmt.Errorf("no job container with name %s found", stackRunDefaultJobContainer)
	}

	containerStatus := pod.Status.ContainerStatuses[statusIndex]
	if containerStatus.State.Terminated == nil {
		return console.StackStatusFailed, fmt.Errorf("job container is not in terminated state")
	}

	return getExitCodeStatus(containerStatus.State.Terminated.ExitCode), nil
}

func (r *StackRunJobReconciler) killJob(ctx context.Context, job *batchv1.Job) error {
	log := log.FromContext(ctx)
	deletePolicy := metav1.DeletePropagationBackground // kill the job and its pods asap
	if err := r.Delete(ctx, job, &k8sClient.DeleteOptions{
		PropagationPolicy: &deletePolicy,
	}); err != nil {
		if !apierrs.IsNotFound(err) {
			return err
		}
		return nil
	}
	log.V(2).Info("Job killed successfully.", "JobName", job.Name, "Namespace", job.Namespace)
	return nil
}

func getExitCodeStatus(exitCode int32) console.StackStatus {
	switch exitCode {
	case 64, 66:
		return console.StackStatusCancelled
	case 65:
		return console.StackStatusFailed
	}

	return console.StackStatusFailed
}

func isActiveJob(stackStatus console.StackStatus, job *batchv1.Job) bool {
	return stackStatus == console.StackStatusPending && job.Status.CompletionTime.IsZero() && !job.Status.StartTime.IsZero()
}

func stackIsTimedOut(stackRun *v1alpha1.StackRunJob) bool {
	return time.Now().After(stackRun.CreationTimestamp.Add(jobTimeout))
}

func isActiveJobTimout(stackStatus console.StackStatus, job *batchv1.Job) bool {
	if isActiveJob(stackStatus, job) {
		return time.Now().After(job.Status.StartTime.Add(jobTimeout))
	}
	return false
}

func isControlledJobTimedOut(job *batchv1.Job) bool {
	if job == nil || !job.Status.CompletionTime.IsZero() {
		return false
	}

	// Prefer start time when available (represents actual execution lifetime),
	// then fall back to object creation time.
	if !job.Status.StartTime.IsZero() {
		return time.Now().After(job.Status.StartTime.Add(controlledJobMaxLifetime))
	}
	if !job.CreationTimestamp.IsZero() {
		return time.Now().After(job.CreationTimestamp.Add(controlledJobMaxLifetime))
	}
	return false
}

func (r *StackRunJobReconciler) isActiveJobPodFailed(ctx context.Context, stackStatus console.StackStatus, job *batchv1.Job) bool {
	if isActiveJob(stackStatus, job) {
		status, err := r.getJobPodStatus(ctx, job.Spec.Selector.MatchLabels)
		if err != nil || status == console.StackStatusFailed {
			// in case when job's Pod wasn't created yet
			return time.Now().After(job.Status.StartTime.Add(podTimeout))
		}
	}
	return false
}

// SetupWithManager sets up the controller with the Manager.
func (r *StackRunJobReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		For(&v1alpha1.StackRunJob{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Owns(&batchv1.Job{}).
		Complete(r)
}
