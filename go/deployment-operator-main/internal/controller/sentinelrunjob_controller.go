package controller

import (
	"context"
	"time"

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/deployment-operator/api/v1alpha1"
	internalerror "github.com/pluralsh/deployment-operator/internal/errors"
	"github.com/pluralsh/deployment-operator/internal/utils"
	consoleclient "github.com/pluralsh/deployment-operator/pkg/client"
	"github.com/pluralsh/deployment-operator/pkg/common"
	"github.com/samber/lo"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	apierrs "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

const (
	SentinelRunJobFinalizer          = "deployments.plural.sh/sentinel-run-job-protection"
	sentinelControlledJobMaxLifetime = 12 * time.Hour
)

type SentinelRunJobReconciler struct {
	client.Client
	ConsoleClient consoleclient.Client
	Scheme        *runtime.Scheme
	ConsoleURL    string
	DeployToken   string
}

func (r *SentinelRunJobReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ reconcile.Result, retErr error) {
	fromContext := log.FromContext(ctx)
	fromContext.Info("Reconciling SentinelRunJob", "name", req.Name, "namespace", req.Namespace)

	srj := &v1alpha1.SentinelRunJob{}
	if err := r.Get(ctx, req.NamespacedName, srj); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	scope, err := NewDefaultScope(ctx, r.Client, srj)
	if err != nil {
		return ctrl.Result{}, err
	}

	// Always patch object when exiting this function, so we can persist any object changes.
	defer func() {
		if err := scope.PatchObject(); err != nil && retErr == nil {
			retErr = err
		}
	}()
	utils.MarkCondition(srj.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionFalse, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(srj.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionFalse, v1alpha1.SynchronizedConditionReason, "")

	// Finalizer is needed to ensure that the Job and Secret are cleaned up after the StackRun reaches terminal state and will be deleted by the controller.
	// The object can be deleted before defer patches the status update with terminal state, so we need to ensure that the finalizer is removed and the object is deleted to avoid orphaned resources.
	if srj.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(srj, SentinelRunJobFinalizer) {
		controllerutil.AddFinalizer(srj, SentinelRunJobFinalizer)
	}
	if !srj.DeletionTimestamp.IsZero() && controllerutil.ContainsFinalizer(srj, SentinelRunJobFinalizer) {
		controllerutil.RemoveFinalizer(srj, SentinelRunJobFinalizer)
		return ctrl.Result{}, nil
	}

	maxSentinelRuns := common.GetConfigurationManager().GetMaxSentinelRunJobs()
	activeJobs, err := r.getNumberOfActiveJobs(ctx)
	if err != nil {
		return ctrl.Result{}, err
	}

	run, err := r.ConsoleClient.GetSentinelRunJob(srj.Spec.RunID)
	if err != nil {
		if internalerror.IsNotFound(err) {
			if sentinelIsTimedOut(srj) {
				fromContext.V(2).Info("sentinel run job timed out, deleting CR", "name", srj.Name, "namespace", srj.Namespace)
				err := r.Delete(ctx, srj)
				return ctrl.Result{}, client.IgnoreNotFound(err)
			}
			return jitterRequeue(requeueAfter, jitter), err
		}
		return jitterRequeue(requeueAfter, jitter), nil
	}
	if activeJobs >= maxSentinelRuns && run.Status == console.SentinelRunJobStatusPending {
		fromContext.V(2).Info("maximum number of active jobs reached", "activeJobs", activeJobs, "maxSentinelRun", maxSentinelRuns)
		return jitterRequeue(requeueAfter, jitter), nil
	}

	srj.Status.ID = lo.ToPtr(run.ID)

	secret, err := r.reconcileRunSecret(ctx, req.Name, req.Namespace, srj.Spec.RunID, string(run.Format))
	if err != nil {
		return ctrl.Result{}, err
	}

	job, err := r.reconcileRunJob(ctx, srj, run)
	if err != nil {
		return ctrl.Result{}, err
	}

	if err := utils.TryAddOwnerRef(ctx, r.Client, job, secret, r.Scheme); err != nil {
		return ctrl.Result{}, err
	}
	if err := utils.TryAddControllerRef(ctx, r.Client, srj, job, r.Scheme); err != nil {
		return ctrl.Result{}, err
	}

	unstructuredJob, err := common.ToUnstructured(job)
	if err != nil {
		return ctrl.Result{}, err
	}

	health, err := common.GetResourceHealth(unstructuredJob)
	if err != nil {
		return ctrl.Result{}, err
	}
	srj.Status.JobRef = &corev1.LocalObjectReference{Name: job.Name}
	status := run.Status
	if isSentinelControlledJobTimedOut(job) {
		if err := r.killRunJob(ctx, job); err != nil {
			return ctrl.Result{}, err
		}
		srj.Status.JobStatus = string(common.HealthStatusDegraded)
		status = console.SentinelRunJobStatusFailed
		fromContext.V(2).Info("sentinel run job exceeded max lifetime, failing", "name", job.Name, "namespace", job.Namespace)
	} else if health != nil {
		srj.Status.JobStatus = string(health.Status)
		if health.Status == common.HealthStatusDegraded {
			status = console.SentinelRunJobStatusFailed
		}
	}

	if err := r.ConsoleClient.UpdateSentinelRunJobStatus(srj.Spec.RunID, &console.SentinelRunJobUpdateAttributes{
		Status: &status,
		Reference: &console.NamespacedName{
			Name:      job.Name,
			Namespace: job.Namespace,
		},
	}); err != nil {
		return ctrl.Result{}, err
	}

	if isTerminalSentinelRunStatus(status) {
		if err := r.Delete(ctx, srj); err != nil && !apierrs.IsNotFound(err) {
			return ctrl.Result{}, err
		}
	}

	utils.MarkCondition(srj.SetCondition, v1alpha1.ReadyConditionType, metav1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	utils.MarkCondition(srj.SetCondition, v1alpha1.SynchronizedConditionType, metav1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	return ctrl.Result{}, nil
}

func sentinelIsTimedOut(srj *v1alpha1.SentinelRunJob) bool {
	return time.Now().After(srj.CreationTimestamp.Add(jobTimeout))
}

func isSentinelControlledJobTimedOut(job *batchv1.Job) bool {
	if job == nil || !job.Status.CompletionTime.IsZero() {
		return false
	}
	if !job.Status.StartTime.IsZero() {
		return time.Now().After(job.Status.StartTime.Add(sentinelControlledJobMaxLifetime))
	}
	if !job.CreationTimestamp.IsZero() {
		return time.Now().After(job.CreationTimestamp.Add(sentinelControlledJobMaxLifetime))
	}
	return false
}

func (r *SentinelRunJobReconciler) getNumberOfActiveJobs(ctx context.Context) (int, error) {
	metaList := &v1alpha1.SentinelRunJobList{}
	if err := r.List(ctx, metaList); err != nil {
		return 0, err
	}
	activeRuns := 0
	for _, item := range metaList.Items {
		if item.DeletionTimestamp == nil && item.Status.JobStatus == "Progressing" {
			activeRuns++
		}
	}
	return activeRuns, nil
}

func (r *SentinelRunJobReconciler) killRunJob(ctx context.Context, job *batchv1.Job) error {
	deletePolicy := metav1.DeletePropagationBackground
	if err := r.Delete(ctx, job, &client.DeleteOptions{
		PropagationPolicy: &deletePolicy,
	}); err != nil && !apierrs.IsNotFound(err) {
		return err
	}
	return nil
}

// isTerminalSentinelRunStatus returns true when the given SentinelRunJobStatus is in a terminal state, meaning the job has completed and will not transition to any other state.
func isTerminalSentinelRunStatus(status console.SentinelRunJobStatus) bool {
	return status == console.SentinelRunJobStatusSuccess || status == console.SentinelRunJobStatusFailed
}

// SetupWithManager configures the controller with the manager.
func (r *SentinelRunJobReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).
		For(&v1alpha1.SentinelRunJob{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Owns(&batchv1.Job{}).
		Complete(r)
}
