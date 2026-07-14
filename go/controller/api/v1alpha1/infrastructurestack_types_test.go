package v1alpha1

import (
	"testing"

	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestInfrastructureStackSpecValidateRejectsPulumiPolicyEngine(t *testing.T) {
	spec := InfrastructureStackSpec{
		Type: console.StackTypePulumi,
		PolicyEngine: &PolicyEngine{
			Type: console.PolicyEngineTypeTrivy,
		},
	}

	err := spec.Validate()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "policyEngine is not supported for PULUMI stacks")
}

func TestInfrastructureStackSpecValidateAllowsPulumiWithoutPolicyEngine(t *testing.T) {
	spec := InfrastructureStackSpec{
		Type: console.StackTypePulumi,
	}

	require.NoError(t, spec.Validate())
}

func TestInfrastructureStackSpecValidateAllowsTerraformPolicyEngine(t *testing.T) {
	spec := InfrastructureStackSpec{
		Type: console.StackTypeTerraform,
		PolicyEngine: &PolicyEngine{
			Type:        console.PolicyEngineTypeTrivy,
			MaxSeverity: lo.ToPtr(console.VulnSeverityHigh),
		},
	}

	require.NoError(t, spec.Validate())
}
