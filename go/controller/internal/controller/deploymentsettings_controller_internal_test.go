package controller

import (
	"testing"

	"github.com/samber/lo"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/runtime"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
)

func TestAgentHelmValuesAttributes(t *testing.T) {
	rawValues := &runtime.RawExtension{Raw: []byte(`{"foo":"bar"}`)}
	template := "annotations:\n  cluster: {{ cluster.handle }}\n"

	tests := []struct {
		name             string
		spec             v1alpha1.DeploymentSettingsSpec
		wantValues       *string
		wantTemplateable *bool
	}{
		{
			name: "no values",
		},
		{
			name:       "raw values keep the templateable flag as given",
			spec:       v1alpha1.DeploymentSettingsSpec{AgentHelmValues: rawValues},
			wantValues: lo.ToPtr("foo: bar\n"),
		},
		{
			name: "raw values with templateable",
			spec: v1alpha1.DeploymentSettingsSpec{
				AgentHelmValues:             rawValues,
				AgentHelmValuesTemplateable: lo.ToPtr(true),
			},
			wantValues:       lo.ToPtr("foo: bar\n"),
			wantTemplateable: lo.ToPtr(true),
		},
		{
			name:             "template is sent verbatim and forces templateable",
			spec:             v1alpha1.DeploymentSettingsSpec{AgentHelmValuesTemplate: lo.ToPtr(template)},
			wantValues:       lo.ToPtr(template),
			wantTemplateable: lo.ToPtr(true),
		},
		{
			name: "template overrides raw values and an explicit templateable false",
			spec: v1alpha1.DeploymentSettingsSpec{
				AgentHelmValues:             rawValues,
				AgentHelmValuesTemplateable: lo.ToPtr(false),
				AgentHelmValuesTemplate:     lo.ToPtr(template),
			},
			wantValues:       lo.ToPtr(template),
			wantTemplateable: lo.ToPtr(true),
		},
		{
			name: "empty template falls back to raw values",
			spec: v1alpha1.DeploymentSettingsSpec{
				AgentHelmValues:         rawValues,
				AgentHelmValuesTemplate: lo.ToPtr(""),
			},
			wantValues: lo.ToPtr("foo: bar\n"),
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			values, templateable, err := agentHelmValuesAttributes(test.spec)
			require.NoError(t, err)
			require.Equal(t, test.wantValues, values)
			require.Equal(t, test.wantTemplateable, templateable)
		})
	}
}
