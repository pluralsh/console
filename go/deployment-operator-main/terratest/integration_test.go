package test

import (
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/gruntwork-io/terratest/modules/k8s"
	"github.com/pluralsh/console/go/client"
	"github.com/samber/lo"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/util/intstr"
	"k8s.io/apimachinery/pkg/util/rand"
	"sigs.k8s.io/yaml"

	"github.com/pluralsh/deployment-operator/dockerfiles/sentinel-harness/terratest/dns"
	"github.com/pluralsh/deployment-operator/dockerfiles/sentinel-harness/terratest/helpers"
	"github.com/pluralsh/deployment-operator/dockerfiles/sentinel-harness/terratest/types"
)

const filePathEnvVar = "TEST_CASES_FILE_PATH"

func TestSentinelIntegration(t *testing.T) {
	testCase := loadIntegrationTestCases(t)

	// When ignore is set, just nullify it
	if testCase.Defaults != nil && lo.FromPtr(testCase.Defaults.Ignore) {
		testCase.Defaults = nil
	}

	for i, tc := range testCase.Configurations {
		require.NotEmpty(t, tc.Name, "test case configuration %d has no name", i)
		require.NotEmpty(t, tc.Type, "test case configuration %q has no type", i)

		t.Run(tc.Name+"-"+rand.String(5), func(t *testing.T) {
			t.Parallel()

			switch tc.Type {
			case client.SentinelIntegrationTestCaseTypeCoredns:
				runCorednsTest(t, tc.Coredns)

			case client.SentinelIntegrationTestCaseTypeLoadbalancer:
				runLoadBalancerTest(t, tc.Loadbalancer, testCase.Defaults)

			case client.SentinelIntegrationTestCaseTypeRaw:
				runRawTest(t, tc.Raw, testCase.Defaults)

			case client.SentinelIntegrationTestCaseTypePvc:
				runPVCTest(t, tc.Pvc, testCase.Defaults)

			default:
				t.Fatalf("unsupported test case type: %s", tc.Type)
			}
		})
	}
}

func runLoadBalancerTest(t *testing.T, lbFragment *client.TestCaseConfigurationFragment_Loadbalancer, defaults *client.SentinelCheckIntegrationTestDefaultConfigurationFragment) {
	require.NotNil(t, lbFragment, "loadbalancer config must be set")

	suffix := rand.String(6)
	namespaceName := fmt.Sprintf("test-%s", suffix)
	serviceName := fmt.Sprintf("%s-svc-%s", lbFragment.NamePrefix, suffix)

	namespaceResource := helpers.NewNamespace(namespaceName, helpers.WithNamespaceDefaults(defaults))
	if err := namespaceResource.CreateWithCleanup(t, 5*time.Minute); err != nil {
		require.Fail(t, "failed to create namespace: %v", err)
	}

	serviceResource := helpers.NewService(serviceName, namespaceName,
		helpers.WithServiceLabels(lbFragment.Labels),
		helpers.WithServiceAnnotations(lbFragment.Annotations),
		helpers.WithServiceType(corev1.ServiceTypeLoadBalancer),
		helpers.WithServicePorts(corev1.ServicePort{
			Name:       "http",
			Port:       80,
			TargetPort: intstr.IntOrString{Type: intstr.Int, IntVal: 80},
		}),
		helpers.WithServiceDefaults(defaults),
	)

	if err := serviceResource.Create(t); err != nil {
		require.Fail(t, "failed to create service: %v", err)
	}

	if err := serviceResource.WaitForReady(t, 2*time.Minute); err != nil {
		require.Fail(t, "failed to wait for service to be ready: %v", err)
	}

	svc, err := serviceResource.Get(t)
	if err != nil {
		require.Fail(t, "failed to get service: %v", err)
	}

	require.Equal(t, "LoadBalancer", string(svc.Spec.Type))

	if lbFragment.DNSProbe != nil {
		prober, err := dns.NewLoadBalancerProber(*svc)
		require.NoError(t, err, "dns probe failed for %s", lbFragment.DNSProbe.Fqdn)

		err = prober.Probe(
			lbFragment.DNSProbe.Fqdn,
			dns.WithDelay(lbFragment.DNSProbe.Delay),
			dns.WithRetries(lbFragment.DNSProbe.Retries),
		)
		require.NoError(t, err, "dns probe failed for %s", lbFragment.DNSProbe.Fqdn)
	}
}

func runCorednsTest(t *testing.T, coreDNSFragment *client.TestCaseConfigurationFragment_Coredns) {
	require.NotNil(t, coreDNSFragment, "coredns config must be set")
	require.NotEmpty(t, coreDNSFragment.DialFqdns, "coredns dialFqdns must be set")

	prober, err := dns.NewCoreDNSProber()
	require.NoError(t, err, "failed to create coredns prober")

	for _, fqdn := range coreDNSFragment.DialFqdns {
		t.Run(*fqdn, func(t *testing.T) {
			require.NotNil(t, fqdn, "coredns fqdn must be set")

			err = prober.Probe(*fqdn)
			require.NoError(t, err, "coredns probe failed for %s", *fqdn)
		})
	}
}

func runRawTest(t *testing.T, rawFragment *client.TestCaseConfigurationFragment_Raw, _ *client.SentinelCheckIntegrationTestDefaultConfigurationFragment) {
	require.NotNil(t, rawFragment, "raw config must be set")
	require.NotEmpty(t, rawFragment.Yaml, "raw yaml must be set")

	expected := client.SentinelRawResultSuccess
	if rawFragment.ExpectedResult != nil {
		expected = *rawFragment.ExpectedResult
	}

	err := k8s.KubectlApplyFromStringE(t, k8s.NewKubectlOptions("", "", ""), rawFragment.Yaml)
	t.Cleanup(func() {
		_ = k8s.KubectlDeleteFromStringE(t, k8s.NewKubectlOptions("", "", ""), rawFragment.Yaml)
	})

	switch {
	case err != nil && expected == client.SentinelRawResultSuccess:
		t.Fatalf("failed to apply yaml: %v", err)
	case err == nil && expected == client.SentinelRawResultFailed:
		t.Fatalf("expected failure but got success")
	}

	if err == nil && expected == client.SentinelRawResultSuccess {
		resources, err := helpers.NewRawResourceList(rawFragment.Yaml)
		require.NoError(t, err, "failed to parse raw resources")

		resources.WaitUntilReady(t, 15*time.Minute)
	}
}

func runPVCTest(t *testing.T, pvcFragment *client.TestCaseConfigurationFragment_Pvc, defaults *client.SentinelCheckIntegrationTestDefaultConfigurationFragment) {
	require.NotNil(t, pvcFragment)
	require.NotEmpty(t, pvcFragment.NamePrefix)
	require.NotEmpty(t, pvcFragment.Size)
	require.NotEmpty(t, pvcFragment.StorageClass)

	suffix := rand.String(6)

	namespaceName := fmt.Sprintf("test-%s", suffix)
	pvcName := fmt.Sprintf("%s-%s", pvcFragment.NamePrefix, suffix)
	podName := fmt.Sprintf("pvc-test-%s", suffix)

	namespace := helpers.NewNamespace(namespaceName, helpers.WithNamespaceDefaults(defaults))
	if err := namespace.CreateWithCleanup(t, 5*time.Minute); err != nil {
		require.Fail(t, "failed to create namespace: %v", err)
	}

	// PVC requires at least one consumer to go into bound phase.
	// We need to create both resources first and then wait.
	pvc := helpers.NewPersistentVolumeClaim(
		pvcName,
		namespaceName,
		helpers.WithPersistentVolumeClaimStorageClass(pvcFragment.StorageClass),
		helpers.WithPersistentVolumeClaimSize(pvcFragment.Size),
		helpers.WithPersistentVolumeClaimDefaults(defaults),
	)
	if err := pvc.Create(t); err != nil {
		require.Fail(t, "failed to create pvc %s/%s: %v", namespaceName, pvcName, err)
	}

	pod := helpers.NewPod(podName,
		namespaceName,
		helpers.WithPodImage(helpers.BusyboxImage),
		helpers.WithPodCommand("sh",
			"-c",
			"echo 'pvc-test' > /data/verify.txt && grep -x 'pvc-test' /data/verify.txt",
		),
		helpers.WithPodVolumes(corev1.Volume{
			Name: "pvc-data",
			VolumeSource: corev1.VolumeSource{
				PersistentVolumeClaim: &corev1.PersistentVolumeClaimVolumeSource{
					ClaimName: pvcName,
				},
			},
		}),
		helpers.WithPodVolumeMounts(corev1.VolumeMount{
			Name:      "pvc-data",
			MountPath: "/data",
		}),
		helpers.WithPodDefaults(defaults),
	)
	if err := pod.Create(t); err != nil {
		require.Fail(t, "failed to create pod %s/%s: %v", namespaceName, podName, err)
	}

	if err := pvc.WaitForReady(t, 5*time.Minute); err != nil {
		require.Fail(t, "pvc %s/%s did not become ready: %v", namespaceName, pvcName, err)
	}

	if err := pod.WaitForReady(t, 5*time.Minute); err != nil {
		require.Fail(t, "pod %s/%s did not succeed: %v", namespaceName, podName, err)
	}
}

func loadIntegrationTestCases(t *testing.T) types.TestCase {
	t.Helper()

	path := os.Getenv(filePathEnvVar)
	if path == "" {
		require.Fail(t, "test cases file path not set")
	}

	raw, err := os.ReadFile(path)
	require.NoError(t, err, "failed to read test cases file")

	var testCase types.TestCase
	if err = yaml.Unmarshal(raw, &testCase); err != nil {
		require.NoError(t, err, "failed to unmarshal test cases file")
	}

	return testCase
}
