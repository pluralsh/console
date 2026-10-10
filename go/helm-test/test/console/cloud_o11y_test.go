package console_test

import (
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"

	"github.com/pluralsh/console/go/helm-test/internal/common"
	"github.com/pluralsh/console/go/helm-test/test/console"
)

const (
	telemetryNamespace = "telemetry-system"
	telemetryGroup     = "telemetry.plural.sh"
)

var (
	consoleEnvSecret = common.ManifestKey{
		Name:      "console-env",
		GroupKind: schema.GroupKind{Group: common.GroupCore, Kind: "Secret"},
	}
	elasticUserSecret = common.ManifestKey{
		Name:      "plrl-test-user",
		Namespace: "elastic",
		GroupKind: schema.GroupKind{Group: common.GroupCore, Kind: "Secret"},
	}
	elasticUser = common.ManifestKey{
		Name:      "plrl-test",
		Namespace: "elastic",
		GroupKind: schema.GroupKind{Group: "dbs.plural.sh", Kind: "ElasticsearchUser"},
	}
	vmUser = common.ManifestKey{
		Name:      "plrl-test",
		Namespace: "monitoring",
		GroupKind: schema.GroupKind{Group: "operator.victoriametrics.com", Kind: "VMUser"},
	}
	telemetryAuthSecret = common.ManifestKey{
		Name:      "plrl-test-auth",
		Namespace: telemetryNamespace,
		GroupKind: schema.GroupKind{Group: common.GroupCore, Kind: "Secret"},
	}
	telemetryAuths = []telemetryAuth{
		{Kind: "Metrics", Store: "metrics"},
		{Kind: "Logs", Store: "logs"},
		{Kind: "Traces", Store: "traces"},
	}
)

type telemetryAuth struct {
	Kind  string
	Store string
}

func (in telemetryAuth) Key() common.ManifestKey {
	return common.ManifestKey{
		Name:      in.Store + "-authz",
		Namespace: telemetryNamespace,
		GroupKind: schema.GroupKind{Group: telemetryGroup, Kind: "NamespaceAuthentication"},
	}
}

func allO11yAuthKeys() []common.ManifestKey {
	keys := []common.ManifestKey{elasticUserSecret, elasticUser, vmUser, telemetryAuthSecret}
	for _, auth := range telemetryAuths {
		keys = append(keys, auth.Key())
	}
	return keys
}

func cloudO11yValues(o11y map[string]interface{}) map[string]interface{} {
	return map[string]interface{}{
		"cloud": map[string]interface{}{
			"enabled":          true,
			"instanceName":     "test",
			"esPassword":       "es-pass",
			"vmPassword":       "vm-pass",
			"vmTenant":         "12",
			"elasticNamespace": "elastic",
			"o11y":             o11y,
		},
	}
}

func secretFromManifests(manifests common.ManifestMap, key common.ManifestKey) corev1.Secret {
	raw, exists := manifests[key.String()]
	Expect(exists).To(BeTrue(), "expected %s to be rendered", key.String())

	var secret corev1.Secret
	Expect(runtime.DefaultUnstructuredConverter.FromUnstructured(raw.UnstructuredContent(), &secret)).To(Succeed())
	return secret
}

var _ = Describe("Cloud observability", func() {
	for _, chartEntry := range console.Charts() {
		Context(chartEntry.Name+" with the legacy elastic and vmetrics stack", Ordered, func() {
			var manifests common.ManifestMap

			BeforeAll(func() {
				var err error
				manifests, err = chartEntry.Load(cloudO11yValues(map[string]interface{}{"enabled": true}))
				Expect(err).NotTo(HaveOccurred())
			})

			It("provisions elastic and vmetrics auth", func() {
				Expect(manifests).To(HaveKey(elasticUserSecret.String()))
				Expect(manifests).To(HaveKey(elasticUser.String()))

				raw, exists := manifests[vmUser.String()]
				Expect(exists).To(BeTrue())
				password, _, err := unstructured.NestedString(raw.Object, "spec", "password")
				Expect(err).NotTo(HaveOccurred())
				Expect(password).To(Equal("vm-pass"))
			})

			It("does not provision telemetry auth", func() {
				Expect(manifests).NotTo(HaveKey(telemetryAuthSecret.String()))
				for _, auth := range telemetryAuths {
					Expect(manifests).NotTo(HaveKey(auth.Key().String()))
				}
			})

			It("does not enable plural telemetry in the console env", func() {
				secret := secretFromManifests(manifests, consoleEnvSecret)
				Expect(secret.Data).To(HaveKeyWithValue("CONSOLE_CLOUD", []byte("true")))
				Expect(secret.Data).NotTo(HaveKey("CONSOLE_CLOUD_OBSERVABILITY_PLURAL"))
				Expect(secret.Data).NotTo(HaveKey("CONSOLE_CLOUD_TELEMETRY_URL"))
			})
		})

		Context(chartEntry.Name+" with plural telemetry", Ordered, func() {
			var manifests common.ManifestMap

			BeforeAll(func() {
				var err error
				manifests, err = chartEntry.Load(cloudO11yValues(map[string]interface{}{
					"enabled":      true,
					"plural":       true,
					"telemetryUrl": "https://telemetry.example.com",
				}))
				Expect(err).NotTo(HaveOccurred())
			})

			It("does not provision elastic or vmetrics auth", func() {
				Expect(manifests).NotTo(HaveKey(elasticUserSecret.String()))
				Expect(manifests).NotTo(HaveKey(elasticUser.String()))
				Expect(manifests).NotTo(HaveKey(vmUser.String()))
			})

			It("provisions a namespace scoped write credential for every telemetry datastore", func() {
				secret := secretFromManifests(manifests, telemetryAuthSecret)
				Expect(secret.StringData).To(HaveKeyWithValue("password", "es-pass"))

				for _, auth := range telemetryAuths {
					By(auth.Kind)
					raw, exists := manifests[auth.Key().String()]
					Expect(exists).To(BeTrue())

					spec, _, err := unstructured.NestedMap(raw.Object, "spec")
					Expect(err).NotTo(HaveOccurred())
					Expect(spec).To(Equal(map[string]interface{}{
						"dataStoreRef": map[string]interface{}{"kind": auth.Kind, "name": auth.Store},
						"namespace":    "test",
						"username":     "plrl",
						"permission":   "write",
						"secretKeyRef": map[string]interface{}{"name": telemetryAuthSecret.Name, "key": "password"},
					}))
				}
			})

			It("enables plural telemetry in the console env", func() {
				secret := secretFromManifests(manifests, consoleEnvSecret)
				Expect(secret.Data).To(HaveKeyWithValue("CONSOLE_CLOUD_OBSERVABILITY_PLURAL", []byte("true")))
				Expect(secret.Data).To(HaveKeyWithValue("CONSOLE_CLOUD_TELEMETRY_URL", []byte("https://telemetry.example.com")))
			})
		})

		Context(chartEntry.Name+" with cloud observability disabled", Ordered, func() {
			var manifests common.ManifestMap

			BeforeAll(func() {
				var err error
				manifests, err = chartEntry.Load(cloudO11yValues(map[string]interface{}{"enabled": false, "plural": true}))
				Expect(err).NotTo(HaveOccurred())
			})

			It("renders no observability auth", func() {
				for _, key := range allO11yAuthKeys() {
					Expect(manifests).NotTo(HaveKey(key.String()))
				}
			})
		})
	}
})
