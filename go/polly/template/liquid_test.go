package template_test

import (
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/pluralsh/polly/template"
)

func TestAppendFunctionNotOverridden(t *testing.T) {
	// Test data
	input := `{% assign fruits = "apple" | append: ", banana" %}{{ fruits }}`
	expected := "apple, banana"

	// Render the template
	result, err := template.RenderLiquid([]byte(input), map[string]interface{}{})

	// Assert that rendering was successful and produced the expected output
	assert.NoError(t, err)
	assert.Equal(t, expected, string(result))

	// Additionally, verify that the function wasn't registered from Sprig
	// by checking if it's in the excluded functions list
	filters := template.RegisteredFilters()
	_, exists := filters["append"]
	assert.True(t, !exists, "append function should not be registered as it is excluded from Sprig functions")
}

func TestRenderLiquidSliceShouldReturnError(t *testing.T) {
	// 'nonexistent' is not in the bindings, so Liquid passes nil to the slice filter.
	// Sprig v3 panics when reflection is performed on this nil value.
	input := []byte(`{{ nonexistent | slice: 0, 1 }}`)
	bindings := map[string]interface{}{
		"existing_var": "hello",
	}

	assert.NotPanics(t, func() {
		_, err := template.RenderLiquid(input, bindings)
		assert.Error(t, err)

	}, "RenderLiquid should handle nil filter inputs without crashing the process")
}
