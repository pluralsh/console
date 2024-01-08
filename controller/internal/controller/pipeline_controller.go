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

	console "github.com/pluralsh/console-client-go"
	consoleclient "github.com/pluralsh/console/controller/internal/client"
	"github.com/pluralsh/console/controller/internal/utils"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	"github.com/pluralsh/console/controller/api/v1alpha1"
)

const (
	PipelineFinalizer = "deployments.plural.sh/pipeline-protection"
)

// PipelineReconciler reconciles a Pipeline object
type PipelineReconciler struct {
	client.Client
	ConsoleClient consoleclient.ConsoleClient
	Scheme        *runtime.Scheme
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

	// Ensure that status updates will always be persisted when exiting this function.
	scope, err := NewPipelineScope(ctx, r.Client, pipeline)
	if err != nil {
		logger.Error(err, "Failed to create pipeline scope")
		utils.MarkCondition(pipeline.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return ctrl.Result{}, err
	}
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	// Handle resource deletion both in Kubernetes cluster and in Console API.
	if result := r.addOrRemoveFinalizer(pipeline); result != nil {
		return *result, nil
	}

	// Calculate SHA to detect changes that should be applied in the Console API.
	sha, err := utils.HashObject(pipeline.Attributes())
	if err != nil {
		utils.MarkCondition(pipeline.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return ctrl.Result{}, err
	}

	// Sync resource with Console API.
	apiPipeline, err := r.sync(ctx, pipeline, sha)
	if err != nil {
		utils.MarkCondition(pipeline.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
		return ctrl.Result{}, err
	}

	// Update resource status.
	pipeline.Status.ID = &apiPipeline.ID
	pipeline.Status.SHA = &sha
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
		// Remove Pipeline from Console API if it exists.
		if r.ConsoleClient.IsPipelineExisting(pipeline.Status.GetID()) {
			if _, err := r.ConsoleClient.DeletePipeline(*pipeline.Status.ID); err != nil {
				// If it fails to delete the external dependency here, return with error
				// so that it can be retried.
				utils.MarkCondition(pipeline.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.ReadyConditionReason, err.Error())
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

func (r *PipelineReconciler) sync(ctx context.Context, pipeline *v1alpha1.Pipeline, sha string) (*console.PipelineFragment, error) {
	exists := r.ConsoleClient.IsPipelineExisting(pipeline.Status.GetID())
	logger := log.FromContext(ctx)

	if exists && !pipeline.Status.IsSHAChanged(sha) {
		logger.V(9).Info(fmt.Sprintf("No changes detected for %s pipeline", pipeline.Name))
		return r.ConsoleClient.GetPipeline(pipeline.Status.GetID())
	}

	if exists {
		logger.Info(fmt.Sprintf("Detected changes, saving %s pipeline", pipeline.Name))
	} else {
		logger.Info(fmt.Sprintf("%s pipeline does not exist, saving it", pipeline.Name))
	}
	return r.ConsoleClient.SavePipeline(pipeline.Name, pipeline.Attributes())
}

// SetupWithManager sets up the controller with the Manager.
func (r *PipelineReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.Pipeline{}).
		Complete(r)
}
