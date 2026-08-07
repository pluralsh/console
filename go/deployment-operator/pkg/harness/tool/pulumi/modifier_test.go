package pulumi

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestUpArgsModifierUsesSavedPlan(t *testing.T) {
	modifier := &UpArgsModifier{
		planFile:  "pulumi.plan",
		stackName: "dev",
	}

	assert.Equal(t,
		[]string{"pulumi", "up", "--stack", "dev", "--plan", "pulumi.plan", "--yes", "--non-interactive"},
		modifier.Args([]string{"pulumi", "up"}),
	)
}

func TestUpArgsModifierPreservesProvidedPlan(t *testing.T) {
	modifier := &UpArgsModifier{
		planFile: "pulumi.plan",
	}

	assert.Equal(t,
		[]string{"pulumi", "up", "--plan", "custom.plan", "--yes", "--non-interactive"},
		modifier.Args([]string{"pulumi", "up", "--plan", "custom.plan"}),
	)
}
