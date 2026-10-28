package ping

import (
	"testing"

	"github.com/stretchr/testify/assert"

	controllerv1 "github.com/pluralsh/console/go/deployment-operator/pkg/controller/v1"
)

func TestGetVersionPairs(t *testing.T) {
	v := func(raw string) controllerv1.NormalizedVersion {
		parsed, _ := controllerv1.ParseVersion(raw)
		return *parsed
	}

	tests := []struct {
		name     string
		versions []controllerv1.NormalizedVersion
		want     []VersionPair
	}{
		{name: "nil", versions: nil, want: []VersionPair{}},
		{name: "empty", versions: []controllerv1.NormalizedVersion{}, want: []VersionPair{}},
		{name: "single", versions: []controllerv1.NormalizedVersion{v("v1")}, want: []VersionPair{}},
		{
			name:     "multiple",
			versions: []controllerv1.NormalizedVersion{v("v2"), v("v1"), v("v1beta1")},
			want: []VersionPair{
				{LatestVersion: "v2", PreviousVersion: "v1"},
				{LatestVersion: "v1", PreviousVersion: "v1beta1"},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.NotPanics(t, func() {
				assert.Equal(t, tt.want, getVersionPairs(tt.versions))
			})
		})
	}
}
