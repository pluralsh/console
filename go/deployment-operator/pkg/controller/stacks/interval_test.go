package stacks

import (
	"testing"
	"time"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestStackPollIntervalCanBeDisabledByConfiguration(t *testing.T) {
	t.Cleanup(resetAgentConfiguration)
	resetAgentConfiguration()

	require.NoError(t, common.GetConfigurationManager().SetDefaults(v1alpha1.AgentConfigurationSpec{
		StackPollInterval: ptr("30s"),
	}))
	require.NoError(t, common.GetConfigurationManager().SetValue(v1alpha1.AgentConfigurationSpec{
		StackPollInterval: ptr("0s"),
	}))

	reconciler := &StackReconciler{pollInterval: 30 * time.Second}

	assert.Equal(t, time.Duration(0), reconciler.GetPollInterval()())
}

func resetAgentConfiguration() {
	_ = common.GetConfigurationManager().SetDefaults(v1alpha1.AgentConfigurationSpec{})
}

func ptr[T any](v T) *T {
	return &v
}
