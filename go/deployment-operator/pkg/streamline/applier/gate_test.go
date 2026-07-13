package applier

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

type recordingGate struct {
	err        error
	conditions []GateCondition
}

func (in *recordingGate) Run(_ context.Context, condition GateCondition, _ unstructured.Unstructured) error {
	in.conditions = append(in.conditions, condition)
	return in.err
}

func (in *recordingGate) Enabled() bool {
	return true
}

func TestWaveProcessorGates(t *testing.T) {
	t.Run("runs injected gates in order", func(t *testing.T) {
		first := &recordingGate{}
		second := &recordingGate{}
		processor := NewWaveProcessor(nil, nil, "", Wave{}, WithWaveGates(first), WithWaveGates(second))

		err := processor.runGates(context.Background(), GateConditionPreApply, unstructured.Unstructured{})

		require.NoError(t, err)
		assert.Equal(t, []GateCondition{GateConditionPreApply}, first.conditions)
		assert.Equal(t, []GateCondition{GateConditionPreApply}, second.conditions)
		assert.Len(t, processor.gates, 2)
	})

	t.Run("stops on gate error", func(t *testing.T) {
		gateErr := errors.New("gate failed")
		first := &recordingGate{}
		second := &recordingGate{err: gateErr}
		third := &recordingGate{}
		processor := NewWaveProcessor(nil, nil, "", Wave{}, WithWaveGates(first, second, third))

		err := processor.runGates(context.Background(), GateConditionPostApply, unstructured.Unstructured{})

		assert.ErrorIs(t, err, gateErr)
		assert.Empty(t, third.conditions)
	})
}
