/*
Copyright 2021.

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

	"github.com/go-logr/logr"
	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/polly/cache"

	"github.com/samber/lo"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	apierrs "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	runtimeclient "sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"

	"github.com/pluralsh/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/deployment-operator/internal/utils"
	consoleclient "github.com/pluralsh/deployment-operator/pkg/client"
)

// PipelineGateReconciler reconciles a PipelineGate object
type PipelineGateReconciler struct {
	runtimeclient.Client
	ConsoleClient consoleclient.Client
	Scheme        *runtime.Scheme
	GateCache     *cache.Cache[console.PipelineGateFragment]
}

//+kubebuilder:rbac:groups=deployments.plural.sh,resources=pipelinegates,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=pipelinegates/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=pipelinegates/finalizers,verbs=update
//+kubebuilder:rbac:groups=batch,resources=jobs,verbs=get;list;watch;create;update;patch;delete;deletecollection

func (r *PipelineGateReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ ctrl.Result, reterr error) {
	log := log.FromContext(ctx).WithValues("PipelineGate", req.NamespacedName)

	crGate := &v1alpha1.PipelineGate{}
	if err := r.Get(ctx, req.NamespacedName, crGate); err != nil {
		if apierrs.IsNotFound(err) {
			log.V(1).Info("PipelineGate CR not found - skipping.", "Namespace", crGate.Namespace, "Name", crGate.Name)
			return ctrl.Result{}, nil
		}
		log.Error(err, "Unable to fetch PipelineGate.")
		return ctrl.Result{}, err
	}
	if !crGate.DeletionTimestamp.IsZero() {
		return ctrl.Result{}, nil
	}

	cachedGate, err := r.GateCache.Get(crGate.Spec.ID)
	if err != nil {
		log.Info("Unable to fetch PipelineGate from cache, this gate probably doesn't exist in the console.")
		if err := r.cleanUpGate(ctx, crGate); err != nil {
			return ctrl.Result{}, err
		}
		return ctrl.Result{}, nil
	}

	scope, err := NewDefaultScope(ctx, r.Client, crGate)
	if err != nil {
		return ctrl.Result{}, err
	}
	defer func() {
		if err := r.updateConsoleGate(crGate); err != nil {
			reterr = err
			return
		}

		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
			return
		}
	}()

	// INITIAL STATE
	if !crGate.Status.IsInitialized() {
		crGate.Status.SetState(console.GateStatePending)
		log.V(1).Info("Updated state of CR on first reconcile.", "Namespace", crGate.Namespace, "Name", crGate.Name, "ID", crGate.Spec.ID)
		return ctrl.Result{}, nil
	}

	// PENDING
	if crGate.Status.IsPending() || crGate.Status.IsRunning() {
		return r.reconcilePendingRunningGate(ctx, crGate, cachedGate)
	}

	// RERUN
	if (crGate.Status.IsOpen() || crGate.Status.IsClosed()) && crGate.Status.HasJobRef() && consoleclient.IsPending(cachedGate) {
		crGate.Status.SetState(console.GateStatePending)
		if err := r.killJob(ctx, genJobObjectMeta(crGate)); err != nil {
			return ctrl.Result{}, err
		}
		crGate.Status.JobRef = nil
		return ctrl.Result{}, nil
	}

	return jitterRequeue(requeueAfter, jitter), nil
}

func (r *PipelineGateReconciler) cleanUpGate(ctx context.Context, crGate *v1alpha1.PipelineGate) error {
	if err := r.killJob(ctx, genJobObjectMeta(crGate)); err != nil {
		return err
	}
	if err := r.Delete(ctx, crGate); err != nil {
		if !apierrs.IsNotFound(err) {
			return err
		}
	}
	return nil
}

func (r *PipelineGateReconciler) killJob(ctx context.Context, job *batchv1.Job) error {
	log := log.FromContext(ctx)
	deletePolicy := metav1.DeletePropagationBackground // kill the job and its pods asap
	if err := r.Delete(ctx, job, &runtimeclient.DeleteOptions{
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

func (r *PipelineGateReconciler) reconcilePendingRunningGate(ctx context.Context, gate *v1alpha1.PipelineGate, cachedGate *console.PipelineGateFragment) (ctrl.Result, error) {
	log := log.FromContext(ctx)
	log.V(2).Info(fmt.Sprintf("Reconciling %s gate.", gate.Status.GetConsoleGateState().String()), "Name", gate.Name, "ID", gate.Spec.ID)
	jobSpec := consoleclient.JobSpecFromJobSpecFragment(cachedGate.Name, cachedGate.Spec.Job)
	jobRef := gate.CreateNewJobRef()
	job := generateJob(*jobSpec, jobRef)

	gate.Spec.GateSpec.JobSpec = lo.ToPtr(job.Spec)
	// create or get existing job
	reconciledJob, err := Job(ctx, r.Client, job, log)
	if err != nil {
		log.Error(err, "Error reconciling Job.", "JobName", job.Name, "JobNamespace", job.Namespace)
		return ctrl.Result{}, err
	}
	gate.Status.SetState(console.GateStateRunning)

	if !gate.Status.HasJobRef() {
		log.V(2).Info("Gate doesn't have a JobRef, this is a new gate or a re-run.", "Name", gate.Name, "ID", gate.Spec.ID, "State", *gate.Status.State)

		if err := utils.TryAddControllerRef(ctx, r.Client, gate, job, r.Scheme); err != nil {
			log.Error(err, "Error setting ControllerReference for Job.")
			return ctrl.Result{}, err
		}
		gate.Status.JobRef = lo.ToPtr(jobRef)
		return ctrl.Result{}, nil
	}

	// ABORT:
	if consoleclient.IsClosed(cachedGate) {
		// I don't think a guarantee for aborting a job is possible, unless we change the console api to allow for it
		// try to kill the job
		if err := r.killJob(ctx, job); err != nil {
			return ctrl.Result{}, err
		}
		// even if the killing of the job fails, we better update the gate status to closed asap, so we don't report a gate CR transition from pending to closed
		gate.Status.SetState(console.GateStateClosed)
		gate.Status.JobRef = nil
		log.V(1).Info("Job aborted.", "JobName", job.Name, "JobNamespace", job.Namespace)
		return jitterRequeue(requeueAfter, jitter), nil
	}

	// check job status
	if hasFailed(reconciledJob) {
		// if the job is failed, then we need to update the gate state to closed, unless it's a rerun
		log.V(2).Info("Job failed.", "JobName", job.Name, "JobNamespace", job.Namespace)
		gate.Status.SetState(console.GateStateClosed)
		return jitterRequeue(requeueAfter, jitter), nil
	}
	if hasSucceeded(reconciledJob) {
		// if the job is complete, then we need to update the gate state to open, unless it's a rerun
		log.V(1).Info("Job succeeded.", "JobName", job.Name, "JobNamespace", job.Namespace)
		gate.Status.SetState(console.GateStateOpen)
		return jitterRequeue(requeueAfter, jitter), nil
	}

	if err := r.updateJob(ctx, reconciledJob, job); err != nil {
		return ctrl.Result{}, err
	}

	return jitterRequeue(requeueAfter, jitter), nil
}

func (r *PipelineGateReconciler) updateJob(ctx context.Context, reconciledJob *batchv1.Job, newJob *batchv1.Job) error {
	reconciledJob.Spec.Template.Spec.Containers = newJob.Spec.Template.Spec.Containers
	if reconciledJob.Spec.Template.Labels == nil {
		reconciledJob.Spec.Template.Labels = map[string]string{}
	}
	if reconciledJob.Spec.Template.Annotations == nil {
		reconciledJob.Spec.Template.Annotations = map[string]string{}
	}
	for k, v := range newJob.Spec.Template.Labels {
		reconciledJob.Spec.Template.Labels[k] = v
	}
	for k, v := range newJob.Spec.Template.Annotations {
		reconciledJob.Spec.Template.Annotations[k] = v
	}

	jobScope, err := NewDefaultScope(ctx, r.Client, reconciledJob)
	if err != nil {
		return err
	}
	if err := jobScope.PatchObject(); err != nil {
		return err
	}
	return nil
}

func (r *PipelineGateReconciler) updateConsoleGate(gate *v1alpha1.PipelineGate) error {
	sha, err := utils.HashObject(gate.Status.GateUpdateAttributes())
	if err != nil {
		return err
	}

	if gate.Status.IsSHAEqual(sha) {
		return nil
	}

	gate.Status.SHA = &sha
	if err := r.ConsoleClient.UpdateGate(gate.Spec.ID, gate.Status.GateUpdateAttributes()); err != nil {
		return err
	}
	if _, err := r.GateCache.Set(gate.Spec.ID); err != nil {
		return err
	}
	return nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *PipelineGateReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.PipelineGate{}).
		Complete(r)
}

// IsJobStatusConditionTrue returns true when the conditionType is present and set to `metav1.ConditionTrue`
func IsJobStatusConditionTrue(conditions []batchv1.JobCondition, conditionType batchv1.JobConditionType) bool {
	return IsJobStatusConditionPresentAndEqual(conditions, conditionType, corev1.ConditionTrue)
}

// IsJobStatusConditionPresentAndEqual returns true when conditionType is present and equal to status.
func IsJobStatusConditionPresentAndEqual(conditions []batchv1.JobCondition, conditionType batchv1.JobConditionType, status corev1.ConditionStatus) bool {
	for _, condition := range conditions {
		if condition.Type == conditionType {
			return condition.Status == status
		}
	}
	return false
}

func hasFailed(job *batchv1.Job) bool {
	return IsJobStatusConditionTrue(job.Status.Conditions, batchv1.JobFailed)
}

func hasSucceeded(job *batchv1.Job) bool {
	return IsJobStatusConditionTrue(job.Status.Conditions, batchv1.JobComplete)
}

// Job reconciles a k8s job object.
func Job(ctx context.Context, r runtimeclient.Client, job *batchv1.Job, log logr.Logger) (*batchv1.Job, error) {
	foundJob := &batchv1.Job{}
	if err := r.Get(ctx, types.NamespacedName{Name: job.Name, Namespace: job.Namespace}, foundJob); err != nil {
		if !apierrs.IsNotFound(err) {
			return nil, err
		}
		log.V(2).Info("Creating Job.", "Namespace", job.Namespace, "Name", job.Name)
		if err := r.Create(ctx, job); err != nil {
			log.Error(err, "Unable to create Job.")
			return nil, err
		}
		return job, nil
	}
	return foundJob, nil
}

func generateJob(jobSpec batchv1.JobSpec, jobRef console.NamespacedName) *batchv1.Job {
	return &batchv1.Job{
		ObjectMeta: metav1.ObjectMeta{
			Name:      jobRef.Name,
			Namespace: jobRef.Namespace,
		},
		Spec: jobSpec,
	}
}

func genJobObjectMeta(gate *v1alpha1.PipelineGate) *batchv1.Job {
	return &batchv1.Job{
		ObjectMeta: metav1.ObjectMeta{
			Name:      gate.Status.JobRef.Name,
			Namespace: gate.Status.JobRef.Namespace,
		},
	}
}
