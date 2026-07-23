package service

import (
	"testing"
	"time"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestServicePollIntervalCannotBeDisabledByConfiguration(t *testing.T) {
	t.Cleanup(resetAgentConfiguration)
	resetAgentConfiguration()

	require.NoError(t, common.GetConfigurationManager().SetDefaults(v1alpha1.AgentConfigurationSpec{
		ServicePollInterval: ptr("2m"),
	}))
	require.NoError(t, common.GetConfigurationManager().SetValue(v1alpha1.AgentConfigurationSpec{
		ServicePollInterval: ptr("0s"),
	}))

	reconciler := &ServiceReconciler{pollInterval: 2 * time.Minute}

	assert.Equal(t, 2*time.Minute, reconciler.GetPollInterval()())
}

func TestServicePollIntervalBelowMinimumFallsBackToDefault(t *testing.T) {
	t.Cleanup(resetAgentConfiguration)
	resetAgentConfiguration()

	require.NoError(t, common.GetConfigurationManager().SetDefaults(v1alpha1.AgentConfigurationSpec{
		ServicePollInterval: ptr("2m"),
	}))
	require.NoError(t, common.GetConfigurationManager().SetValue(v1alpha1.AgentConfigurationSpec{
		ServicePollInterval: ptr("5s"),
	}))

	reconciler := &ServiceReconciler{pollInterval: 2 * time.Minute}

	assert.Equal(t, 2*time.Minute, reconciler.GetPollInterval()())
}

func TestControllerCacheTTLUsesBaseWhenItCoversJitter(t *testing.T) {
	assert.Equal(t, 10*time.Minute, ControllerCacheTTL(10*time.Minute, 2*time.Minute))
}

func TestControllerCacheTTLUsesPollIntervalJitterFloor(t *testing.T) {
	assert.Equal(t, 20*time.Minute+time.Second, ControllerCacheTTL(2*time.Minute, 10*time.Minute))
}

func TestControllerCacheTTLFuncUsesConfiguredPollInterval(t *testing.T) {
	t.Cleanup(resetAgentConfiguration)
	resetAgentConfiguration()

	require.NoError(t, common.GetConfigurationManager().SetDefaults(v1alpha1.AgentConfigurationSpec{
		ServicePollInterval: ptr("2m"),
	}))
	require.NoError(t, common.GetConfigurationManager().SetValue(v1alpha1.AgentConfigurationSpec{
		ServicePollInterval: ptr("10m"),
	}))

	assert.Equal(t, 20*time.Minute+time.Second, ControllerCacheTTLFunc(2*time.Minute, 2*time.Minute)())
}

func resetAgentConfiguration() {
	_ = common.GetConfigurationManager().SetDefaults(v1alpha1.AgentConfigurationSpec{})
}

func ptr[T any](v T) *T {
	return &v
}
