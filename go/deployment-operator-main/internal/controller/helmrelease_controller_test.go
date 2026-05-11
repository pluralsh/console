package controller

import (
	"testing"

	fluxcd "github.com/fluxcd/helm-controller/api/v2"
	"helm.sh/helm/v3/pkg/chart"
	rspb "helm.sh/helm/v3/pkg/release"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestChartVersionMatches(t *testing.T) {
	newHelmRelease := func(version string) fluxcd.HelmRelease {
		return fluxcd.HelmRelease{
			ObjectMeta: metav1.ObjectMeta{Name: "rel", Namespace: "ns"},
			Spec: fluxcd.HelmReleaseSpec{
				Chart: &fluxcd.HelmChartTemplate{
					Spec: fluxcd.HelmChartTemplateSpec{
						Version: version,
					},
				},
			},
		}
	}
	newRelease := func(version string) *rspb.Release {
		return &rspb.Release{
			Name: "rel",
			Chart: &chart.Chart{
				Metadata: &chart.Metadata{Version: version},
			},
		}
	}

	tests := []struct {
		name string
		hr   fluxcd.HelmRelease
		rel  *rspb.Release
		want bool
	}{
		{
			name: "exact match",
			hr:   newHelmRelease("1.2.3"),
			rel:  newRelease("1.2.3"),
			want: true,
		},
		{
			name: "semver range match",
			hr:   newHelmRelease(">=1.0.0 <2.0.0"),
			rel:  newRelease("1.2.3"),
			want: true,
		},
		{
			name: "semver range mismatch",
			hr:   newHelmRelease(">=2.0.0"),
			rel:  newRelease("1.2.3"),
			want: false,
		},
		{
			name: "missing chart metadata when version required",
			hr:   newHelmRelease("1.2.3"),
			rel: &rspb.Release{
				Name: "rel",
			},
			want: false,
		},
		{
			name: "empty version in helmrelease",
			hr:   newHelmRelease(""),
			rel:  newRelease("1.2.3"),
			want: true,
		},
		{
			name: "nil chart in helmrelease",
			hr: fluxcd.HelmRelease{
				ObjectMeta: metav1.ObjectMeta{Name: "rel", Namespace: "ns"},
				Spec:       fluxcd.HelmReleaseSpec{},
			},
			rel:  newRelease("1.2.3"),
			want: true,
		},
		{
			name: "name mismatch",
			hr:   newHelmRelease("1.2.3"),
			rel: &rspb.Release{
				Name: "other",
			},
			want: false,
		},
		{
			name: "invalid constraints fail to match",
			hr:   newHelmRelease("not-a-version"),
			rel:  newRelease("not-a-version"),
			want: false,
		},
		{
			name: "even one invalid constraint fails",
			hr:   newHelmRelease("1.2.3"),
			rel:  newRelease("not-a-version"),
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := chartVersionMatches(&tt.hr, tt.rel); got != tt.want {
				t.Fatalf("chartVersionMatches() = %v, want %v", got, tt.want)
			}
		})
	}
}
