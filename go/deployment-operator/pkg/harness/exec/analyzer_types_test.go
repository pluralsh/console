package exec

import (
	"testing"

	console "github.com/pluralsh/console/go/client"
	"github.com/stretchr/testify/assert"
)

func TestStderrCheckForProvider(t *testing.T) {
	t.Run("terraform enables stderr checking", func(t *testing.T) {
		cfg := analyzerConfig{}
		StderrCheckForProvider(console.StackTypeTerraform)(&cfg)
		assert.True(t, cfg.checkStderr)
	})

	t.Run("terragrunt disables stderr checking", func(t *testing.T) {
		cfg := analyzerConfig{}
		StderrCheckForProvider(console.StackTypeTerragrunt)(&cfg)
		assert.False(t, cfg.checkStderr)
	})

	t.Run("ansible disables stderr checking", func(t *testing.T) {
		cfg := analyzerConfig{}
		StderrCheckForProvider(console.StackTypeAnsible)(&cfg)
		assert.False(t, cfg.checkStderr)
	})
}
