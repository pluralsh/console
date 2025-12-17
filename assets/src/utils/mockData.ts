export const comprehensiveMockJunitXml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Sentinel Test Run" tests="18" failures="3" errors="2" skipped="2" time="156.847">
  <testsuite name="github.com/pluralsh/deployment-operator/dockerfiles/sentinel-harness/terratest" tests="7" failures="1" errors="1" skipped="1" time="78.282" timestamp="2025-12-14T01:32:31Z">
    <properties>
      <property name="go.version" value="go1.25.5 linux/amd64"/>
      <property name="os" value="linux"/>
      <property name="arch" value="amd64"/>
    </properties>
    <testcase classname="github.com/pluralsh/deployment-operator/dockerfiles/sentinel-harness/terratest" name="TestKubernetesHealthSuite/HelloWorldPod" time="5.130"/>
    <testcase classname="github.com/pluralsh/deployment-operator/dockerfiles/sentinel-harness/terratest" name="TestKubernetesHealthSuite/NginxDeploymentAndService" time="0.020"/>
    <testcase classname="github.com/pluralsh/deployment-operator/dockerfiles/sentinel-harness/terratest" name="TestKubernetesHealthSuite/PingJob" time="40.390">
      <system-out>Starting job ping-job...
Waiting for job completion...
Job completed successfully with 3 retries</system-out>
    </testcase>
    <testcase classname="github.com/pluralsh/deployment-operator/dockerfiles/sentinel-harness/terratest" name="TestKubernetesHealthSuite/StatefulSet" time="0.340">
      <skipped message="StatefulSet tests disabled in CI"/>
    </testcase>
    <testcase classname="github.com/pluralsh/deployment-operator/dockerfiles/sentinel-harness/terratest" name="TestKubernetesHealthSuite/PVCBinding" time="12.450">
      <failure message="PVC did not bind within timeout" type="AssertionError">Expected PVC status to be "Bound" but got "Pending"
Waited 30 seconds for binding
Available storage classes: standard, premium-rwo
PVC requested: 10Gi

Stack trace:
  at TestKubernetesHealthSuite/PVCBinding (pvc_test.go:45)
  at runTest (suite.go:123)</failure>
    </testcase>
    <testcase classname="github.com/pluralsh/deployment-operator/dockerfiles/sentinel-harness/terratest" name="TestKubernetesHealthSuite/SecretMount" time="2.100">
      <error message="nil pointer dereference" type="RuntimeError">panic: runtime error: invalid memory address or nil pointer dereference
[signal SIGSEGV: segmentation violation]

goroutine 42 [running]:
github.com/pluralsh/deployment-operator/test.TestSecretMount(0xc0001a4000)
        /workspace/test/secret_test.go:67 +0x1a4
testing.tRunner(0xc0001a4000, 0x1234567)</error>
      <system-err>FATAL: Test crashed unexpectedly</system-err>
    </testcase>
    <testcase classname="github.com/pluralsh/deployment-operator/dockerfiles/sentinel-harness/terratest" name="TestKubernetesHealthSuite" time="78.270"/>
    <system-out>Suite setup: Initializing Kubernetes client...
Connected to cluster: kind-sentinel-test
Namespace created: test-ns-abc123
Suite teardown: Cleaning up resources...</system-out>
    <system-err>WARN: Some pods took longer than expected to terminate</system-err>
  </testsuite>

  <testsuite name="github.com/pluralsh/console/api/v1alpha1" tests="6" failures="1" errors="0" skipped="1" time="45.230" timestamp="2025-12-14T01:33:50Z" file="api_test.go">
    <properties>
      <property name="go.version" value="go1.25.5 linux/amd64"/>
      <property name="kubernetes.version" value="v1.29.0"/>
    </properties>
    <testcase classname="api/v1alpha1" name="TestServiceAccountValidation" time="0.450" file="api_test.go" line="23">
      <properties>
        <property name="category" value="validation"/>
        <property name="priority" value="high"/>
      </properties>
    </testcase>
    <testcase classname="api/v1alpha1" name="TestCustomResourceDefinition" time="1.230" file="api_test.go" line="89"/>
    <testcase classname="api/v1alpha1" name="TestWebhookConfiguration" time="3.560" file="api_test.go" line="145">
      <failure message="webhook response timeout" type="TimeoutError">Expected webhook to respond within 5s
Actual response time: 8.234s

Request details:
  - Endpoint: /validate-v1alpha1-service
  - Method: POST
  - Payload size: 2.3KB</failure>
      <system-out>Webhook server started on :8443
Received validation request for Service/default/nginx
Processing admission review...</system-out>
      <system-err>WARN: Slow webhook response detected</system-err>
    </testcase>
    <testcase classname="api/v1alpha1" name="TestRBACPermissions" time="0.890" file="api_test.go" line="201">
      <skipped/>
    </testcase>
    <testcase classname="api/v1alpha1" name="TestStatusConditions" time="2.100" file="api_test.go" line="267"/>
    <testcase classname="api/v1alpha1" name="TestFinalizers" time="4.500" file="api_test.go" line="312">
      <system-out>Adding finalizer: plural.sh/cleanup
Removing finalizer: plural.sh/cleanup
Finalizer removed successfully</system-out>
    </testcase>
  </testsuite>

  <testsuite name="github.com/pluralsh/console/internal/controller" tests="5" failures="1" errors="1" skipped="0" time="33.335" timestamp="2025-12-14T01:34:35Z">
    <testcase classname="internal/controller" name="TestReconcileCreate" time="8.200">
      <system-out>Reconciling ServiceDeployment/default/nginx
Creating deployment nginx in namespace default
Deployment created successfully
Setting status to Ready</system-out>
    </testcase>
    <testcase classname="internal/controller" name="TestReconcileUpdate" time="5.670"/>
    <testcase classname="internal/controller" name="TestReconcileDelete" time="3.450">
      <failure message="finalizer not removed" type="AssertionError">Expected resource to be deleted but finalizer still present
Resource: ServiceDeployment/default/nginx
Finalizers: [plural.sh/service-cleanup]
Deletion timestamp: 2025-12-14T01:34:40Z</failure>
    </testcase>
    <testcase classname="internal/controller" name="TestReconcileWithDependencies" time="12.890">
      <error message="context deadline exceeded" type="ContextCanceled">context.DeadlineExceeded: operation timed out after 30s

Pending operations:
  - Waiting for ConfigMap/default/app-config
  - Waiting for Secret/default/app-secrets

Context chain:
  - root context (background)
  - timeout context (30s)
  - reconcile context (ServiceDeployment/default/nginx)</error>
    </testcase>
    <testcase classname="internal/controller" name="TestReconcileStatus" time="3.125"/>
  </testsuite>
</testsuites>`
