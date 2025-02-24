/*
Copyright 2023.

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

	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/cache"
	consoleclient "github.com/pluralsh/console/go/controller/internal/client"
	"github.com/pluralsh/console/go/controller/internal/credentials"
	"github.com/pluralsh/console/go/controller/internal/utils"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
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
	PipelineFinalizer = "deployments.plural.sh/pipeline-protection"
)

// PipelineReconciler reconciles a Pipeline object
type PipelineReconciler struct {
	client.Client
	ConsoleClient    consoleclient.ConsoleClient
	Scheme           *runtime.Scheme
	CredentialsCache credentials.NamespaceCredentialsCache
	UserGroupCache   cache.UserGroupCache
}

//+kubebuilder:rbac:groups=deployments.plural.sh,resources=pipelines,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=pipelines/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=pipelines/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
func (r *PipelineReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ reconcile.Result, reterr error) {
	logger := log.FromContext(ctx)

	// Read resource from Kubernetes cluster.
	pipeline := &v1alpha1.Pipeline{}
	if err := r.Get(ctx, req.NamespacedName, pipeline); err != nil {
		logger.Error(err, "Unable to fetch pipeline")
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	utils.MarkCondition(pipeline.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, "")
	// Ensure that status updates will always be persisted when exiting this function.
	scope, err := NewDefaultScope(ctx, r.Client, pipeline)
	if err != nil {
		logger.Error(err, "Failed to create pipeline scope")
		utils.MarkCondition(pipeline.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	// Switch to namespace credentials if configured. This has to be done before sending any request to the console.
	nc, err := r.ConsoleClient.UseCredentials(req.Namespace, r.CredentialsCache)
	credentials.SyncCredentialsInfo(pipeline, pipeline.SetCondition, nc, err)
	if err != nil {
		logger.Error(err, "failed to use namespace credentials", "namespaceCredentials", nc, "namespacedName", req.NamespacedName)
		utils.MarkCondition(pipeline.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, fmt.Sprintf("failed to use %s namespace credentials: %s", nc, err.Error()))
		return ctrl.Result{}, err
	}

	// Handle resource deletion both in Kubernetes cluster and in Console API.
	if result := r.addOrRemoveFinalizer(pipeline); result != nil {
		return *result, nil
	}

	project := &v1alpha1.Project{}
	if pipeline.HasProjectRef() {
		if err := r.Get(ctx, client.ObjectKey{Name: pipeline.ProjectName()}, project); err != nil {
			utils.MarkCondition(pipeline.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
			return requeue, err
		}

		if !project.Status.HasID() {
			utils.MarkCondition(pipeline.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReason, "project is not ready")
			return waitForResources, nil
		}

		if err := controllerutil.SetOwnerReference(project, pipeline, r.Scheme); err != nil {
			return requeue, fmt.Errorf("could not set pipeline owner reference, got error: %+v", err)
		}
	}

	// Prepare attributes object that is used to calculate SHA and save changes.
	attrs, res, err := r.pipelineAttributes(ctx, pipeline, project.Status.ID)
	if res != nil || err != nil {
		return handleRequeue(res, err, pipeline.SetCondition)
	}

	// Calculate SHA to detect changes that should be applied in the Console API.
	sha, err := utils.HashObject(*attrs)
	if err != nil {
		utils.MarkCondition(pipeline.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Sync resource with Console API.
	apiPipeline, err := r.sync(ctx, pipeline, *attrs, sha)
	if err != nil {
		utils.MarkCondition(pipeline.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
		return ctrl.Result{}, err
	}

	// Update resource status.
	pipeline.Status.ID = &apiPipeline.ID
	pipeline.Status.SHA = &sha
	utils.MarkCondition(pipeline.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionTrue, v1alpha1.SynchronizedConditionReason, "")
	utils.MarkCondition(pipeline.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	return requeue, nil
}

func (r *PipelineReconciler) addOrRemoveFinalizer(pipeline *v1alpha1.Pipeline) *ctrl.Result {
	/// If object is not being deleted and if it does not have our finalizer,
	// then lets add the finalizer. This is equivalent to registering our finalizer.
	if pipeline.ObjectMeta.DeletionTimestamp.IsZero() && !controllerutil.ContainsFinalizer(pipeline, PipelineFinalizer) {
		controllerutil.AddFinalizer(pipeline, PipelineFinalizer)
	}

	// If object is being deleted cleanup and remove the finalizer.
	if !pipeline.ObjectMeta.DeletionTimestamp.IsZero() {
		exists, err := r.ConsoleClient.IsPipelineExisting(pipeline.Status.GetID())
		if err != nil {
			return &requeue
		}

		// Remove Pipeline from Console API if it exists.
		if exists {
			if _, err := r.ConsoleClient.DeletePipeline(*pipeline.Status.ID); err != nil {
				// If it fails to delete the external dependency here, return with error
				// so that it can be retried.
				utils.MarkCondition(pipeline.SetCondition, v1alpha1.SynchronizedConditionType, v1.ConditionFalse, v1alpha1.SynchronizedConditionReasonError, err.Error())
				return &ctrl.Result{}
			}

			// If deletion process started requeue so that we can make sure provider
			// has been deleted from Console API before removing the finalizer.
			return &requeue
		}

		// If our finalizer is present, remove it.
		controllerutil.RemoveFinalizer(pipeline, PipelineFinalizer)

		// Stop reconciliation as the item is being deleted.
		return &ctrl.Result{}
	}

	return nil
}

func (r *PipelineReconciler) sync(ctx context.Context, pipeline *v1alpha1.Pipeline, attrs console.PipelineAttributes, sha string) (*console.PipelineFragmentMinimal, error) {
	logger := log.FromContext(ctx)
	exists, err := r.ConsoleClient.IsPipelineExisting(pipeline.Status.GetID())
	if err != nil {
		return nil, err
	}

	if exists && pipeline.Status.IsSHAEqual(sha) {
		logger.V(9).Info("no changes detected for pipeline", "name", pipeline.Name, "id", pipeline.Status.GetID())
		return r.ConsoleClient.GetPipeline(pipeline.Status.GetID())
	}

	if exists {
		logger.V(9).Info("detected changes, saving pipeline", "name", pipeline.Name, "id", pipeline.Status.GetID())
	} else {
		logger.V(9).Info("pipeline does not exist, saving it", "name", pipeline.Name)
	}
	return r.ConsoleClient.SavePipeline(pipeline.Name, attrs)
}

// SetupWithManager sets up the controller with the Manager.
func (r *PipelineReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(controller.Options{MaxConcurrentReconciles: 1}).                                                      // Requirement for credentials implementation.
		Watches(&v1alpha1.NamespaceCredentials{}, credentials.OnCredentialsChange(r.Client, new(v1alpha1.PipelineList))). // Reconcile objects on credentials change.
		For(&v1alpha1.Pipeline{}, builder.WithPredicates(predicate.GenerationChangedPredicate{})).
		Complete(r)
}
