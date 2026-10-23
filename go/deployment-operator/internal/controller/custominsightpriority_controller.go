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
	"strings"

	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/tools/events"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/handler"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
	"sigs.k8s.io/controller-runtime/pkg/source"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/internal/utils"
	"github.com/pluralsh/console/go/deployment-operator/pkg/insightpriority"
)

// CustomInsightPriorityReconciler registers the scripts that decide the priority of failing objects in the cluster
// insights, and reports how they are doing. The scripts run when the cluster is pinged, not here.
type CustomInsightPriorityReconciler struct {
	client.Client
	Scheme   *runtime.Scheme
	Registry *insightpriority.Registry
	Recorder events.EventRecorder
}

//+kubebuilder:rbac:groups=deployments.plural.sh,resources=custominsightpriorities,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=custominsightpriorities/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=deployments.plural.sh,resources=custominsightpriorities/finalizers,verbs=update
//+kubebuilder:rbac:groups="",resources=events,verbs=create;patch

// Reconcile compiles the script and registers it when it is valid, then copies the result of its last evaluation to the status.
func (r *CustomInsightPriorityReconciler) Reconcile(ctx context.Context, req ctrl.Request) (_ reconcile.Result, reterr error) {
	logger := log.FromContext(ctx)

	cr := &v1alpha1.CustomInsightPriority{}
	if err := r.Get(ctx, req.NamespacedName, cr); err != nil {
		if client.IgnoreNotFound(err) == nil {
			r.Registry.Remove(req.NamespacedName)
			return ctrl.Result{}, nil
		}

		logger.Error(err, "Unable to fetch CustomInsightPriority")
		return ctrl.Result{}, err
	}

	scope, err := NewDefaultScope(ctx, r.Client, cr)
	if err != nil {
		logger.Error(err, "Failed to create scope")
		return ctrl.Result{}, err
	}
	defer func() {
		if err := scope.PatchObject(); err != nil && reterr == nil {
			reterr = err
		}
	}()

	script, err := r.compile(ctx, cr)
	if err != nil {
		// A script that does not compile is never evaluated, so its objects keep their built-in priority.
		r.Registry.Remove(req.NamespacedName)
		cr.Status.LastEvaluation = nil
		cr.Status.LastError = ""
		cr.RemoveCondition(v1alpha1.OverlappingConditionType)
		utils.MarkCondition(cr.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.InvalidScriptConditionReason, err.Error())
		return ctrl.Result{}, nil
	}

	r.Registry.Set(script)
	r.syncStatus(cr)
	return ctrl.Result{}, nil
}

func (r *CustomInsightPriorityReconciler) compile(ctx context.Context, cr *v1alpha1.CustomInsightPriority) (insightpriority.Script, error) {
	if engine := cr.Spec.Engine; engine != "" && engine != v1alpha1.InsightEnginePython {
		return insightpriority.Script{}, fmt.Errorf("unsupported engine %q, only %q is available", engine, v1alpha1.InsightEnginePython)
	}

	script, err := insightpriority.NewScript(cr)
	if err != nil {
		return insightpriority.Script{}, err
	}

	if err := insightpriority.Compile(ctx, cr.Spec.Script); err != nil {
		return insightpriority.Script{}, err
	}

	return script, nil
}

// syncStatus reflects the last evaluation of the script in the status.
func (r *CustomInsightPriorityReconciler) syncStatus(cr *v1alpha1.CustomInsightPriority) {
	key := client.ObjectKeyFromObject(cr)
	result, evaluated := r.Registry.Result(key)
	if !evaluated {
		cr.Status.LastEvaluation = nil
		cr.Status.LastError = ""
		cr.RemoveCondition(v1alpha1.OverlappingConditionType)
		utils.MarkCondition(cr.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
		return
	}

	cr.Status.LastEvaluation = &v1alpha1.InsightEvaluation{
		Time:       v1.NewTime(result.Time),
		Matched:    result.Matched,
		Overridden: result.Overridden,
		Ignored:    result.Ignored,
		DurationMs: result.Duration.Milliseconds(),
	}

	if result.Err != "" {
		if cr.Status.LastError != result.Err {
			r.Recorder.Eventf(cr, nil, "Warning", string(v1alpha1.EvaluationFailedConditionReason), "Evaluate", "%s", result.Err)
		}
		cr.Status.LastError = result.Err
		utils.MarkCondition(cr.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionFalse, v1alpha1.EvaluationFailedConditionReason, result.Err)
	} else {
		cr.Status.LastError = ""
		utils.MarkCondition(cr.SetCondition, v1alpha1.ReadyConditionType, v1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	}

	if len(result.LostTo) > 0 {
		winners := make([]string, 0, len(result.LostTo))
		for _, winner := range result.LostTo {
			winners = append(winners, winner.String())
		}
		utils.MarkCondition(cr.SetCondition, v1alpha1.OverlappingConditionType, v1.ConditionTrue, v1alpha1.OverlapConditionReason,
			"some objects are owned by a script with a higher precedence: "+strings.Join(winners, ", "))
	} else {
		cr.RemoveCondition(v1alpha1.OverlappingConditionType)
	}
}

// SetupWithManager sets up the controller with the Manager.
func (r *CustomInsightPriorityReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1alpha1.CustomInsightPriority{}).
		WatchesRawSource(source.Channel(r.Registry.Events(), &handler.EnqueueRequestForObject{})).
		Complete(r)
}
