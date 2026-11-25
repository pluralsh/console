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

func TestPackageServerHostsCoverEveryEcosystemByDefault(t *testing.T) {
	got := (&DevboxRunnerSpec{}).PackageServerHosts()
	// one host per ecosystem, plus the redirect targets a registry alone wouldn't reach
	for _, h := range []string{
		"proxy.golang.org", "storage.googleapis.com", "static.crates.io", "registry.npmjs.org", "plugins-artifacts.gradle.org",
		"repo.hex.pm", "files.pythonhosted.org", "rubygems.org", "repo.packagist.org", "api.nuget.org",
	} {
		if !slices.Contains(got, h) {
			t.Errorf("PackageServerHosts() = %v, missing %s", got, h)
		}
	}
	if len(slices.Compact(slices.Sorted(slices.Values(got)))) != len(got) {
		t.Errorf("PackageServerHosts() = %v, has duplicates", got)
	}

	off := false
	got = (&DevboxRunnerSpec{PackageServers: &DevboxPackageServers{Go: &off}}).PackageServerHosts()
	if slices.Contains(got, "storage.googleapis.com") || !slices.Contains(got, "dl.google.com") {
		t.Errorf("with Go off, PackageServerHosts() = %v, want Go's own hosts gone and shared ones kept", got)
	}
}

func TestPackageServerHostsOpenMiseOnlyWhenAskedFor(t *testing.T) {
	if got := (&DevboxRunnerSpec{}).PackageServerHosts(); slices.Contains(got, "mise-versions.jdx.dev") || slices.Contains(got, "github.com") {
		t.Errorf("by default, PackageServerHosts() = %v, want no mise hosts", got)
	}
	on := true
	got := (&DevboxRunnerSpec{PackageServers: &DevboxPackageServers{Mise: &on}}).PackageServerHosts()
	for _, h := range []string{"mise-versions.jdx.dev", "github.com", "release-assets.githubusercontent.com"} {
		if !slices.Contains(got, h) {
			t.Errorf("with mise on, PackageServerHosts() = %v, missing %s", got, h)
		}
	}
	if len(slices.Compact(slices.Sorted(slices.Values(got)))) != len(got) {
		t.Errorf("PackageServerHosts() = %v, has duplicates", got)
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
