package main

import (
	"context"
	"testing"
	"time"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func TestLoadAgentConfigurationUsesDefaultsWhenMissing(t *testing.T) {
	t.Cleanup(resetAgentConfiguration)
	resetAgentConfiguration()

	defaults := agentConfigurationDefaults()
	reader := fake.NewClientBuilder().WithScheme(agentConfigurationScheme(t)).Build()

	require.NoError(t, loadAgentConfiguration(context.Background(), reader, defaults))

	assertDuration(t, 2*time.Minute, common.GetConfigurationManager().GetServicePollInterval())
	assertDuration(t, 0, common.GetConfigurationManager().GetManagedNamespacePollInterval())
	assertDuration(t, 2*time.Minute, common.GetConfigurationManager().GetClusterPingInterval())
	assertDuration(t, 3*time.Minute, common.GetConfigurationManager().GetRuntimeServicesPingInterval())
	assertDuration(t, 30*time.Second, common.GetConfigurationManager().GetStackPollInterval())
	assertDuration(t, 3*time.Minute, common.GetConfigurationManager().GetSentinelPollInterval())
	assertDuration(t, 0, common.GetConfigurationManager().GetPipelineGateInterval())
	assert.False(t, common.GetConfigurationManager().IsWebsocketDisabled())
}

func TestLoadAgentConfigurationOverlaysDefaultResource(t *testing.T) {
	t.Cleanup(resetAgentConfiguration)
	resetAgentConfiguration()

	disableWebsocket := true
	reader := fake.NewClientBuilder().
		WithScheme(agentConfigurationScheme(t)).
		WithObjects(&v1alpha1.AgentConfiguration{
			ObjectMeta: metav1.ObjectMeta{Name: "default"},
			Spec: v1alpha1.AgentConfigurationSpec{
				ClusterPingInterval:          ptr("15m"),
				CompatibilityUploadInterval:  ptr("30m"),
				DisableWebsocket:             &disableWebsocket,
				PipelineGateInterval:         ptr("0s"),
				ServicePollInterval:          ptr("10m"),
				ManagedNamespacePollInterval: ptr("15m"),
				SentinelPollInterval:         ptr("5m"),
				StackPollInterval:            ptr("0s"),
			},
		}).
		Build()

	require.NoError(t, loadAgentConfiguration(context.Background(), reader, agentConfigurationDefaults()))

	assertDuration(t, 10*time.Minute, common.GetConfigurationManager().GetServicePollInterval())
	assertDuration(t, 15*time.Minute, common.GetConfigurationManager().GetManagedNamespacePollInterval())
	assertDuration(t, 15*time.Minute, common.GetConfigurationManager().GetClusterPingInterval())
	assertDuration(t, 30*time.Minute, common.GetConfigurationManager().GetRuntimeServicesPingInterval())
	assertDuration(t, 0, common.GetConfigurationManager().GetStackPollInterval())
	assertDuration(t, 5*time.Minute, common.GetConfigurationManager().GetSentinelPollInterval())
	assertDuration(t, 0, common.GetConfigurationManager().GetPipelineGateInterval())
	assert.True(t, common.GetConfigurationManager().IsWebsocketDisabled())

	require.NoError(t, common.GetConfigurationManager().SetValue(v1alpha1.AgentConfigurationSpec{}))
	assertDuration(t, 2*time.Minute, common.GetConfigurationManager().GetServicePollInterval())
	assertDuration(t, 0, common.GetConfigurationManager().GetManagedNamespacePollInterval())
	assertDuration(t, 2*time.Minute, common.GetConfigurationManager().GetClusterPingInterval())
	assertDuration(t, 3*time.Minute, common.GetConfigurationManager().GetRuntimeServicesPingInterval())
	assertDuration(t, 30*time.Second, common.GetConfigurationManager().GetStackPollInterval())
	assertDuration(t, 3*time.Minute, common.GetConfigurationManager().GetSentinelPollInterval())
	assertDuration(t, 0, common.GetConfigurationManager().GetPipelineGateInterval())
	assert.False(t, common.GetConfigurationManager().IsWebsocketDisabled())
}

func TestLoadAgentConfigurationReturnsInvalidDurationError(t *testing.T) {
	t.Cleanup(resetAgentConfiguration)
	resetAgentConfiguration()

	reader := fake.NewClientBuilder().
		WithScheme(agentConfigurationScheme(t)).
		WithObjects(&v1alpha1.AgentConfiguration{
			ObjectMeta: metav1.ObjectMeta{Name: "default"},
			Spec: v1alpha1.AgentConfigurationSpec{
				ClusterPingInterval: ptr("not-a-duration"),
			},
		}).
		Build()

	require.Error(t, loadAgentConfiguration(context.Background(), reader, agentConfigurationDefaults()))
}

func agentConfigurationDefaults() v1alpha1.AgentConfigurationSpec {
	disableWebsocket := false

	return v1alpha1.AgentConfigurationSpec{
		ServicePollInterval:          ptr("2m"),
		ManagedNamespacePollInterval: ptr("0s"),
		ClusterPingInterval:          ptr("2m"),
		CompatibilityUploadInterval:  ptr("3m"),
		StackPollInterval:            ptr("30s"),
		SentinelPollInterval:         ptr("3m"),
		PipelineGateInterval:         ptr("0s"),
		DisableWebsocket:             &disableWebsocket,
	}
}

func agentConfigurationScheme(t *testing.T) *runtime.Scheme {
	t.Helper()

	scheme := runtime.NewScheme()
	require.NoError(t, v1alpha1.AddToScheme(scheme))
	return scheme
}

func assertDuration(t *testing.T, expected time.Duration, actual *time.Duration) {
	t.Helper()

	require.NotNil(t, actual)
	assert.Equal(t, expected, *actual)
}

func resetAgentConfiguration() {
	_ = common.GetConfigurationManager().SetDefaults(v1alpha1.AgentConfigurationSpec{})
}

func ptr[T any](v T) *T {
	return &v
}
