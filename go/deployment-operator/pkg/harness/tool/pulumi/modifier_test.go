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
		[]string{"pulumi", "up", "--stack", "dev", "--plan", "pulumi.plan", "--yes", "--non-interactive", "--color=always"},
		modifier.Args([]string{"pulumi", "up"}),
	)
}

func TestUpArgsModifierPreservesProvidedPlan(t *testing.T) {
	modifier := &UpArgsModifier{
		planFile: "pulumi.plan",
	}

	assert.Equal(t,
		[]string{"pulumi", "up", "--plan", "custom.plan", "--yes", "--non-interactive", "--color=always"},
		modifier.Args([]string{"pulumi", "up", "--plan", "custom.plan"}),
	)
}

func TestPreviewArgsModifierForcesColor(t *testing.T) {
	modifier := &PreviewArgsModifier{
		planFile:  "pulumi.plan",
		stackName: "dev",
	}

	assert.Equal(t,
		[]string{"pulumi", "preview", "--stack", "dev", "--save-plan", "pulumi.plan", "--non-interactive", "--color=always"},
		modifier.Args([]string{"pulumi", "preview"}),
	)
}

func TestAppendColorPreservesExplicitColor(t *testing.T) {
	assert.Equal(t,
		[]string{"pulumi", "up", "--color=never"},
		appendColor([]string{"pulumi", "up", "--color=never"}),
	)
}
