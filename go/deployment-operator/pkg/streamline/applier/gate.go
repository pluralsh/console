package applier

import (
	"context"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

type GateCondition string

const (
	// GateConditionPreApply runs before resolving the apply client and applying the resource.
	GateConditionPreApply GateCondition = "pre-apply"
	// GateConditionPostApply runs after a resource is successfully applied to the cluster.
	GateConditionPostApply GateCondition = "post-apply"
)

// Gate adds conditional resource processing to a wave without coupling WaveProcessor to a concrete gate.
// Implementations must be safe for concurrent Run calls within a wave.
type Gate interface {
	Run(ctx context.Context, condition GateCondition, resource unstructured.Unstructured) error
	Enabled() bool
}
