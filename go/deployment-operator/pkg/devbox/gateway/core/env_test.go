package core

import (
	"context"
	"slices"
	"testing"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/utils/ptr"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/egress"
)

func TestInitializeCarriesRunnerEnv(t *testing.T) {
	h := newHarness(t, nil)
	h.running("inst-1")

	h.daemon.mu.Lock()
	defer h.daemon.mu.Unlock()
	if got := h.daemon.initialized[0].GetEnv()["API_KEY"]; got != "s3cret" {
		t.Fatalf("Initialize env API_KEY = %q, want s3cret", got)
	}
}

func TestDaemonRestartReinitializes(t *testing.T) {
	h := newHarness(t, nil)
	h.running("inst-1")
	inits, _, subs, _ := h.daemon.snapshot()

	// A dropped stream from the same daemon process resubscribes without reinitializing.
	h.daemon.breakSub <- struct{}{}
	h.eventually("resubscribed", func() bool {
		_, _, s, _ := h.daemon.snapshot()
		return len(s) > len(subs)
	})
	if n, _, _, _ := h.daemon.snapshot(); n != inits {
		t.Fatalf("Initialize calls after a reconnect = %d, want %d", n, inits)
	}

	h.daemon.mu.Lock()
	h.daemon.bootID = "boot-2"
	h.daemon.mu.Unlock()
	h.daemon.breakSub <- struct{}{}
	h.eventually("reinitialized", func() bool {
		n, _, _, _ := h.daemon.snapshot()
		return n == inits+1
	})
	h.daemon.mu.Lock()
	defer h.daemon.mu.Unlock()
	if got := h.daemon.initialized[inits].GetEnv()["API_KEY"]; got != "s3cret" {
		t.Fatalf("reinitialize env API_KEY = %q, want s3cret", got)
	}
}

func TestKubeRunnersReadsSecretEnv(t *testing.T) {
	scheme := runtime.NewScheme()
	_ = corev1.AddToScheme(scheme)
	_ = v1alpha1.AddToScheme(scheme)
	runner := func(name string, env ...v1alpha1.DevboxEnvVar) *v1alpha1.DevboxRunner {
		return &v1alpha1.DevboxRunner{ObjectMeta: metav1.ObjectMeta{Name: name}, Spec: v1alpha1.DevboxRunnerSpec{Env: env}}
	}
	secretRef := v1alpha1.DevboxEnvVar{Name: "TOKEN", ValueFrom: &v1alpha1.DevboxEnvVarSource{
		SecretKeyRef: v1alpha1.DevboxSecretKeySelector{Name: "src", Key: "token"}}}
	kube := fake.NewClientBuilder().WithScheme(scheme).WithObjects(
		runner("secret", secretRef),
		runner("unresolved", secretRef),
		runner("plain", v1alpha1.DevboxEnvVar{Name: "MODE", Value: ptr.To("dev")}),
		&corev1.Secret{
			ObjectMeta: metav1.ObjectMeta{Name: v1alpha1.DevboxRunnerEnvSecret, Namespace: "plrl"},
			Data: map[string][]byte{
				"secret": []byte(`{"TOKEN":"t0k"}`),
				"plain":  []byte(`{"LEAKED":"x"}`),
			},
		},
	).Build()
	runners := &KubeRunners{Client: kube, Namespace: "plrl"}

	cases := map[string]map[string]string{
		"secret":     {"TOKEN": "t0k"},
		"unresolved": nil,
		// Plain values live in the template; the mirror is only read for runners with secretKeyRefs.
		"plain": nil,
	}
	for name, want := range cases {
		r, err := runners.Get(context.Background(), name)
		if err != nil {
			t.Fatalf("%s: %v", name, err)
		}
		if len(r.Env) != len(want) || r.Env["TOKEN"] != want["TOKEN"] {
			t.Fatalf("%s: env = %v, want %v", name, r.Env, want)
		}
	}
}

func TestRunnerFromCRDPackageServers(t *testing.T) {
	hosts := func(r *Runner) []string {
		var out []string
		for _, e := range r.HTTPAllowlist {
			if e.Port != 443 {
				t.Fatalf("package server %s on port %d, want 443", e.Host, e.Port)
			}
			out = append(out, e.Host)
		}
		return out
	}

	defaults := hosts(RunnerFromCRD(&v1alpha1.DevboxRunner{}))
	for _, h := range []string{"proxy.golang.org", "index.crates.io", "registry.npmjs.org", "repo.maven.apache.org", "repo.hex.pm", "files.pythonhosted.org"} {
		if !slices.Contains(defaults, h) {
			t.Errorf("default allowlist missing %s: %v", h, defaults)
		}
	}
	for _, h := range []string{"rubygems.org", "packagist.org", "api.nuget.org"} {
		if slices.Contains(defaults, h) {
			t.Errorf("default allowlist includes opt-in %s", h)
		}
	}

	custom := hosts(RunnerFromCRD(&v1alpha1.DevboxRunner{Spec: v1alpha1.DevboxRunnerSpec{
		PackageServers: &v1alpha1.DevboxPackageServers{Go: ptr.To(false), Ruby: ptr.To(true)},
	}}))
	if slices.Contains(custom, "proxy.golang.org") || !slices.Contains(custom, "rubygems.org") || !slices.Contains(custom, "pypi.org") {
		t.Fatalf("go disabled, ruby enabled, python defaulted: %v", custom)
	}

	none := RunnerFromCRD(&v1alpha1.DevboxRunner{Spec: v1alpha1.DevboxRunnerSpec{
		HTTPAllowlist: []v1alpha1.DevboxHTTPAllowlistEntry{{Host: "example.com"}},
		PackageServers: &v1alpha1.DevboxPackageServers{Go: ptr.To(false), Rust: ptr.To(false), JavaScript: ptr.To(false),
			Java: ptr.To(false), Elixir: ptr.To(false), Python: ptr.To(false)},
		OCIRegistries: noRegistries,
	}})
	if want := []egress.AllowEntry{{Host: "example.com"}}; !slices.Equal(none.HTTPAllowlist, want) {
		t.Fatalf("all package servers off: %v, want %v", none.HTTPAllowlist, want)
	}
}

var noRegistries = &v1alpha1.DevboxOCIRegistries{DockerHub: ptr.To(false), GitHub: ptr.To(false)}

func TestRunnerFromCRDOCIRegistries(t *testing.T) {
	noPackages := &v1alpha1.DevboxPackageServers{Go: ptr.To(false), Rust: ptr.To(false), JavaScript: ptr.To(false),
		Java: ptr.To(false), Elixir: ptr.To(false), Python: ptr.To(false)}
	hosts := func(oci *v1alpha1.DevboxOCIRegistries) []string {
		var out []string
		for _, e := range RunnerFromCRD(&v1alpha1.DevboxRunner{Spec: v1alpha1.DevboxRunnerSpec{PackageServers: noPackages, OCIRegistries: oci}}).HTTPAllowlist {
			if e.Port != 443 {
				t.Fatalf("registry %s on port %d, want 443", e.Host, e.Port)
			}
			out = append(out, e.Host)
		}
		return out
	}

	defaults := hosts(nil)
	for _, h := range []string{"registry-1.docker.io", "auth.docker.io", "production.cloudflare.docker.com", "ghcr.io"} {
		if !slices.Contains(defaults, h) {
			t.Errorf("default allowlist missing %s: %v", h, defaults)
		}
	}
	for _, h := range []string{"quay.io", "gcr.io", "mcr.microsoft.com", "registry.k8s.io"} {
		if slices.Contains(defaults, h) {
			t.Errorf("default allowlist includes opt-in %s", h)
		}
	}

	custom := hosts(&v1alpha1.DevboxOCIRegistries{DockerHub: ptr.To(false), Quay: ptr.To(true)})
	if slices.Contains(custom, "registry-1.docker.io") || !slices.Contains(custom, "quay.io") || !slices.Contains(custom, "ghcr.io") {
		t.Fatalf("docker hub disabled, quay enabled, ghcr defaulted: %v", custom)
	}
}

func TestRunnerFromCRDCloudProviders(t *testing.T) {
	noPackages := &v1alpha1.DevboxPackageServers{Go: ptr.To(false), Rust: ptr.To(false), JavaScript: ptr.To(false),
		Java: ptr.To(false), Elixir: ptr.To(false), Python: ptr.To(false)}
	hosts := func(spec v1alpha1.DevboxRunnerSpec) []string {
		spec.PackageServers = noPackages
		spec.OCIRegistries = noRegistries
		var out []string
		for _, e := range RunnerFromCRD(&v1alpha1.DevboxRunner{Spec: spec}).HTTPAllowlist {
			out = append(out, e.Host)
		}
		return out
	}

	if got := hosts(v1alpha1.DevboxRunnerSpec{}); len(got) != 0 {
		t.Fatalf("cloud providers open without identities: %v", got)
	}

	aws := []v1alpha1.DevboxCloudIdentity{{Name: "aws", AWS: &v1alpha1.DevboxAWSIdentity{RoleArn: "arn:aws:iam::123456789012:role/devbox"}}}
	if got := hosts(v1alpha1.DevboxRunnerSpec{CloudIdentities: aws}); !slices.Contains(got, "*.amazonaws.com") || slices.Contains(got, "*.googleapis.com") {
		t.Fatalf("an aws identity opens aws only: %v", got)
	}
	if got := hosts(v1alpha1.DevboxRunnerSpec{CloudIdentities: aws, CloudProviders: &v1alpha1.DevboxCloudProviders{AWS: ptr.To(false)}}); slices.Contains(got, "*.amazonaws.com") {
		t.Fatalf("aws disabled despite the identity: %v", got)
	}

	got := hosts(v1alpha1.DevboxRunnerSpec{CloudProviders: &v1alpha1.DevboxCloudProviders{GCP: ptr.To(true), Azure: ptr.To(true)}})
	for _, h := range []string{"*.googleapis.com", "management.azure.com", "login.microsoftonline.com"} {
		if !slices.Contains(got, h) {
			t.Errorf("enabled clouds missing %s: %v", h, got)
		}
	}
}
