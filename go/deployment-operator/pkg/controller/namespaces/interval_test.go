package namespaces

import (
	"testing"
	"time"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestManagedNamespacePollIntervalDefaultsToDisabled(t *testing.T) {
	t.Cleanup(resetAgentConfiguration)
	resetAgentConfiguration()

	require.NoError(t, common.GetConfigurationManager().SetDefaults(v1alpha1.AgentConfigurationSpec{
		ManagedNamespacePollInterval: ptr("0s"),
	}))

	reconciler := &NamespaceReconciler{pollInterval: 2 * time.Minute}

	assert.Equal(t, time.Duration(0), reconciler.GetPollInterval()())
}

func TestManagedNamespacePollIntervalUsesConfiguration(t *testing.T) {
	t.Cleanup(resetAgentConfiguration)
	resetAgentConfiguration()

	require.NoError(t, common.GetConfigurationManager().SetDefaults(v1alpha1.AgentConfigurationSpec{
		ManagedNamespacePollInterval: ptr("0s"),
	}))
	require.NoError(t, common.GetConfigurationManager().SetValue(v1alpha1.AgentConfigurationSpec{
		ManagedNamespacePollInterval: ptr("10m"),
	}))

	reconciler := &NamespaceReconciler{pollInterval: 2 * time.Minute}

	assert.Equal(t, 10*time.Minute, reconciler.GetPollInterval()())
}

func resetAgentConfiguration() {
	_ = common.GetConfigurationManager().SetDefaults(v1alpha1.AgentConfigurationSpec{})
}

func ptr[T any](v T) *T {
	return &v
}
