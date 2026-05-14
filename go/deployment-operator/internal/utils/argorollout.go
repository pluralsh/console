package utils

import (
	"context"
	"fmt"

	"github.com/argoproj/argo-rollouts/pkg/apis/rollouts/v1alpha1"
	clientset "github.com/argoproj/argo-rollouts/pkg/client/clientset/versioned/typed/rollouts/v1alpha1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
)

const (
	unpausePatch                                = `{"spec":{"paused":false}}`
	clearPauseConditionsPatch                   = `{"status":{"pauseConditions":null}}`
	clearPauseConditionsAndControllerPausePatch = `{"status":{"pauseConditions":null, "controllerPause":false, "currentStepIndex":%d}}`
	unpauseAndClearPauseConditionsPatch         = `{"spec":{"paused":false},"status":{"pauseConditions":null}}`
	clearPauseConditionsPatchWithStep           = `{"status":{"pauseConditions":null, "currentStepIndex":%d}}`
	unpauseAndClearPauseConditionsPatchWithStep = `{"spec":{"paused":false},"status":{"pauseConditions":null, "currentStepIndex":%d}}`
)

// PromoteRollout promotes a rollout to the next step, or to end of all steps
func PromoteRollout(ctx context.Context, rolloutIf clientset.RolloutInterface, name string) (*v1alpha1.Rollout, error) {
	ro, err := rolloutIf.Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}

	specPatch, statusPatch, unifiedPatch := getPatches(ro)
	if statusPatch != nil {
		ro, err = rolloutIf.Patch(ctx, name, types.MergePatchType, statusPatch, metav1.PatchOptions{}, "status")
		if err != nil {
			// NOTE: in the future, we can simply return error here, if we wish to drop support for v0.9
			if !k8serrors.IsNotFound(err) {
				return nil, err
			}
			// we got a NotFound error. status subresource is not being used, so perform unifiedPatch
			specPatch = unifiedPatch
		}
	}
	if specPatch != nil {
		ro, err = rolloutIf.Patch(ctx, name, types.MergePatchType, specPatch, metav1.PatchOptions{})
		if err != nil {
			return nil, err
		}
	}
	return ro, nil
}

func isInconclusive(rollout *v1alpha1.Rollout) bool {
	return rollout.Spec.Strategy.Canary != nil && rollout.Status.Canary.CurrentStepAnalysisRunStatus != nil && rollout.Status.Canary.CurrentStepAnalysisRunStatus.Status == v1alpha1.AnalysisPhaseInconclusive
}

func getPatches(rollout *v1alpha1.Rollout) ([]byte, []byte, []byte) {
	var specPatch, statusPatch, unifiedPatch []byte

	unifiedPatch = []byte(unpauseAndClearPauseConditionsPatch)
	if rollout.Spec.Paused {
		specPatch = []byte(unpausePatch)
	}
	// in case if canary rollout in inconclusive state, we want to unset controller pause , clean pause conditions and increment step index
	// so that rollout can proceed to next step
	// without such patch, rollout will be stuck in inconclusive state in case if next step is pause step
	switch {
	case isInconclusive(rollout) && len(rollout.Status.PauseConditions) > 0 && rollout.Status.ControllerPause:
		_, index := GetCurrentCanaryStep(rollout)
		if index != nil {
			if *index < int32(len(rollout.Spec.Strategy.Canary.Steps)) {
				*index++
			}
			statusPatch = []byte(fmt.Sprintf(clearPauseConditionsAndControllerPausePatch, *index))
		}
	case len(rollout.Status.PauseConditions) > 0:
		statusPatch = []byte(clearPauseConditionsPatch)
	case rollout.Spec.Strategy.Canary != nil:
		_, index := GetCurrentCanaryStep(rollout)
		// At this point, the controller knows that the rollout is a canary with steps and GetCurrentCanaryStep returns 0 if
		// the index is not set in the rollout
		if index != nil {
			if *index < int32(len(rollout.Spec.Strategy.Canary.Steps)) {
				*index++
			}
			statusPatch = []byte(fmt.Sprintf(clearPauseConditionsPatchWithStep, *index))
			unifiedPatch = []byte(fmt.Sprintf(unpauseAndClearPauseConditionsPatchWithStep, *index))
		}
	}
	return specPatch, statusPatch, unifiedPatch
}

// GetCurrentCanaryStep returns the current canary step. If there are no steps or the rollout
// has already executed the last step, the func returns nil
func GetCurrentCanaryStep(rollout *v1alpha1.Rollout) (*v1alpha1.CanaryStep, *int32) {
	if rollout.Spec.Strategy.Canary == nil || len(rollout.Spec.Strategy.Canary.Steps) == 0 {
		return nil, nil
	}
	currentStepIndex := int32(0)
	if rollout.Status.CurrentStepIndex != nil {
		currentStepIndex = *rollout.Status.CurrentStepIndex
	}
	if len(rollout.Spec.Strategy.Canary.Steps) <= int(currentStepIndex) {
		return nil, &currentStepIndex
	}
	return &rollout.Spec.Strategy.Canary.Steps[currentStepIndex], &currentStepIndex
}
