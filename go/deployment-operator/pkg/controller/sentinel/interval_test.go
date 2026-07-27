package sentinel

import (
	"testing"
	"time"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSentinelPollIntervalCanBeDisabledByConfiguration(t *testing.T) {
	t.Cleanup(resetAgentConfiguration)
	resetAgentConfiguration()

	require.NoError(t, common.GetConfigurationManager().SetDefaults(v1alpha1.AgentConfigurationSpec{
		SentinelPollInterval: ptr("30s"),
	}))
	require.NoError(t, common.GetConfigurationManager().SetValue(v1alpha1.AgentConfigurationSpec{
		SentinelPollInterval: ptr("0s"),
	}))

	reconciler := &SentinelReconciler{pollInterval: 30 * time.Second}

	assert.Equal(t, time.Duration(0), reconciler.GetPollInterval()())
}

func TestPollJitterWindowUsesConfiguredSentinelPollInterval(t *testing.T) {
	t.Cleanup(resetAgentConfiguration)
	resetAgentConfiguration()

	require.NoError(t, common.GetConfigurationManager().SetDefaults(v1alpha1.AgentConfigurationSpec{
		SentinelPollInterval: ptr("30s"),
	}))
	require.NoError(t, common.GetConfigurationManager().SetValue(v1alpha1.AgentConfigurationSpec{
		SentinelPollInterval: ptr("10m"),
	}))

	reconciler := &SentinelReconciler{pollInterval: 30 * time.Second}

	assert.Equal(t, 5*time.Minute, reconciler.pollJitterWindow())
}

func TestPollJitterWindowUsesFallbackWhenSentinelPollingDisabled(t *testing.T) {
	t.Cleanup(resetAgentConfiguration)
	resetAgentConfiguration()

	require.NoError(t, common.GetConfigurationManager().SetDefaults(v1alpha1.AgentConfigurationSpec{
		SentinelPollInterval: ptr("30s"),
	}))
	require.NoError(t, common.GetConfigurationManager().SetValue(v1alpha1.AgentConfigurationSpec{
		SentinelPollInterval: ptr("0s"),
	}))

	reconciler := &SentinelReconciler{pollInterval: 30 * time.Second}

	assert.Equal(t, 15*time.Second, reconciler.pollJitterWindow())
}

func TestControllerCacheTTLFuncUsesConfiguredSentinelPollInterval(t *testing.T) {
	t.Cleanup(resetAgentConfiguration)
	resetAgentConfiguration()

	require.NoError(t, common.GetConfigurationManager().SetDefaults(v1alpha1.AgentConfigurationSpec{
		SentinelPollInterval: ptr("30s"),
	}))
	require.NoError(t, common.GetConfigurationManager().SetValue(v1alpha1.AgentConfigurationSpec{
		SentinelPollInterval: ptr("10m"),
	}))

	assert.Equal(t, 20*time.Minute+time.Second, ControllerCacheTTLFunc(2*time.Minute, 30*time.Second)())
}

func resetAgentConfiguration() {
	_ = common.GetConfigurationManager().SetDefaults(v1alpha1.AgentConfigurationSpec{})
}

func ptr[T any](v T) *T {
	return &v
}
