package v1alpha1

import (
	"testing"

	console "github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTagUpdateAttributesMergeTags(t *testing.T) {
	existing := []*console.ClusterTags{
		{Name: "env", Value: "prod"},
		{Name: "team", Value: "platform"},
	}

	tests := []struct {
		name     string
		cluster  Cluster
		existing []*console.ClusterTags
		want     []*console.TagAttributes
	}{
		{
			name: "merge disabled uses only spec tags",
			cluster: Cluster{
				Spec: ClusterSpec{
					Handle:    lo.ToPtr("cluster"),
					MergeTags: false,
					Tags:      map[string]string{"region": "us-east"},
				},
			},
			existing: existing,
			want: []*console.TagAttributes{
				{Name: "region", Value: "us-east"},
			},
		},
		{
			name: "merge enabled overlays spec tags onto existing tags",
			cluster: Cluster{
				Spec: ClusterSpec{
					Handle:    lo.ToPtr("cluster"),
					MergeTags: true,
					Tags:      map[string]string{"team": "infra", "region": "us-east"},
				},
			},
			existing: existing,
			want: []*console.TagAttributes{
				{Name: "env", Value: "prod"},
				{Name: "region", Value: "us-east"},
				{Name: "team", Value: "infra"},
			},
		},
		{
			name: "merge enabled with empty spec tags preserves existing tags",
			cluster: Cluster{
				Spec: ClusterSpec{
					Handle:    lo.ToPtr("cluster"),
					MergeTags: true,
				},
			},
			existing: existing,
			want: []*console.TagAttributes{
				{Name: "env", Value: "prod"},
				{Name: "team", Value: "platform"},
			},
		},
		{
			name: "merge enabled with nil existing uses spec tags",
			cluster: Cluster{
				Spec: ClusterSpec{
					Handle:    lo.ToPtr("cluster"),
					MergeTags: true,
					Tags:      map[string]string{"region": "us-east"},
				},
			},
			existing: nil,
			want: []*console.TagAttributes{
				{Name: "region", Value: "us-east"},
			},
		},
		{
			name: "merge enabled skips nil existing entries",
			cluster: Cluster{
				Spec: ClusterSpec{
					Handle:    lo.ToPtr("cluster"),
					MergeTags: true,
					Tags:      map[string]string{"region": "us-east"},
				},
			},
			existing: []*console.ClusterTags{
				nil,
				{Name: "env", Value: "prod"},
			},
			want: []*console.TagAttributes{
				{Name: "env", Value: "prod"},
				{Name: "region", Value: "us-east"},
			},
		},
		{
			name: "no tags returns nil",
			cluster: Cluster{
				Spec: ClusterSpec{
					Handle:    lo.ToPtr("cluster"),
					MergeTags: true,
				},
			},
			existing: nil,
			want:     nil,
		},
		{
			name: "merge disabled with empty spec tags does not send existing tags",
			cluster: Cluster{
				Spec: ClusterSpec{
					Handle:    lo.ToPtr("cluster"),
					MergeTags: false,
				},
			},
			existing: existing,
			want:     nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.cluster.TagUpdateAttributes(tt.existing)
			assert.Equal(t, tt.cluster.Spec.Handle, got.Handle)
			require.Equal(t, tt.want, got.Tags)
		})
	}
}

func TestMergeClusterTagsSortsByName(t *testing.T) {
	tags := mergeClusterTags(nil, map[string]string{
		"z-last":  "1",
		"a-first": "2",
		"m-mid":   "3",
	}, false)

	require.Len(t, tags, 3)
	assert.Equal(t, "a-first", tags[0].Name)
	assert.Equal(t, "m-mid", tags[1].Name)
	assert.Equal(t, "z-last", tags[2].Name)
}
