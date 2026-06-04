package controller

import (
	"encoding/json"
	"testing"

	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/stretchr/testify/require"
)

func TestSentinelRunOverrides(t *testing.T) {
	t.Run("returns nil when overrides are not configured", func(t *testing.T) {
		overrides, err := sentinelRunOverrides(nil)

		require.NoError(t, err)
		require.Nil(t, overrides)
	})

	t.Run("returns nil when tags are empty", func(t *testing.T) {
		overrides, err := sentinelRunOverrides(&v1alpha1.SentinelRunOverrides{})

		require.NoError(t, err)
		require.Nil(t, overrides)
	})

	t.Run("serializes tags for the GraphQL JSON scalar", func(t *testing.T) {
		overrides, err := sentinelRunOverrides(&v1alpha1.SentinelRunOverrides{
			Tags: map[string]string{
				"region": "us-east-1",
				"tier":   "staging",
			},
		})

		require.NoError(t, err)
		require.NotNil(t, overrides)
		require.NotNil(t, overrides.Tags)

		var tags map[string]string
		require.NoError(t, json.Unmarshal([]byte(*overrides.Tags), &tags))
		require.Equal(t, map[string]string{
			"region": "us-east-1",
			"tier":   "staging",
		}, tags)
	})
}
