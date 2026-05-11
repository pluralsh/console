package api_test

import (
	"os"
	"testing"

	tfjson "github.com/hashicorp/terraform-json"
	console "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/deployment-operator/pkg/harness/tool/terraform/api"
	"github.com/samber/lo"
	"github.com/stretchr/testify/assert"
)

func TestParseStateFile(t *testing.T) {
	t.Run("should parse valid state file", func(t *testing.T) {
		data, err := os.ReadFile("./state.json")
		assert.NoError(t, err)

		var state tfjson.State
		err = state.UnmarshalJSON(data)
		assert.NoError(t, err)

		assert.Equal(t, "1.0", state.FormatVersion)
		assert.Equal(t, "1.11.4", state.TerraformVersion)
	})

	t.Run("should parse valid state file and read sensitive values", func(t *testing.T) {
		data, err := os.ReadFile("./state.json")
		assert.NoError(t, err)

		var state tfjson.State
		err = state.UnmarshalJSON(data)
		assert.NoError(t, err)

		assert.Equal(t, len(state.Values.RootModule.Resources), 1)

		sensitiveValues := api.ResourceSensitiveValues(state.Values.RootModule.Resources[0])
		assert.Equal(t, 1, len(sensitiveValues))
		assert.Contains(t, sensitiveValues, "kubeconfig")
		assert.Contains(t, sensitiveValues["kubeconfig"], "client_key")
		assert.Contains(t, sensitiveValues["kubeconfig"], "password")
		assert.Contains(t, sensitiveValues["kubeconfig"], "token")
	})

	t.Run("should parse valid state file and filter out sensitive values", func(t *testing.T) {
		data, err := os.ReadFile("./state.json")
		assert.NoError(t, err)

		var state tfjson.State
		err = state.UnmarshalJSON(data)
		assert.NoError(t, err)

		assert.Equal(t, len(state.Values.RootModule.Resources), 1)

		configuration := api.ResourceConfiguration(state.Values.RootModule.Resources[0])
		assert.Contains(t, configuration, "host")
		assert.Contains(t, configuration, "username")
		assert.NotContains(t, configuration, "client_key")
		assert.NotContains(t, configuration, "password")
		assert.NotContains(t, configuration, "token")
	})
}

func TestCloneMap(t *testing.T) {
	t.Run("should handle empty map", func(t *testing.T) {
		input := map[string]any{}
		result := api.CloneMap(input)
		assert.Equal(t, input, result)
	})

	t.Run("should clone simple map", func(t *testing.T) {
		input := map[string]any{
			"key1": "value1",
			"key2": 42,
		}
		result := api.CloneMap(input)
		assert.Equal(t, input, result)
	})

	t.Run("should clone nested map", func(t *testing.T) {
		input := map[string]any{
			"key1": "value1",
			"nested": map[string]any{
				"inner1": "value2",
				"inner2": 42,
			},
		}
		result := api.CloneMap(input)
		assert.Equal(t, input, result)

		// Modify original to verify deep copy
		nested := input["nested"].(map[string]any)
		nested["inner1"] = "modified"
		assert.NotEqual(t, input, result)
	})

	t.Run("should clone map with slice values", func(t *testing.T) {
		input := map[string]any{
			"key1": []string{"value1", "value2"},
			"nested": map[string]any{
				"inner1": []int{1, 2, 3},
			},
		}
		result := api.CloneMap(input)
		assert.Equal(t, input, result)

		// Modify original to verify deep copy
		inputSlice := input["key1"].([]string)
		inputSlice[0] = "modified"
		assert.NotEqual(t, input, result)
	})
}

func TestExcludeSensitiveValues(t *testing.T) {
	t.Run("should handle empty maps", func(t *testing.T) {
		values := map[string]any{}
		sensitiveValues := map[string]any{}
		api.ExcludeSensitiveValues(values, sensitiveValues)
		assert.Equal(t, values, map[string]any{})
	})

	t.Run("should exclude sensitive values", func(t *testing.T) {
		values := map[string]any{
			"public":  "value",
			"private": "secret",
		}
		sensitiveValues := map[string]any{
			"private": true,
		}
		api.ExcludeSensitiveValues(values, sensitiveValues)
		assert.Equal(t, map[string]any{"public": "value"}, values)
	})

	t.Run("should exclude nested sensitive values", func(t *testing.T) {
		values := map[string]any{
			"public": "value",
			"nested": map[string]any{
				"public":  "value",
				"private": "secret",
			},
		}
		sensitiveValues := map[string]any{
			"nested": map[string]any{
				"private": true,
			},
		}
		api.ExcludeSensitiveValues(values, sensitiveValues)
		assert.Equal(t, map[string]any{
			"public": "value",
			"nested": map[string]any{
				"public": "value",
			},
		}, values)
	})

	t.Run("should handle array values", func(t *testing.T) {
		values := map[string]any{
			"public":  []string{"one", "two"},
			"private": []string{"secret1", "secret2"},
		}
		sensitiveValues := map[string]any{
			"private": true,
		}
		api.ExcludeSensitiveValues(values, sensitiveValues)
		assert.Equal(t, map[string]any{
			"public": []string{"one", "two"},
		}, values)
	})

	t.Run("should handle multiple nested levels", func(t *testing.T) {
		values := map[string]any{
			"level1": map[string]any{
				"level2": map[string]any{
					"level3": map[string]any{
						"public":  "value",
						"private": "secret",
					},
				},
			},
		}
		sensitiveValues := map[string]any{
			"level1": map[string]any{
				"level2": map[string]any{
					"level3": map[string]any{
						"private": true,
					},
				},
			},
		}
		api.ExcludeSensitiveValues(values, sensitiveValues)
		assert.Equal(t, map[string]any{
			"level1": map[string]any{
				"level2": map[string]any{
					"level3": map[string]any{
						"public": "value",
					},
				},
			},
		}, values)
	})

	t.Run("should handle mixed sensitive value types", func(t *testing.T) {
		values := map[string]any{
			"public": "value",
			"nested": map[string]any{
				"array":   []string{"one", "two"},
				"private": "secret",
			},
			"sensitive_array": []string{"secret1", "secret2"},
		}
		sensitiveValues := map[string]any{
			"nested": map[string]any{
				"private": true,
			},
			"sensitive_array": true,
		}
		api.ExcludeSensitiveValues(values, sensitiveValues)
		assert.Equal(t, map[string]any{
			"public": "value",
			"nested": map[string]any{
				"array": []string{"one", "two"},
			},
		}, values)
	})
}

func TestToStackStateResourceAttributes(t *testing.T) {
	t.Run("should return nil for nil input", func(t *testing.T) {
		result := api.ToStackStateResourceAttributes(nil)
		assert.Nil(t, result)
	})

	t.Run("should convert resource to attributes", func(t *testing.T) {
		resource := &tfjson.StateResource{
			Address:   "test_resource.example",
			Type:      "test_resource",
			Name:      "example",
			DependsOn: []string{"test_resource.dependency"},
			AttributeValues: map[string]interface{}{
				"key": "value",
			},
		}

		expected := &console.StackStateResourceAttributes{
			Identifier:    "test_resource.example",
			Resource:      "test_resource",
			Name:          "example",
			Configuration: lo.ToPtr(`{"key":"value"}`),
			Links:         lo.ToSlicePtr([]string{"test_resource.dependency"}),
		}

		result := api.ToStackStateResourceAttributes(resource)
		assert.Equal(t, expected, result)
	})
}
