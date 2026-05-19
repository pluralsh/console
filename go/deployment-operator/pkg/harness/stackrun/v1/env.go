package v1

import "strings"

const (
	// DefaultHelmCacheHome is the writable Helm cache directory for stack run jobs.
	// It lives under /plural, which is backed by an emptyDir volume in Kubernetes.
	DefaultHelmCacheHome = "/plural/.cache/helm"

	HelmCacheHomeEnvVar = "HELM_CACHE_HOME"
)

func appendDefaultHelmCacheHome(env []string) []string {
	if envHasKey(env, HelmCacheHomeEnvVar) {
		return env
	}

	return append(env, HelmCacheHomeEnvVar+"="+DefaultHelmCacheHome)
}

func envHasKey(env []string, key string) bool {
	prefix := key + "="
	for _, e := range env {
		if strings.HasPrefix(e, prefix) {
			return true
		}
	}
	return false
}
