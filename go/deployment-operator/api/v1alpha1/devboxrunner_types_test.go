package v1alpha1

import (
	"slices"
	"strings"
	"testing"
)

func TestOCIRegistryHosts(t *testing.T) {
	on, off := true, false
	hub := []string{"docker.io", "index.docker.io", "registry-1.docker.io", "auth.docker.io", "production.cloudflare.docker.com"}
	ghcr := []string{"ghcr.io", "pkg-containers.githubusercontent.com"}

	for _, tc := range []struct {
		name string
		oci  *DevboxOCIRegistries
		want []string
	}{
		{name: "unset takes the defaults", want: slices.Concat(hub, ghcr)},
		{name: "empty takes the defaults", oci: &DevboxOCIRegistries{}, want: slices.Concat(hub, ghcr)},
		{name: "defaults can be turned off", oci: &DevboxOCIRegistries{DockerHub: &off, GitHub: &off}},
		{
			name: "registries sharing a host list it once",
			oci:  &DevboxOCIRegistries{DockerHub: &off, GitHub: &off, Google: &on, Kubernetes: &on},
			want: []string{"gcr.io", "*.gcr.io", "*.pkg.dev", "registry.k8s.io"},
		},
		{
			name: "ecr opens each listed region",
			oci: &DevboxOCIRegistries{DockerHub: &off, GitHub: &off,
				ECR: &DevboxECRRegistries{Regions: []string{"us-east-1", "eu-west-2", "us-east-1"}}},
			want: []string{
				"*.dkr.ecr.us-east-1.amazonaws.com", "api.ecr.us-east-1.amazonaws.com",
				"prod-us-east-1-starport-layer-bucket.s3.us-east-1.amazonaws.com", "prod-us-east-1-starport-layer-bucket.s3.amazonaws.com",
				"*.dkr.ecr.eu-west-2.amazonaws.com", "api.ecr.eu-west-2.amazonaws.com",
				"prod-eu-west-2-starport-layer-bucket.s3.eu-west-2.amazonaws.com", "prod-eu-west-2-starport-layer-bucket.s3.amazonaws.com",
			},
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			got := (&DevboxRunnerSpec{OCIRegistries: tc.oci}).OCIRegistryHosts()
			if !slices.Equal(got, tc.want) {
				t.Fatalf("OCIRegistryHosts() = %v, want %v", got, tc.want)
			}
		})
	}
}

func TestOCIRegistryHostsAreValidSubstratePatterns(t *testing.T) {
	all := map[string][]string{"ecr": ecrHosts("ap-southeast-2")}
	for registry, hosts := range ociRegistryHosts {
		all[registry] = hosts
	}
	for registry, hosts := range all {
		for _, h := range hosts {
			rest, wild := strings.CutPrefix(h, "*.")
			if strings.Contains(rest, "*") || h != strings.ToLower(h) || strings.HasSuffix(h, ".") || (wild && !strings.Contains(rest, ".")) {
				t.Errorf("%s: %q is not a Substrate hostname pattern", registry, h)
			}
		}
	}
}

func TestEgressPresetHostsIncludeEveryPreset(t *testing.T) {
	spec := &DevboxRunnerSpec{CloudIdentities: []DevboxCloudIdentity{{Name: "aws", AWS: &DevboxAWSIdentity{}}}}
	got := spec.EgressPresetHosts()
	for _, h := range []string{"proxy.golang.org", "*.amazonaws.com", "registry-1.docker.io"} {
		if !slices.Contains(got, h) {
			t.Errorf("EgressPresetHosts() = %v, missing %s", got, h)
		}
	}
}
