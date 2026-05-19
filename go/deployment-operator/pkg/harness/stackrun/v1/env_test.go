package v1

import (
	"testing"

	gqlclient "github.com/pluralsh/console/go/client"
	"github.com/stretchr/testify/assert"
)

func TestStackRunEnv_DefaultHelmCacheHome(t *testing.T) {
	run := &StackRun{}
	env := run.Env()

	assert.Contains(t, env, HelmCacheHomeEnvVar+"="+DefaultHelmCacheHome)
}

func TestStackRunEnv_PreservesCustomHelmCacheHome(t *testing.T) {
	run := &StackRun{
		Environment: []*gqlclient.StackEnvironmentFragment{
			{Name: HelmCacheHomeEnvVar, Value: "/custom/cache"},
		},
	}
	env := run.Env()

	assert.Contains(t, env, HelmCacheHomeEnvVar+"=/custom/cache")
	assert.NotContains(t, env, HelmCacheHomeEnvVar+"="+DefaultHelmCacheHome)
}

func TestAppendDefaultHelmCacheHome_Idempotent(t *testing.T) {
	env := []string{HelmCacheHomeEnvVar + "=/custom/cache"}
	assert.Equal(t, env, appendDefaultHelmCacheHome(env))
}
