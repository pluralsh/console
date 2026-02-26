package kascfg_test

import (
	"fmt"
	"testing"

	"github.com/google/go-cmp/cmp"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/testing/protocmp"
	"sigs.k8s.io/yaml"

	"github.com/pluralsh/kubernetes-agent/cmd/kas/kasapp"
	"github.com/pluralsh/kubernetes-agent/pkg/kascfg"
)

const (
	kasConfigExampleFile = "config_example.yaml"
)

func TestExampleConfigHasCorrectDefaults(t *testing.T) {
	// This is effectively the minimum required configuration i.e. only the required fields.
	cfgDefaulted := &kascfg.ConfigurationFile{
		Agent: &kascfg.AgentCF{
			KubernetesApi: &kascfg.KubernetesApiCF{
				Listen: &kascfg.ListenKubernetesApiCF{},
			},
		},
		Redis: &kascfg.RedisCF{
			RedisConfig: &kascfg.RedisCF_Server{
				Server: &kascfg.RedisServerCF{
					Address: "localhost:6380",
				},
			},
			PasswordFile: "/some/file",
			Network:      "tcp",
		},
		Api: &kascfg.ApiCF{
			Listen: &kascfg.ListenApiCF{
				AuthenticationSecretFile: "/some/file",
			},
		},
		PrivateApi: &kascfg.PrivateApiCF{
			Listen: &kascfg.ListenPrivateApiCF{
				AuthenticationSecretFile: "/some/file",
			},
		},
	}
	kasapp.ApplyDefaultsToKasConfigurationFile(cfgDefaulted)
	assert.NoError(t, cfgDefaulted.ValidateAll())

	printCorrectYAML := false

	cfgFromFile, err := kasapp.LoadConfigurationFile(kasConfigExampleFile)
	if assert.NoError(t, err) {
		if !assert.Empty(t, cmp.Diff(cfgDefaulted, cfgFromFile, protocmp.Transform())) {
			printCorrectYAML = true
		}
	} else {
		printCorrectYAML = true
	}
	if printCorrectYAML {
		// Failed to load. Just print what it should be
		data, err := protojson.Marshal(cfgDefaulted)
		require.NoError(t, err)
		configYAML, err := yaml.JSONToYAML(data)
		require.NoError(t, err)
		fmt.Println(string(configYAML)) // nolint: forbidigo
	}
}
