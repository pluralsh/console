package controller_test

import (
	"testing"

	"github.com/samber/lo"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	gqlclient "github.com/pluralsh/console/go/client"
	"github.com/pluralsh/console/go/controller/api/v1alpha1"
	"github.com/pluralsh/console/go/controller/internal/controller"
)

func TestClusterReconcilerAttributesMergeTags(t *testing.T) {
	existing := []*gqlclient.ClusterTags{
		{Name: "env", Value: "prod"},
		{Name: "team", Value: "platform"},
	}
	apiCluster := &gqlclient.ClusterFragment{
		ID:   "cluster-id",
		Tags: existing,
	}
	reconciler := &controller.ClusterReconciler{}

	t.Run("merges existing tags with spec tags when mergeTags is true", func(t *testing.T) {
		cluster := &v1alpha1.Cluster{
			Spec: v1alpha1.ClusterSpec{
				Handle:    lo.ToPtr("tracked"),
				MergeTags: true,
				Tags: map[string]string{
					"team":   "infra",
					"region": "us-east",
				},
			},
		}

		attrs, err := reconciler.Attributes(cluster, apiCluster)
		require.NoError(t, err)
		require.NotNil(t, attrs)
		assert.Equal(t, map[string]string{
			"env":    "prod",
			"team":   "infra",
			"region": "us-east",
		}, tagMap(attrs.Tags))
	})

	t.Run("replaces tags when mergeTags is false", func(t *testing.T) {
		cluster := &v1alpha1.Cluster{
			Spec: v1alpha1.ClusterSpec{
				Handle: lo.ToPtr("tracked"),
				Tags: map[string]string{
					"region": "us-east",
				},
			},
		}

		attrs, err := reconciler.Attributes(cluster, apiCluster)
		require.NoError(t, err)
		require.NotNil(t, attrs)
		assert.Equal(t, map[string]string{
			"region": "us-east",
		}, tagMap(attrs.Tags))
	})

	t.Run("preserves existing tags when mergeTags is true and spec tags are empty", func(t *testing.T) {
		cluster := &v1alpha1.Cluster{
			Spec: v1alpha1.ClusterSpec{
				Handle:    lo.ToPtr("tracked"),
				MergeTags: true,
			},
		}

		attrs, err := reconciler.Attributes(cluster, apiCluster)
		require.NoError(t, err)
		require.NotNil(t, attrs)
		assert.Equal(t, map[string]string{
			"env":  "prod",
			"team": "platform",
		}, tagMap(attrs.Tags))
	})

	t.Run("uses spec tags when mergeTags is true but api cluster is nil", func(t *testing.T) {
		cluster := &v1alpha1.Cluster{
			Spec: v1alpha1.ClusterSpec{
				Handle:    lo.ToPtr("tracked"),
				MergeTags: true,
				Tags: map[string]string{
					"region": "us-east",
				},
			},
		}

		attrs, err := reconciler.Attributes(cluster, nil)
		require.NoError(t, err)
		require.NotNil(t, attrs)
		assert.Equal(t, map[string]string{
			"region": "us-east",
		}, tagMap(attrs.Tags))
	})
}
