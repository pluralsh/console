package controller

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"os"
	"path/filepath"
	goruntime "runtime"
	"slices"
	"strings"
	"testing"
	"time"

	"github.com/google/go-containerregistry/pkg/name"
	"github.com/google/go-containerregistry/pkg/registry"
	v1 "github.com/google/go-containerregistry/pkg/v1"
	"github.com/google/go-containerregistry/pkg/v1/mutate"
	"github.com/google/go-containerregistry/pkg/v1/random"
	"github.com/google/go-containerregistry/pkg/v1/remote"
	. "github.com/onsi/gomega"
	"github.com/samber/lo"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	storagev1 "k8s.io/api/storage/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/envtest"

	console "github.com/pluralsh/console/go/client"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/guest"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/juicefs"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/probe"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate/ateapi"
)

const (
	devboxTestNamespace = "plrl-deploy-operator"
	devboxTestVersion   = "0.12.0"
)

// The devbox tests are plain Go tests with their own envtest, so `go test -run Devbox` selects them.
type devboxEnv struct {
	client    client.Client
	scheme    *runtime.Scheme
	registry  string
	substrate *fakeSubstrate
	console   *fakeDevboxConsole
	r         *DevboxRunnerReconciler
}

func startDevboxEnv(t *testing.T) *devboxEnv {
	t.Helper()
	assets := os.Getenv("KUBEBUILDER_ASSETS")
	if assets == "" {
		assets = filepath.Join("..", "..", "bin", "k8s", fmt.Sprintf("1.35.0-%s-%s", goruntime.GOOS, goruntime.GOARCH))
	}
	testEnv := &envtest.Environment{
		CRDDirectoryPaths:     []string{filepath.Join("..", "..", "config", "crd", "bases"), filepath.Join("..", "..", "test", "crd")},
		ErrorIfCRDPathMissing: true,
		BinaryAssetsDirectory: assets,
	}
	// Without a default route (sandboxed CI) kube-apiserver can't pick an advertise address on its own.
	testEnv.ControlPlane.GetAPIServer().Configure().Set("advertise-address", "127.0.0.1")
	// Substrate needs pod certificates; without the gate the API server drops the gateway's podCertificate volumes.
	testEnv.ControlPlane.GetAPIServer().Configure().Set("feature-gates", "PodCertificateRequest=true,ClusterTrustBundle=true,ClusterTrustBundleProjection=true")
	testEnv.ControlPlane.GetAPIServer().Configure().Set("runtime-config", "certificates.k8s.io/v1beta1=true")
	cfg, err := testEnv.Start()
	if err != nil {
		t.Fatalf("starting envtest: %v", err)
	}
	t.Cleanup(func() { _ = testEnv.Stop() })

	scheme := runtime.NewScheme()
	if err := clientgoscheme.AddToScheme(scheme); err != nil {
		t.Fatal(err)
	}
	if err := v1alpha1.AddToScheme(scheme); err != nil {
		t.Fatal(err)
	}
	c, err := client.New(cfg, client.Options{Scheme: scheme})
	if err != nil {
		t.Fatal(err)
	}

	ctx := context.Background()
	for _, ns := range []string{devboxTestNamespace, "ate-system"} {
		if err := c.Create(ctx, &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{Name: ns}}); err != nil {
			t.Fatal(err)
		}
	}

	reg := httptest.NewServer(registry.New())
	t.Cleanup(reg.Close)

	env := &devboxEnv{
		client:    c,
		scheme:    scheme,
		registry:  strings.TrimPrefix(reg.URL, "http://"),
		substrate: newFakeSubstrate(),
		console:   newFakeDevboxConsole(),
	}
	env.r = &DevboxRunnerReconciler{
		Client:    c,
		APIReader: c,
		Scheme:    scheme,
		Config: DevboxConfig{
			Enabled:             true,
			OperatorVersion:     devboxTestVersion,
			OperatorNamespace:   devboxTestNamespace,
			DefaultImage:        env.registry + "/devbox-fat:" + devboxTestVersion,
			RuntimeImage:        env.registry + "/devbox-runtime-core:" + devboxTestVersion,
			GatewayImage:        "ghcr.io/pluralsh/devbox-gateway:" + devboxTestVersion,
			GatewayReplicas:     1,
			WorkerImages:        map[v1alpha1.DevboxSandboxClass]string{v1alpha1.DevboxSandboxGVisor: "ghcr.io/example/ateworker-gvisor@sha256:abc"},
			WorkerPoolNamespace: devboxTestNamespace,
			SubstrateNamespace:  "ate-system",
			RouterAddress:       "atenet-router.ate-system.svc:443",
			ActorJWTIssuer:      "https://idp.ate-system.svc",
			ConsoleURL:          "https://console.example.com/ext/gql",
			KasURL:              "wss://console.example.com/ext/devbox",
			DeployToken:         "deploy-token",
			ClusterID:           "cluster-id",
			DrainTimeout:        time.Hour,
			HeartbeatInterval:   time.Minute,
		},
		Console:   env.console,
		Substrate: env.substrate,
		Images:    &RegistryImageResolver{Client: c, SecretNamespace: devboxTestNamespace},
		Probe:     &ConfigMapProbeClient{Client: c, Reader: c, Namespace: devboxTestNamespace, Tokens: env.console},
	}
	env.pushRuntime(t, devboxTestVersion)
	return env
}

type imageConfig func(*v1.Config)

func goodDevboxImage(c *v1.Config) {
	c.Labels = map[string]string{
		v1alpha1.DevboxImageContractLabel:      v1alpha1.DevboxImageContractV1,
		v1alpha1.DevboxImageDaemonVersionLabel: devboxTestVersion,
		v1alpha1.DevboxImageFlavorLabel:        "minimal",
	}
	c.User = "1000:1000"
	c.Env = []string{"DEVBOX_TRUST_DIR=/var/lib/devbox/trust"}
}

func runtimeImage(daemonVersion string) imageConfig {
	return func(c *v1.Config) {
		c.Labels = map[string]string{
			v1alpha1.DevboxRuntimeContractLabel:    v1alpha1.DevboxRuntimeContractV1,
			v1alpha1.DevboxImageDaemonVersionLabel: daemonVersion,
			v1alpha1.DevboxImageFlavorLabel:        "core",
		}
		c.Entrypoint = []string{"/devbox-runtime-installer"}
		c.User = ""
		c.Env = nil
	}
}

// pushRuntime writes a fresh runtime image under the tag the reconciler resolves, and returns its digest.
func (e *devboxEnv) pushRuntime(t *testing.T, daemonVersion string) string {
	t.Helper()
	return e.push(t, "devbox-runtime-core:"+devboxTestVersion, runtimeImage(daemonVersion))
}

// push writes a fresh random image to the test registry and returns its digest.
func (e *devboxEnv) push(t *testing.T, repoTag string, configs ...imageConfig) string {
	t.Helper()
	img, err := random.Image(256, 1)
	if err != nil {
		t.Fatal(err)
	}
	cf, err := img.ConfigFile()
	if err != nil {
		t.Fatal(err)
	}
	cfg := cf.Config
	goodDevboxImage(&cfg)
	for _, c := range configs {
		c(&cfg)
	}
	if img, err = mutate.Config(img, cfg); err != nil {
		t.Fatal(err)
	}
	ref, err := name.ParseReference(e.registry + "/" + repoTag)
	if err != nil {
		t.Fatal(err)
	}
	if err := remote.Write(ref, img); err != nil {
		t.Fatal(err)
	}
	digest, err := img.Digest()
	if err != nil {
		t.Fatal(err)
	}
	return digest.String()
}

func (e *devboxEnv) newRunner(t *testing.T, runnerName, image string, mutators ...func(*v1alpha1.DevboxRunner)) *v1alpha1.DevboxRunner {
	t.Helper()
	runner := &v1alpha1.DevboxRunner{
		ObjectMeta: metav1.ObjectMeta{Name: runnerName},
		Spec: v1alpha1.DevboxRunnerSpec{
			Image: lo.ToPtr(e.registry + "/" + image),
			Agents: []v1alpha1.DevboxAgent{
				{Type: v1alpha1.DevboxAgentClaude, Default: lo.ToPtr(true), Models: []string{"claude-sonnet-4-5"}, DefaultModel: lo.ToPtr("claude-sonnet-4-5")},
			},
		},
	}
	for _, m := range mutators {
		m(runner)
	}
	if err := e.client.Create(context.Background(), runner); err != nil {
		t.Fatalf("creating runner: %v", err)
	}
	return runner
}

func (e *devboxEnv) reconcile(t *testing.T, runnerName string, times int) *v1alpha1.DevboxRunner {
	t.Helper()
	for i := 0; i < times; i++ {
		if _, err := e.r.Reconcile(context.Background(), ctrl.Request{NamespacedName: client.ObjectKey{Name: runnerName}}); err != nil {
			t.Fatalf("reconcile %d: %v", i, err)
		}
	}
	return e.get(t, runnerName)
}

func (e *devboxEnv) get(t *testing.T, runnerName string) *v1alpha1.DevboxRunner {
	t.Helper()
	runner := &v1alpha1.DevboxRunner{}
	if err := e.client.Get(context.Background(), client.ObjectKey{Name: runnerName}, runner); err != nil {
		t.Fatalf("getting runner: %v", err)
	}
	return runner
}

func (e *devboxEnv) markGatewayAvailable(t *testing.T) {
	t.Helper()
	d := &appsv1.Deployment{}
	if err := e.client.Get(context.Background(), client.ObjectKey{Name: devboxGatewayName, Namespace: devboxTestNamespace}, d); err != nil {
		t.Fatal(err)
	}
	d.Status.Replicas, d.Status.AvailableReplicas, d.Status.ReadyReplicas = 1, 1, 1
	if err := e.client.Status().Update(context.Background(), d); err != nil {
		t.Fatal(err)
	}
}

// completeProbe plays the gateway's side of the probe handoff.
func (e *devboxEnv) completeProbe(t *testing.T, runnerName string, revision int64, entries ...*devboxv1.AgentCatalogEntry) DevboxProbeRequest {
	t.Helper()
	cm := &corev1.ConfigMap{}
	key := client.ObjectKey{Name: DevboxProbeConfigMapName(runnerName, revision), Namespace: devboxTestNamespace}
	if err := e.client.Get(context.Background(), key, cm); err != nil {
		t.Fatalf("getting probe request: %v", err)
	}
	var req DevboxProbeRequest
	if err := json.Unmarshal([]byte(cm.Data[DevboxProbeRequestKey]), &req); err != nil {
		t.Fatal(err)
	}
	result, err := protojson.Marshal(&devboxv1.ProbeAgentsResponse{Agents: entries})
	if err != nil {
		t.Fatal(err)
	}
	cm.Annotations = map[string]string{DevboxProbeStateAnnotation: DevboxProbeStateDone}
	cm.Data[DevboxProbeResultKey] = string(result)
	if err := e.client.Update(context.Background(), cm); err != nil {
		t.Fatal(err)
	}
	return req
}

func claudeOK() *devboxv1.AgentCatalogEntry {
	return &devboxv1.AgentCatalogEntry{
		Type:            devboxv1.AgentType_AGENT_TYPE_CLAUDE,
		IsDefault:       true,
		AdapterName:     "claude-code-acp",
		AdapterVersion:  "0.9.0",
		ProtocolVersion: 1,
		Models:          []*devboxv1.ConfigOptionValue{{Value: "claude-sonnet-4-5", Name: "Sonnet 4.5"}},
		CurrentModel:    "claude-sonnet-4-5",
		ModelSwitchable: true,
		ProbeStatus:     devboxv1.ProbeStatus_PROBE_STATUS_OK,
	}
}

// buildRevision drives a revision through the golden boot and the probe.
func (e *devboxEnv) buildRevision(t *testing.T, runnerName string, revision int64, entries ...*devboxv1.AgentCatalogEntry) *v1alpha1.DevboxRunner {
	t.Helper()
	runner := e.get(t, runnerName)
	rev := runner.RevisionByNumber(revision)
	if rev == nil {
		t.Fatalf("runner %s has no revision %d", runnerName, revision)
	}
	e.substrate.finishGoldenBoot(*runner.Status.Atespace, rev.Name)
	e.reconcile(t, runnerName, 1)
	e.completeProbe(t, runnerName, revision, entries...)
	return e.reconcile(t, runnerName, 1)
}

func condition(runner *v1alpha1.DevboxRunner, t v1alpha1.ConditionType) *metav1.Condition {
	return meta.FindStatusCondition(runner.Status.Conditions, t.String())
}

func TestDevboxRunnerCRDValidation(t *testing.T) {
	g := NewWithT(t)
	env := startDevboxEnv(t)
	ctx := context.Background()

	agents := func(defaults ...bool) []v1alpha1.DevboxAgent {
		types := []v1alpha1.DevboxAgentType{v1alpha1.DevboxAgentClaude, v1alpha1.DevboxAgentCodex, v1alpha1.DevboxAgentGemini}
		return lo.Map(defaults, func(d bool, i int) v1alpha1.DevboxAgent {
			return v1alpha1.DevboxAgent{Type: types[i], Default: lo.ToPtr(d)}
		})
	}

	cases := map[string]struct {
		spec v1alpha1.DevboxRunnerSpec
		err  string
	}{
		"no default agent":   {spec: v1alpha1.DevboxRunnerSpec{Agents: agents(false, false)}, err: "exactly one agent must be marked default"},
		"two default agents": {spec: v1alpha1.DevboxRunnerSpec{Agents: agents(true, true)}, err: "exactly one agent must be marked default"},
		"no agents":          {spec: v1alpha1.DevboxRunnerSpec{}, err: "spec.agents"},
		"default model outside allowlist": {spec: v1alpha1.DevboxRunnerSpec{Agents: []v1alpha1.DevboxAgent{
			{Type: v1alpha1.DevboxAgentClaude, Default: lo.ToPtr(true), Models: []string{"a"}, DefaultModel: lo.ToPtr("b")},
		}}, err: "defaultModel must be one of models"},
		"unknown agent type": {spec: v1alpha1.DevboxRunnerSpec{Agents: []v1alpha1.DevboxAgent{{Type: "cursor", Default: lo.ToPtr(true)}}}, err: "Unsupported value"},
		"identity with two providers": {spec: v1alpha1.DevboxRunnerSpec{Agents: agents(true), CloudIdentities: []v1alpha1.DevboxCloudIdentity{{
			Name: "both",
			AWS:  &v1alpha1.DevboxAWSIdentity{RoleArn: "arn:aws:iam::123456789012:role/x"},
			GCP:  &v1alpha1.DevboxGCPIdentity{WorkloadIdentityProvider: "p", ServiceAccount: "s"},
		}}}, err: "exactly one of aws, gcp or azure must be set"},
		"two default identities": {spec: v1alpha1.DevboxRunnerSpec{Agents: agents(true), CloudIdentities: []v1alpha1.DevboxCloudIdentity{
			{Name: "a", Default: lo.ToPtr(true), Azure: &v1alpha1.DevboxAzureIdentity{TenantID: "t", ClientID: "c"}},
			{Name: "b", Default: lo.ToPtr(true), Azure: &v1alpha1.DevboxAzureIdentity{TenantID: "t", ClientID: "c"}},
		}}, err: "at most one cloud identity can be marked default"},
		"bad cpu threshold": {spec: v1alpha1.DevboxRunnerSpec{Agents: agents(true), IdlePolicy: &v1alpha1.DevboxIdlePolicy{CPUThreshold: lo.ToPtr("five")}}, err: "cpuThreshold"},
	}
	i := 0
	for desc, tc := range cases {
		i++
		runner := &v1alpha1.DevboxRunner{ObjectMeta: metav1.ObjectMeta{Name: fmt.Sprintf("invalid-%d", i)}, Spec: tc.spec}
		err := env.client.Create(ctx, runner)
		g.Expect(err).To(HaveOccurred(), desc)
		g.Expect(err.Error()).To(ContainSubstring(tc.err), desc)
	}

	valid := &v1alpha1.DevboxRunner{ObjectMeta: metav1.ObjectMeta{Name: "valid"}, Spec: v1alpha1.DevboxRunnerSpec{
		Agents: agents(true, false),
		CloudIdentities: []v1alpha1.DevboxCloudIdentity{
			{Name: "aws", Default: lo.ToPtr(true), AWS: &v1alpha1.DevboxAWSIdentity{RoleArn: "arn:aws:iam::123456789012:role/devbox"}},
			{Name: "gcp", GCP: &v1alpha1.DevboxGCPIdentity{WorkloadIdentityProvider: "p", ServiceAccount: "s"}},
		},
		IdlePolicy: &v1alpha1.DevboxIdlePolicy{},
		Resources:  &v1alpha1.DevboxResources{},
		WorkerPool: &v1alpha1.DevboxWorkerPool{},
	}}
	g.Expect(env.client.Create(ctx, valid)).To(Succeed())

	created := env.get(t, "valid")
	g.Expect(created.Spec.IdlePolicy.ActivityWindow.Duration).To(Equal(2 * time.Minute))
	g.Expect(*created.Spec.IdlePolicy.CPUThreshold).To(Equal("5%"))
	g.Expect(created.Spec.IdlePolicy.CompleteAfter.Duration).To(Equal(14 * 24 * time.Hour))
	g.Expect(created.Spec.Resources.Memory.String()).To(Equal("4Gi"))
	g.Expect(*created.Spec.WorkerPool.Replicas).To(Equal(int32(1)))
	g.Expect(*created.Spec.WorkerPool.SandboxClass).To(Equal(v1alpha1.DevboxSandboxGVisor))

	created.Spec.WorkerPool.SandboxClass = lo.ToPtr(v1alpha1.DevboxSandboxMicroVM)
	err := env.client.Update(ctx, created)
	g.Expect(err).To(HaveOccurred())
	g.Expect(err.Error()).To(ContainSubstring("sandboxClass is immutable"))
}

func TestDevboxRunnerController(t *testing.T) {
	env := startDevboxEnv(t)
	ctx := context.Background()

	t.Run("the first reconcile only saves the finalizer", func(t *testing.T) {
		g := NewWithT(t)
		env.push(t, "devbox:v1")
		env.newRunner(t, "finalizer-first", "devbox:v1")

		res, err := env.r.Reconcile(ctx, ctrl.Request{NamespacedName: client.ObjectKey{Name: "finalizer-first"}})
		g.Expect(err).NotTo(HaveOccurred())
		g.Expect(res.RequeueAfter).To(BeNumerically(">", 0))
		runner := env.get(t, "finalizer-first")
		g.Expect(runner.Finalizers).To(ContainElement(DevboxRunnerFinalizer))
		g.Expect(runner.Status.Atespace).To(BeNil())
		env.console.mu.Lock()
		g.Expect(env.console.devboxes).NotTo(HaveKey("finalizer-first"))
		env.console.mu.Unlock()

		g.Expect(env.client.Delete(ctx, runner)).To(Succeed())
		_, err = env.r.Reconcile(ctx, ctrl.Request{NamespacedName: client.ObjectKey{Name: "finalizer-first"}})
		g.Expect(err).NotTo(HaveOccurred())
		g.Eventually(func() bool {
			return apierrors.IsNotFound(env.client.Get(ctx, client.ObjectKey{Name: "finalizer-first"}, &v1alpha1.DevboxRunner{}))
		}).Should(BeTrue())
	})

	t.Run("reconcile creates the WorkerPool, gateway, first revision and console Devbox", func(t *testing.T) {
		g := NewWithT(t)
		digest := env.push(t, "devbox:v1")
		env.newRunner(t, "platform", "devbox:v1")

		runner := env.reconcile(t, "platform", 2)
		g.Expect(runner.Finalizers).To(ContainElement(DevboxRunnerFinalizer))
		g.Expect(*runner.Status.ResolvedImage).To(Equal(env.registry + "/devbox@" + digest))
		g.Expect(condition(runner, v1alpha1.DevboxImageContractConditionType).Status).To(Equal(metav1.ConditionTrue))
		g.Expect(condition(runner, v1alpha1.DevboxRuntimeResolvedConditionType).Status).To(Equal(metav1.ConditionTrue))
		g.Expect(*runner.Status.ResolvedRuntime).To(HavePrefix(env.registry + "/devbox-runtime-core@sha256:"))
		g.Expect(*runner.Status.DaemonVersion).To(Equal(devboxTestVersion))

		pool := &unstructured.Unstructured{}
		pool.SetGroupVersionKind(workerPoolGVK)
		g.Expect(env.client.Get(ctx, client.ObjectKey{Name: "devbox-platform", Namespace: devboxTestNamespace}, pool)).To(Succeed())
		g.Expect(pool.GetLabels()).To(HaveKeyWithValue(v1alpha1.DevboxRunnerNameLabel, "platform"))
		g.Expect(pool.GetOwnerReferences()).To(HaveLen(1))
		replicas, _, _ := unstructured.NestedInt64(pool.Object, "spec", "replicas")
		g.Expect(replicas).To(Equal(int64(1)))
		classes, _, _ := unstructured.NestedSlice(pool.Object, "spec", "sandboxClasses")
		g.Expect(classes).To(ConsistOf(HaveKeyWithValue("name", "gvisor")))
		workerImage, _, _ := unstructured.NestedString(pool.Object, "spec", "workerImage")
		g.Expect(workerImage).To(Equal("ghcr.io/example/ateworker-gvisor@sha256:abc"))
		g.Expect(condition(runner, v1alpha1.DevboxWorkerPoolReadyConditionType).Status).To(Equal(metav1.ConditionFalse))

		g.Expect(unstructured.SetNestedField(pool.Object, map[string]any{"replicas": int64(1), "readyReplicas": int64(1)}, "status")).To(Succeed())
		g.Expect(env.client.Status().Update(ctx, pool)).To(Succeed())
		runner = env.reconcile(t, "platform", 2)
		g.Expect(condition(runner, v1alpha1.DevboxWorkerPoolReadyConditionType)).To(HaveField("Status", metav1.ConditionTrue),
			"an unchanged WorkerPool still reports its ready workers")

		deployment := &appsv1.Deployment{}
		g.Expect(env.client.Get(ctx, client.ObjectKey{Name: devboxGatewayName, Namespace: devboxTestNamespace}, deployment)).To(Succeed())
		g.Expect(deployment.Spec.Template.Spec.Containers[0].Image).To(Equal("ghcr.io/pluralsh/devbox-gateway:" + devboxTestVersion))
		g.Expect(deployment.Spec.Template.Spec.ServiceAccountName).To(Equal(devboxGatewayName))
		platform := env.get(t, "platform")
		g.Expect(deployment.GetOwnerReferences()).To(ContainElement(SatisfyAll(
			HaveField("UID", platform.UID), HaveField("Kind", "DevboxRunner"), HaveField("Controller", BeNil()),
		)), "the shared gateway is owned by, but not controlled by, each runner")
		g.Expect(deployment.Spec.Template.Spec.Containers[0].Env).To(ContainElements(
			corev1.EnvVar{Name: "CONSOLE_URL", Value: "https://console.example.com/ext/gql"},
			corev1.EnvVar{Name: "CLUSTER_ID", Value: "cluster-id"},
			corev1.EnvVar{Name: "DEVBOX_ROUTER_ADDRESS", Value: "atenet-router.ate-system.svc:443"},
			corev1.EnvVar{Name: "DEVBOX_ACTOR_JWT_ISSUER", Value: "https://idp.ate-system.svc"},
			corev1.EnvVar{Name: "DEVBOX_GATEWAY_HOST", Value: "devbox-gateway." + devboxTestNamespace + ".svc"},
			corev1.EnvVar{Name: "DEVBOX_EGRESS_AUTHZ_HOST", Value: "devbox-egress-authz." + devboxTestNamespace + ".svc"},
			corev1.EnvVar{Name: "DEVBOX_SUBSTRATE_NAMESPACE", Value: "ate-system"},
			corev1.EnvVar{Name: "DEVBOX_PROBE_NAMESPACE", Value: devboxTestNamespace},
			corev1.EnvVar{Name: "DEVBOX_MCP_ADDR", Value: ":8080"},
			corev1.EnvVar{Name: "DEVBOX_CREDENTIAL_PROVIDER_ADDR", Value: ":50052"},
			corev1.EnvVar{Name: "DEVBOX_EXTPROC_ADDR", Value: ":50053"},
		))
		podName, _ := lo.Find(deployment.Spec.Template.Spec.Containers[0].Env, func(e corev1.EnvVar) bool { return e.Name == "POD_NAME" })
		g.Expect(podName.ValueFrom.FieldRef.FieldPath).To(Equal("metadata.name"))
		var serviceDNS *corev1.PodCertificateProjection
		for _, v := range deployment.Spec.Template.Spec.Volumes {
			if v.Name == "servicedns" {
				serviceDNS = v.Projected.Sources[0].PodCertificate
			}
		}
		g.Expect(serviceDNS).NotTo(BeNil())
		g.Expect(serviceDNS.SignerName).To(Equal(servicednsSigner))
		volumes := lo.Map(deployment.Spec.Template.Spec.Volumes, func(v corev1.Volume, _ int) string { return v.Name })
		g.Expect(volumes).To(ContainElements("ate-api", "podidentity", "servicedns"))
		for _, name := range []string{devboxGatewayName, devboxEgressAuthzName} {
			svc := &corev1.Service{}
			g.Expect(env.client.Get(ctx, client.ObjectKey{Name: name, Namespace: devboxTestNamespace}, svc)).To(Succeed())
			g.Expect(labels.SelectorFromSet(svc.Spec.Selector).Matches(labels.Set(deployment.Spec.Template.Labels))).To(BeTrue(),
				"both Services must select the gateway pods so the servicedns certificate covers their names")
			g.Expect(svc.CreationTimestamp.Time).NotTo(BeTemporally(">", deployment.CreationTimestamp.Time),
				"Services are created before the gateway pods request their certificate")
		}
		g.Expect(env.client.Get(ctx, client.ObjectKey{Name: devboxGatewayName, Namespace: devboxTestNamespace}, &corev1.ServiceAccount{})).To(Succeed())
		policy := &networkingv1.NetworkPolicy{}
		g.Expect(env.client.Get(ctx, client.ObjectKey{Name: devboxGatewayName, Namespace: devboxTestNamespace}, policy)).To(Succeed())
		g.Expect(policy.Spec.Ingress[0].From[0].PodSelector.MatchLabels).To(HaveKeyWithValue("app", "atenet-egress"))
		ns := &corev1.Namespace{}
		g.Expect(env.client.Get(ctx, client.ObjectKey{Name: devboxTestNamespace}, ns)).To(Succeed())
		g.Expect(ns.Labels).To(HaveKeyWithValue(ateAPIAccessLabel, "true"))

		g.Expect(condition(runner, v1alpha1.DevboxGatewayReadyConditionType).Status).To(Equal(metav1.ConditionFalse))
		substrateInstall := condition(runner, v1alpha1.DevboxSubstrateInstallConditionType)
		g.Expect(substrateInstall.Status).To(Equal(metav1.ConditionFalse))
		g.Expect(substrateInstall.Message).To(ContainSubstring("Substrate is not installed"))

		atespace := *runner.Status.Atespace
		g.Expect(atespace).To(HavePrefix("devbox-platform-"))
		g.Expect(env.substrate.hasAtespace(atespace)).To(BeTrue())
		g.Expect(env.substrate.policies[atespace]["editor"]).To(ContainElement("user:system:serviceaccount:" + devboxTestNamespace + ":devbox-gateway"))
		g.Expect(env.substrate.policies[globalPolicy]["viewer"]).To(ContainElement("user:system:serviceaccount:" + devboxTestNamespace + ":devbox-gateway"))

		g.Expect(runner.Status.Revisions).To(HaveLen(1))
		g.Expect(runner.Status.Revisions[0].Phase).To(Equal(v1alpha1.DevboxRevisionBuilding))
		tmpl := env.substrate.template(atespace, "platform-r1")
		g.Expect(tmpl).NotTo(BeNil())
		g.Expect(tmpl.Containers).To(HaveLen(2))
		g.Expect(tmpl.Containers[0].Name).To(Equal("devbox"), "the devbox container must be first, or an updated instance loses its home")
		g.Expect(tmpl.Containers[0].Image).To(Equal(*runner.Status.ResolvedImage))
		g.Expect(tmpl.Containers[0].Command[:2]).To(Equal([]string{"/bin/sh", "-c"}))
		g.Expect(tmpl.Containers[1].Name).To(Equal("plural-runtime"))
		g.Expect(tmpl.Containers[1].Image).To(Equal(*runner.Status.ResolvedRuntime))
		g.Expect(*runner.Status.Revisions[0].Runtime).To(Equal(*runner.Status.ResolvedRuntime))
		g.Expect(*runner.Status.Revisions[0].DaemonVersion).To(Equal(devboxTestVersion))
		g.Expect(tmpl.WorkerSelector.MatchLabels).To(Equal(map[string]string{"devboxes.plural.sh/runner.platform": "true"}))
		g.Expect(pool.GetLabels()).To(HaveKeyWithValue("devboxes.plural.sh/runner.platform", "true"))
		g.Expect(tmpl.Containers[0].WakeupProbe.HttpGet.Path).To(Equal("/readyz"))
		g.Expect(tmpl.Containers[0].GetSecurityContext().GetCapabilities().GetAdd()).To(ConsistOf("SETUID", "SETGID", "SETFCAP"))
		g.Expect(tmpl.Resources.Limits.MemoryBytes).To(Equal(int64(4 << 30)))
		g.Expect(tmpl.GoldenEgressPolicy).To(BeNil())

		g.Expect(runner.Status.ID).NotTo(BeNil())
		upsert := env.console.lastUpsert("platform")
		g.Expect(upsert).NotTo(BeNil())
		g.Expect(upsert.Agents).To(HaveLen(1))
		g.Expect(*upsert.Agents[0].ProbeStatus).To(Equal(console.DevboxProbeStatusPending))
		g.Expect(condition(runner, v1alpha1.ReadyConditionType).Status).To(Equal(metav1.ConditionFalse))
	})

	t.Run("golden tag hands off to the probe, then the revision serves and console gets the catalog", func(t *testing.T) {
		g := NewWithT(t)
		env.markGatewayAvailable(t)
		runner := env.get(t, "platform")
		env.substrate.finishGoldenBoot(*runner.Status.Atespace, "platform-r1")

		runner = env.reconcile(t, "platform", 1)
		g.Expect(runner.Status.Revisions[0].Phase).To(Equal(v1alpha1.DevboxRevisionProbing))
		probeKey := DevboxProbeConfigMapName("platform", 1)
		tokens := &corev1.Secret{}
		g.Expect(env.client.Get(ctx, client.ObjectKey{Name: DevboxProbeTokenSecretName, Namespace: devboxTestNamespace}, tokens)).To(Succeed())
		var token struct {
			Token     string    `json:"token"`
			ExpiresAt time.Time `json:"expiresAt"`
		}
		g.Expect(json.Unmarshal(tokens.Data[probeKey], &token)).To(Succeed())
		g.Expect(token.Token).To(HavePrefix("probe-" + *runner.Status.ID))
		mints := env.console.mintCount()
		env.reconcile(t, "platform", 1)
		g.Expect(env.console.mintCount()).To(Equal(mints), "a valid token is not re-minted")

		req := env.completeProbe(t, "platform", 1, claudeOK())
		g.Expect(req.TokenSecret).NotTo(BeNil())
		g.Expect(req.TokenSecret.Name).To(Equal(DevboxProbeTokenSecretName))
		g.Expect(req.TokenSecret.Key).To(Equal(probeKey))
		g.Expect(req.GoldenTag).To(Equal("platform-r1-golden"))
		g.Expect(req.DevboxID).To(Equal(*runner.Status.ID))
		g.Expect(req.Atespace).To(Equal(*runner.Status.Atespace))
		probe := &devboxv1.ProbeAgentsRequest{}
		g.Expect(protojson.Unmarshal(req.Probe, probe)).To(Succeed())
		g.Expect(probe.Agents[0].Type).To(Equal(devboxv1.AgentType_AGENT_TYPE_CLAUDE))
		g.Expect(probe.Agents[0].IsDefault).To(BeTrue())

		runner = env.reconcile(t, "platform", 1)
		g.Expect(runner.Status.Revisions[0].Phase).To(Equal(v1alpha1.DevboxRevisionReady))
		g.Expect(env.client.Get(ctx, client.ObjectKey{Name: DevboxProbeTokenSecretName, Namespace: devboxTestNamespace}, tokens)).To(Succeed())
		g.Expect(tokens.Data).NotTo(HaveKey(probeKey), "the token is dropped once the probe finished")
		g.Expect(*runner.Status.TemplateRevision).To(Equal(int64(1)))
		g.Expect(*runner.Status.TemplateName).To(Equal("platform-r1"))
		g.Expect(runner.Status.Agents).To(ConsistOf(HaveField("ProbeStatus", "OK")))
		g.Expect(condition(runner, v1alpha1.DevboxTemplateReadyConditionType).Status).To(Equal(metav1.ConditionTrue))
		g.Expect(condition(runner, v1alpha1.ReadyConditionType).Status).To(Equal(metav1.ConditionTrue))

		upsert := env.console.lastUpsert("platform")
		g.Expect(*upsert.TemplateRevision).To(Equal("platform-r1"))
		g.Expect(*upsert.Revision).To(Equal(int64(1)), "instances report their revision by number")
		g.Expect(*upsert.RuntimeImage).To(Equal(*runner.Status.ResolvedRuntime))
		g.Expect(*upsert.DaemonVersion).To(Equal(devboxTestVersion))
		g.Expect(*upsert.UpdateMode).To(Equal(console.DevboxUpdateModeOnResume))
		g.Expect(*upsert.Agents[0].ProbeStatus).To(Equal(console.DevboxProbeStatusOk))
		g.Expect(*upsert.Agents[0].AdapterName).To(Equal("claude-code-acp"))
		g.Expect(upsert.Agents[0].Models).To(ConsistOf(&console.DevboxModelAttributes{ID: "claude-sonnet-4-5", Name: lo.ToPtr("Sonnet 4.5")}))
		g.Expect(upsert.Agents[0].AllowedModels).To(ConsistOf(lo.ToPtr("claude-sonnet-4-5")))
		hb := env.console.lastHeartbeat()
		g.Expect(*hb.Status).To(Equal(console.DevboxStatusDegraded)) // Substrate install check fails in envtest
		g.Expect(*hb.TemplateRevision).To(Equal("platform-r1"))
	})

	t.Run("a spec change rolls a new revision and GC waits for references", func(t *testing.T) {
		g := NewWithT(t)
		runner := env.get(t, "platform")
		atespace := *runner.Status.Atespace
		runner.Spec.BootstrapScript = lo.ToPtr("npm i -g pnpm")
		runner.Spec.Repositories = []v1alpha1.DevboxRepository{{URL: "https://github.com/pluralsh/console", Branch: lo.ToPtr("master")}}
		runner.Spec.HTTPAllowlist = []v1alpha1.DevboxHTTPAllowlistEntry{{Host: "registry.npmjs.org"}}
		runner.Spec.PackageServers = &v1alpha1.DevboxPackageServers{Rust: lo.ToPtr(false)}
		runner.Spec.Env = []v1alpha1.DevboxEnvVar{
			{Name: "MODE", Value: lo.ToPtr("dev")},
			{Name: "API_TOKEN", ValueFrom: &v1alpha1.DevboxEnvVarSource{SecretKeyRef: v1alpha1.DevboxSecretKeySelector{Name: "platform-creds", Key: "token"}}},
		}
		g.Expect(env.client.Update(ctx, runner)).To(Succeed())
		g.Expect(*env.get(t, "platform").Spec.PackageServers.Go).To(BeTrue(), "the API server defaults unset ecosystems")
		for _, bad := range []v1alpha1.DevboxEnvVar{
			{Name: "DEVBOX_ID", Value: lo.ToPtr("x")},
			{Name: "BOTH", Value: lo.ToPtr("x"), ValueFrom: &v1alpha1.DevboxEnvVarSource{SecretKeyRef: v1alpha1.DevboxSecretKeySelector{Name: "s", Key: "k"}}},
			{Name: "NEITHER"},
		} {
			invalid := env.get(t, "platform")
			invalid.Spec.Env = append(invalid.Spec.Env, bad)
			g.Expect(apierrors.IsInvalid(env.client.Update(ctx, invalid))).To(BeTrue(), "env %s is rejected", bad.Name)
		}

		runner = env.reconcile(t, "platform", 1)
		g.Expect(runner.Status.Revisions).To(HaveLen(2))
		g.Expect(runner.LatestRevision().Name).To(Equal("platform-r2"))
		g.Expect(runner.LatestRevision().Phase).To(Equal(v1alpha1.DevboxRevisionBuilding))
		g.Expect(*runner.Status.TemplateRevision).To(Equal(int64(1)), "r1 keeps serving while r2 builds")
		r2 := env.substrate.template(atespace, "platform-r2")
		g.Expect(r2.GoldenEgressPolicy.Rules[0].Https.Hostnames).To(ContainElements("registry.npmjs.org", "proxy.golang.org", "repo.hex.pm"))
		g.Expect(r2.GoldenEgressPolicy.Rules[0].Https.Hostnames).NotTo(ContainElement("index.crates.io"))
		g.Expect(r2.Containers[0].Env).To(ContainElement(&ateapi.EnvVar{Name: "MODE", Value: "dev"}))
		g.Expect(r2.Containers[0].Env).NotTo(ContainElement(HaveField("Name", "API_TOKEN")), "secret env never enters the template")

		envCondition := condition(runner, v1alpha1.DevboxEnvConditionType)
		g.Expect(envCondition.Status).To(Equal(metav1.ConditionFalse))
		g.Expect(envCondition.Message).To(ContainSubstring("API_TOKEN (secret " + devboxTestNamespace + "/platform-creds not found)"))
		g.Expect(env.client.Create(ctx, &corev1.Secret{ObjectMeta: metav1.ObjectMeta{Name: "platform-creds", Namespace: devboxTestNamespace},
			Data: map[string][]byte{"token": []byte("t0k")}})).To(Succeed())
		runner = env.reconcile(t, "platform", 1)
		g.Expect(condition(runner, v1alpha1.DevboxEnvConditionType).Status).To(Equal(metav1.ConditionTrue))
		mirror := &corev1.Secret{}
		g.Expect(env.client.Get(ctx, client.ObjectKey{Name: v1alpha1.DevboxRunnerEnvSecret, Namespace: devboxTestNamespace}, mirror)).To(Succeed())
		g.Expect(string(mirror.Data["platform"])).To(Equal(`{"API_TOKEN":"t0k"}`))
		g.Expect(runner.Status.Revisions).To(HaveLen(2), "resolving secret env does not roll a revision")
		g.Expect(env.substrate.previews["platform-r2"]).To(BeTrue())
		var cfg guest.Config
		g.Expect(r2.Containers[0].Env[0].Name).To(Equal(guest.EnvVar))
		g.Expect(json.Unmarshal([]byte(r2.Containers[0].Env[0].Value), &cfg)).To(Succeed())
		g.Expect(cfg.BootstrapScript).To(Equal("npm i -g pnpm"))
		g.Expect(cfg.Repositories).To(Equal([]guest.Repository{{URL: "https://github.com/pluralsh/console", Branch: "master"}}))
		g.Expect(r2.Containers[0].WakeupProbe.TimeoutSeconds).To(Equal(int32((devboxReadyzTimeout+1800*time.Second)/time.Second)),
			"golden boot work gets the bootstrap timeout on top of the runtime's install")
		scm := lo.Filter(r2.GoldenEgressPolicy.Rules, func(r *ateapi.EgressRule, _ int) bool {
			return slices.Equal(r.GetHttps().GetHostnames(), []string{"github.com"})
		})
		g.Expect(scm).To(HaveLen(1))
		g.Expect(scm[0].Https.Effects.ReplaceHeaders[0].CredentialUri).To(Equal("ate-secret://plural.sh/instances/golden.platform/scm/github.com"))

		runner = env.reconcile(t, "platform", 1)
		g.Expect(runner.Status.Revisions).To(HaveLen(2))

		env.substrate.addActor(atespace, "instance-1", "platform-r1", ateapi.ActorState_ACTOR_STATE_SUSPENDED)
		env.substrate.addActor(atespace, env.substrate.template(atespace, "platform-r1").GetMetadata().GetUid(), "platform-r1", ateapi.ActorState_ACTOR_STATE_RESUMING)
		runner = env.buildRevision(t, "platform", 2, claudeOK())
		g.Expect(*runner.Status.TemplateRevision).To(Equal(int64(2)))
		g.Expect(runner.RevisionByNumber(1).Phase).To(Equal(v1alpha1.DevboxRevisionRetired))
		g.Expect(env.substrate.template(atespace, "platform-r1")).NotTo(BeNil(), "an instance still references r1")

		// The instance was moved to r2 and hasn't started there: the gateway's record names r1 as where it goes
		// back to, which keeps r1 although no actor points at it.
		g.Expect(env.substrate.DeleteActor(ctx, atespace, "instance-1")).To(Succeed())
		env.substrate.addActor(atespace, "instance-1", "platform-r2", ateapi.ActorState_ACTOR_STATE_SUSPENDED)
		record := &corev1.ConfigMap{
			ObjectMeta: metav1.ObjectMeta{Name: "devbox-instance-1", Namespace: devboxTestNamespace, Labels: map[string]string{v1alpha1.DevboxInstanceRecordLabel: "true"}},
			Data:       map[string]string{v1alpha1.DevboxInstanceRecordKey: `{"instanceId":"instance-1","runner":"platform","rebase":{"fromTemplate":"platform-r1","fromRevision":1,"toTemplate":"platform-r2","toRevision":2}}`},
		}
		g.Expect(env.client.Create(ctx, record)).To(Succeed())
		runner = env.reconcile(t, "platform", 1)
		g.Expect(runner.RevisionByNumber(1)).NotTo(BeNil(), "r1 is where a pending update rolls back to")
		g.Expect(env.substrate.template(atespace, "platform-r1")).NotTo(BeNil())

		// It started on r2: the record no longer needs r1.
		record.Data[v1alpha1.DevboxInstanceRecordKey] = `{"instanceId":"instance-1","runner":"platform"}`
		g.Expect(env.client.Update(ctx, record)).To(Succeed())
		g.Expect(env.substrate.DeleteActor(ctx, atespace, "instance-1")).To(Succeed())
		runner = env.reconcile(t, "platform", 1)
		g.Expect(runner.RevisionByNumber(1)).To(BeNil(), "r1's own golden actor is no reference")
		g.Expect(env.substrate.template(atespace, "platform-r1")).To(BeNil())
		err := env.client.Get(ctx, client.ObjectKey{Name: DevboxProbeConfigMapName("platform", 1), Namespace: devboxTestNamespace}, &corev1.ConfigMap{})
		g.Expect(apierrors.IsNotFound(err)).To(BeTrue())
	})

	t.Run("poll re-resolves the tag and rolls a revision on a new digest", func(t *testing.T) {
		g := NewWithT(t)
		before := env.get(t, "platform")
		newDigest := env.push(t, "devbox:v1")
		g.Expect(*before.Status.ResolvedImage).NotTo(HaveSuffix(newDigest))

		runner := env.reconcile(t, "platform", 1)
		g.Expect(*runner.Status.ResolvedImage).To(Equal(*before.Status.ResolvedImage), "interval not elapsed yet")

		runner.Status.ImageResolvedAt = &metav1.Time{Time: time.Now().Add(-2 * time.Hour)}
		g.Expect(env.client.Status().Update(ctx, runner)).To(Succeed())
		runner = env.reconcile(t, "platform", 1)
		g.Expect(*runner.Status.ResolvedImage).To(Equal(env.registry + "/devbox@" + newDigest))
		latest := runner.LatestRevision()
		g.Expect(latest.Revision).To(Equal(int64(3)))
		g.Expect(latest.Image).To(HaveSuffix(newDigest))
		g.Expect(*runner.Status.TemplateRevision).To(Equal(int64(2)), "running instances stay on the old revision")
	})

	t.Run("a missing agent fails the revision and the old one keeps serving", func(t *testing.T) {
		g := NewWithT(t)
		runner := env.get(t, "platform")
		runner.Spec.Agents = append(runner.Spec.Agents, v1alpha1.DevboxAgent{Type: v1alpha1.DevboxAgentCodex})
		g.Expect(env.client.Update(ctx, runner)).To(Succeed())
		runner = env.reconcile(t, "platform", 1)
		latest := runner.LatestRevision()
		g.Expect(latest.Revision).To(Equal(int64(4)))
		g.Expect(runner.RevisionByNumber(3)).To(BeNil(), "the superseded r3 was retired and collected")

		runner = env.buildRevision(t, "platform", 4, claudeOK(), &devboxv1.AgentCatalogEntry{
			Type: devboxv1.AgentType_AGENT_TYPE_CODEX, ProbeStatus: devboxv1.ProbeStatus_PROBE_STATUS_MISSING,
		})
		g.Expect(runner.RevisionByNumber(4).Phase).To(Equal(v1alpha1.DevboxRevisionFailed))
		g.Expect(*runner.Status.TemplateRevision).To(Equal(int64(2)))
		runner = env.reconcile(t, "platform", 1)
		g.Expect(runner.LatestRevision().Revision).To(Equal(int64(4)), "a failed spec is not rebuilt until it changes")
		probeCondition := condition(runner, v1alpha1.DevboxAgentProbeConditionType)
		g.Expect(probeCondition.Status).To(Equal(metav1.ConditionFalse))
		g.Expect(probeCondition.Message).To(ContainSubstring("agent codex is not installed"))
		template := condition(runner, v1alpha1.DevboxTemplateReadyConditionType)
		g.Expect(template.Status).To(Equal(metav1.ConditionFalse))
	})

	t.Run("a golden boot that lost its worker is rebuilt, one that crashed fails", func(t *testing.T) {
		g := NewWithT(t)
		env.push(t, "devbox:v1")
		env.newRunner(t, "rebuild", "devbox:v1")
		runner := env.reconcile(t, "rebuild", 2)
		g.Expect(runner.LatestRevision()).To(HaveField("Phase", v1alpha1.DevboxRevisionBuilding))

		first := *runner.LatestRevision()
		env.substrate.failGoldenBoot(*runner.Status.Atespace, first.Name,
			"GoldenActorCrashed: golden actor crashed before its snapshot was taken: resume failed: worker pod went away while hosting the actor")
		runner = env.reconcile(t, "rebuild", 2)
		g.Expect(runner.RevisionByNumber(1)).To(BeNil(), "the retired r1 was collected")
		latest := runner.LatestRevision()
		g.Expect(latest.Revision).To(Equal(int64(2)))
		g.Expect(latest.Hash).To(Equal(first.Hash), "the same template is rebuilt")
		g.Expect(latest.Phase).To(Equal(v1alpha1.DevboxRevisionBuilding))

		env.substrate.failGoldenBoot(*runner.Status.Atespace, latest.Name, "GoldenActorCrashed: golden actor crashed before its snapshot was taken: exited with code 1")
		runner = env.reconcile(t, "rebuild", 2)
		g.Expect(runner.LatestRevision()).To(SatisfyAll(HaveField("Revision", int64(2)), HaveField("Phase", v1alpha1.DevboxRevisionFailed)))
	})

	t.Run("an image that doesn't run as UID 1000 fails the contract", func(t *testing.T) {
		g := NewWithT(t)
		env.push(t, "custom:bad", func(c *v1.Config) { c.User = "root" })
		env.newRunner(t, "custom", "custom:bad")

		runner := env.reconcile(t, "custom", 2)
		contract := condition(runner, v1alpha1.DevboxImageContractConditionType)
		g.Expect(contract.Status).To(Equal(metav1.ConditionFalse))
		g.Expect(contract.Reason).To(Equal(string(v1alpha1.DevboxImageContractViolatedReason)))
		g.Expect(contract.Message).To(ContainSubstring("want UID 1000"))
		g.Expect(runner.Status.ResolvedImage).To(BeNil())
		g.Expect(runner.Status.Revisions).To(BeEmpty())
		g.Expect(condition(runner, v1alpha1.ReadyConditionType).Status).To(Equal(metav1.ConditionFalse))
		g.Expect(*env.console.lastHeartbeat().Status).To(Equal(console.DevboxStatusFailed))
	})

	t.Run("worker pool scheduling is passed through to the WorkerPool template", func(t *testing.T) {
		g := NewWithT(t)
		env.push(t, "devbox:v1")
		affinity := &corev1.NodeAffinity{RequiredDuringSchedulingIgnoredDuringExecution: &corev1.NodeSelector{
			NodeSelectorTerms: []corev1.NodeSelectorTerm{{MatchExpressions: []corev1.NodeSelectorRequirement{
				{Key: "topology.kubernetes.io/zone", Operator: corev1.NodeSelectorOpIn, Values: []string{"us-east-2a"}},
			}}},
		}}
		env.newRunner(t, "scheduled", "devbox:v1", func(r *v1alpha1.DevboxRunner) {
			r.Spec.WorkerPool = &v1alpha1.DevboxWorkerPool{
				NodeSelector:   map[string]string{"plural.sh/devbox": "scheduled"},
				NodeAffinity:   affinity,
				PodAnnotations: map[string]string{"example.com/team": "devbox"},
			}
		})
		env.reconcile(t, "scheduled", 2)

		pool := &unstructured.Unstructured{}
		pool.SetGroupVersionKind(workerPoolGVK)
		g.Expect(env.client.Get(ctx, client.ObjectKey{Name: "devbox-scheduled", Namespace: devboxTestNamespace}, pool)).To(Succeed())
		annotations, _, _ := unstructured.NestedStringMap(pool.Object, "spec", "template", "annotations")
		g.Expect(annotations).To(Equal(map[string]string{
			"example.com/team": "devbox",
			"cluster-autoscaler.kubernetes.io/safe-to-evict": "false",
			"karpenter.sh/do-not-disrupt":                    "true",
			"karpenter.sh/do-not-evict":                      "true",
		}))
		selector, _, _ := unstructured.NestedStringMap(pool.Object, "spec", "template", "nodeSelector")
		g.Expect(selector).To(HaveKeyWithValue("plural.sh/devbox", "scheduled"))
		terms, _, _ := unstructured.NestedSlice(pool.Object, "spec", "template", "nodeAffinity", "requiredDuringSchedulingIgnoredDuringExecution", "nodeSelectorTerms")
		g.Expect(terms).To(HaveLen(1))

		bad := env.get(t, "scheduled")
		bad.Spec.WorkerPool.PodAnnotations = map[string]string{"ate.dev/worker": "x"}
		err := env.client.Update(ctx, bad)
		g.Expect(err).To(HaveOccurred())
		g.Expect(err.Error()).To(ContainSubstring("ate.dev and its subdomains are reserved"))
	})

	t.Run("autoscaling sizes the pool by instance slots and only removes drained idle workers", func(t *testing.T) {
		g := NewWithT(t)
		env.push(t, "devbox:v1")
		shared := &unstructured.Unstructured{Object: map[string]any{"spec": map[string]any{
			"replicas": int64(1), "workerImage": "ghcr.io/example/ateworker-gvisor@sha256:abc", "sandboxClasses": []any{map[string]any{"name": "gvisor"}},
		}}}
		shared.SetGroupVersionKind(workerPoolGVK)
		shared.SetName("shared")
		shared.SetNamespace(devboxTestNamespace)
		g.Expect(env.client.Create(ctx, shared)).To(Succeed())

		env.newRunner(t, "elastic", "devbox:v1", func(r *v1alpha1.DevboxRunner) {
			r.Spec.WorkerPool = &v1alpha1.DevboxWorkerPool{
				Resources: &corev1.ResourceRequirements{Limits: corev1.ResourceList{
					corev1.ResourceCPU: resource.MustParse("8"), corev1.ResourceMemory: resource.MustParse("32Gi"),
				}},
				DiskSize:        lo.ToPtr(resource.MustParse("110Gi")),
				Autoscaling:     &v1alpha1.DevboxWorkerAutoscaling{MaxReplicas: 5},
				AdditionalPools: []v1alpha1.DevboxWorkerPoolRef{{Name: "shared"}},
			}
		})
		runner := env.reconcile(t, "elastic", 2)

		// 88Gi of disk over 28Gi per slot: 3 instances per worker, each with a third of the worker.
		g.Expect(runner.Status.Capacity.InstancesPerWorker).To(Equal(int32(3)))
		g.Expect(*runner.Status.Capacity.LimitedBy).To(Equal("disk"))
		g.Expect(runner.Status.AdditionalWorkerPools).To(Equal([]string{devboxTestNamespace + "/shared"}))
		tmpl := env.substrate.template(*runner.Status.Atespace, "elastic-r1")
		g.Expect(tmpl.Resources.Limits.CpuMillicores).To(Equal(int64(2666)))
		g.Expect(tmpl.Resources.Limits.MemoryBytes).To(Equal(int64((32<<30 - 128<<20) / 3 >> 20 << 20)))
		g.Expect(tmpl.WorkerSelector.MatchLabels).To(Equal(map[string]string{"devboxes.plural.sh/runner.elastic": "true"}))
		g.Expect(env.client.Get(ctx, client.ObjectKeyFromObject(shared), shared)).To(Succeed())
		g.Expect(shared.GetLabels()).To(HaveKeyWithValue("devboxes.plural.sh/runner.elastic", "true"))

		pool := &unstructured.Unstructured{}
		pool.SetGroupVersionKind(workerPoolGVK)
		poolKey := client.ObjectKey{Name: "devbox-elastic", Namespace: devboxTestNamespace}
		replicas := func() int64 {
			g.Expect(env.client.Get(ctx, poolKey, pool)).To(Succeed())
			n, _, _ := unstructured.NestedInt64(pool.Object, "spec", "replicas")
			return n
		}
		g.Expect(replicas()).To(Equal(int64(1)), "one worker covers the spare instance")

		g.Expect(unstructured.SetNestedField(pool.Object, "ate.dev/worker-pool=devbox-elastic", "status", "selector")).To(Succeed())
		g.Expect(env.client.Status().Update(ctx, pool)).To(Succeed())
		pods := map[string]*corev1.Pod{}
		for _, name := range []string{"worker-a", "worker-b", "worker-c"} {
			pod := &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: devboxTestNamespace, Labels: map[string]string{"ate.dev/worker-pool": "devbox-elastic"}},
				Spec:       corev1.PodSpec{Containers: []corev1.Container{{Name: "worker", Image: "worker"}}},
			}
			g.Expect(env.client.Create(ctx, pod)).To(Succeed())
			pod.Status.Conditions = []corev1.PodCondition{{Type: corev1.PodReady, Status: corev1.ConditionTrue}}
			g.Expect(env.client.Status().Update(ctx, pod)).To(Succeed())
			pods[name] = pod
		}
		setWorker := func(pool, name string, uid types.UID, actors int32) {
			env.substrate.mu.Lock()
			defer env.substrate.mu.Unlock()
			w := testWorker(pool, string(uid), ateapi.WorkerState_WORKER_STATE_ACTIVE, actors)
			w.WorkerNamespace = devboxTestNamespace
			w.Metadata.Name = name
			if existing, ok := env.substrate.workers[name]; ok {
				w.Status.State = existing.Status.State
			}
			env.substrate.workers[name] = w
		}
		setWorker("devbox-elastic", "worker-a", pods["worker-a"].UID, 3)
		setWorker("devbox-elastic", "worker-b", pods["worker-b"].UID, 2)
		setWorker("devbox-elastic", "worker-c", pods["worker-c"].UID, 0)
		setWorker("shared", "shared-0", "shared-pod", 4)

		// 5 instances and a spare need 2 workers: the idle one is drained and marked for removal.
		runner = env.reconcile(t, "elastic", 1)
		g.Expect(replicas()).To(Equal(int64(2)))
		g.Expect(env.substrate.workers["worker-c"].Status.State).To(Equal(ateapi.WorkerState_WORKER_STATE_DRAINING))
		g.Expect(env.substrate.workers["worker-a"].Status.State).To(Equal(ateapi.WorkerState_WORKER_STATE_ACTIVE))
		g.Expect(env.client.Get(ctx, client.ObjectKeyFromObject(pods["worker-c"]), pods["worker-c"])).To(Succeed())
		g.Expect(pods["worker-c"].Annotations).To(HaveKeyWithValue(podDeletionCostAnnotation, drainedPodDeletionCost))
		g.Expect(runner.Status.Capacity.Workers).To(Equal(int32(2)))
		g.Expect(runner.Status.Capacity.DrainingWorkers).To(Equal(int32(1)))
		g.Expect(runner.Status.Capacity.RunningInstances).To(Equal(int32(5)))
		g.Expect(*runner.Status.Capacity.DesiredWorkers).To(Equal(int32(2)))

		// Demand grows while the drained pod is still alive: it is removed first, then the pool grows.
		setWorker("devbox-elastic", "worker-b", pods["worker-b"].UID, 3)
		env.reconcile(t, "elastic", 1)
		g.Expect(replicas()).To(Equal(int64(2)), "replicas drop below the live pods so the drained one goes first")
		g.Expect(env.client.Delete(ctx, pods["worker-c"])).To(Succeed())
		delete(env.substrate.workers, "worker-c")
		env.reconcile(t, "elastic", 1)
		g.Expect(replicas()).To(Equal(int64(3)))
		pods["worker-d"] = &corev1.Pod{
			ObjectMeta: metav1.ObjectMeta{Name: "worker-d", Namespace: devboxTestNamespace, Labels: map[string]string{"ate.dev/worker-pool": "devbox-elastic"}},
			Spec:       corev1.PodSpec{Containers: []corev1.Container{{Name: "worker", Image: "worker"}}},
		}
		g.Expect(env.client.Create(ctx, pods["worker-d"])).To(Succeed())
		pods["worker-d"].Status.Conditions = []corev1.PodCondition{{Type: corev1.PodReady, Status: corev1.ConditionTrue}}
		g.Expect(env.client.Status().Update(ctx, pods["worker-d"])).To(Succeed())
		setWorker("devbox-elastic", "worker-d", pods["worker-d"].UID, 0)

		// The cooldown after scaling up holds a scale down, and a drain that races a placement keeps the worker.
		setWorker("devbox-elastic", "worker-b", pods["worker-b"].UID, 0)
		env.reconcile(t, "elastic", 1)
		g.Expect(replicas()).To(Equal(int64(3)))
		g.Expect(env.substrate.workers["worker-d"].Status.State).To(Equal(ateapi.WorkerState_WORKER_STATE_ACTIVE))
		runner = env.get(t, "elastic")
		runner.Status.Capacity.LastScaleTime = lo.ToPtr(metav1.NewTime(time.Now().Add(-time.Hour)))
		g.Expect(env.client.Status().Update(ctx, runner)).To(Succeed())
		env.substrate.placeOnDrain["worker-d"] = 1
		env.reconcile(t, "elastic", 1)
		g.Expect(env.substrate.workers["worker-d"].Status.State).To(Equal(ateapi.WorkerState_WORKER_STATE_DRAINING))
		g.Expect(env.substrate.workers["worker-b"].Status.State).To(Equal(ateapi.WorkerState_WORKER_STATE_ACTIVE), "one worker over the target is drained")
		g.Expect(replicas()).To(Equal(int64(3)), "the drained worker still hosts an instance, so nothing is removed")
		g.Expect(env.client.Get(ctx, client.ObjectKeyFromObject(pods["worker-d"]), pods["worker-d"])).To(Succeed())
		g.Expect(pods["worker-d"].Annotations).NotTo(HaveKey(podDeletionCostAnnotation))

		// Dropping the additional pool takes the runner's label off it.
		runner = env.get(t, "elastic")
		runner.Spec.WorkerPool.AdditionalPools = nil
		g.Expect(env.client.Update(ctx, runner)).To(Succeed())
		runner = env.reconcile(t, "elastic", 1)
		g.Expect(runner.Status.AdditionalWorkerPools).To(BeEmpty())
		g.Expect(env.client.Get(ctx, client.ObjectKeyFromObject(shared), shared)).To(Succeed())
		g.Expect(shared.GetLabels()).NotTo(HaveKey("devboxes.plural.sh/runner.elastic"))
	})

	t.Run("the daemon baked into the environment image is ignored", func(t *testing.T) {
		g := NewWithT(t)
		env.push(t, "custom:old", func(c *v1.Config) {
			c.Labels[v1alpha1.DevboxImageDaemonVersionLabel] = "0.9.3"
			c.Entrypoint = []string{"/usr/local/bin/devbox-daemon"}
		})
		env.newRunner(t, "old", "custom:old")
		runner := env.reconcile(t, "old", 2)
		g.Expect(condition(runner, v1alpha1.DevboxImageContractConditionType).Status).To(Equal(metav1.ConditionTrue))
		g.Expect(*runner.Status.DaemonVersion).To(Equal(devboxTestVersion), "the daemon version is the runtime's")
		g.Expect(runner.Status.Revisions).To(HaveLen(1))
	})

	t.Run("a new runtime digest rolls a revision with the same environment image, a bad one keeps the old", func(t *testing.T) {
		g := NewWithT(t)
		env.push(t, "devbox:v1")
		env.newRunner(t, "daemon", "devbox:v1", func(r *v1alpha1.DevboxRunner) {
			r.Spec.ImageUpdatePolicy = &v1alpha1.DevboxImageUpdatePolicy{Mode: lo.ToPtr(v1alpha1.DevboxImageUpdatePinned)}
		})
		runner := env.reconcile(t, "daemon", 2)
		g.Expect(runner.Status.Revisions).To(HaveLen(1))
		first := *runner.LatestRevision()
		atespace := *runner.Status.Atespace
		// r1 is superseded while it builds, and collected with its template.
		r1 := env.substrate.template(atespace, first.Name)

		// The same runtime tag at the same digest: nothing rolls, however often it is re-resolved.
		expire := func() {
			runner = env.get(t, "daemon")
			runner.Status.RuntimeResolvedAt = &metav1.Time{Time: time.Now().Add(-2 * time.Hour)}
			g.Expect(env.client.Status().Update(ctx, runner)).To(Succeed())
		}
		expire()
		runner = env.reconcile(t, "daemon", 1)
		g.Expect(runner.Status.Revisions).To(HaveLen(1), "an unchanged runtime digest does not roll a revision")

		// A runtime that fails its contract keeps the digest in use.
		env.push(t, "devbox-runtime-core:"+devboxTestVersion)
		expire()
		runner = env.reconcile(t, "daemon", 1)
		resolved := condition(runner, v1alpha1.DevboxRuntimeResolvedConditionType)
		g.Expect(resolved.Status).To(Equal(metav1.ConditionFalse))
		g.Expect(resolved.Message).To(ContainSubstring(v1alpha1.DevboxRuntimeContractLabel))
		g.Expect(*runner.Status.ResolvedRuntime).To(Equal(*first.Runtime))
		g.Expect(runner.Status.Revisions).To(HaveLen(1))

		// A new daemon: same environment image, new runtime, new revision.
		newDigest := env.pushRuntime(t, "0.12.1")
		runner = env.reconcile(t, "daemon", 1)
		g.Expect(condition(runner, v1alpha1.DevboxRuntimeResolvedConditionType).Status).To(Equal(metav1.ConditionTrue))
		g.Expect(*runner.Status.ResolvedRuntime).To(HaveSuffix(newDigest))
		g.Expect(*runner.Status.DaemonVersion).To(Equal("0.12.1"))
		latest := runner.LatestRevision()
		g.Expect(latest.Revision).To(Equal(int64(2)))
		g.Expect(latest.Image).To(Equal(first.Image))
		g.Expect(*latest.Runtime).To(HaveSuffix(newDigest))
		g.Expect(*latest.DaemonVersion).To(Equal("0.12.1"))

		// Substrate only moves an actor between templates with the same volumes and devbox mounts.
		r2 := env.substrate.template(atespace, latest.Name)
		g.Expect(r2.Volumes).To(HaveLen(len(r1.Volumes)))
		for i := range r1.Volumes {
			g.Expect(proto.Equal(r1.Volumes[i], r2.Volumes[i])).To(BeTrue())
		}
		g.Expect(r2.Containers[0].VolumeMounts).To(HaveLen(len(r1.Containers[0].VolumeMounts)))
		for i := range r1.Containers[0].VolumeMounts {
			g.Expect(proto.Equal(r1.Containers[0].VolumeMounts[i], r2.Containers[0].VolumeMounts[i])).To(BeTrue())
		}

		// Later tests share the registry: restore the runtime they were written against.
		env.pushRuntime(t, devboxTestVersion)
	})

	t.Run("without a resolvable runtime no revision is built", func(t *testing.T) {
		g := NewWithT(t)
		env.push(t, "devbox:v1")
		env.newRunner(t, "no-runtime", "devbox:v1")
		image := env.r.Config.RuntimeImage
		env.r.Config.RuntimeImage = env.registry + "/missing-runtime:1"
		t.Cleanup(func() { env.r.Config.RuntimeImage = image })

		runner := env.reconcile(t, "no-runtime", 2)
		g.Expect(runner.Status.ResolvedImage).NotTo(BeNil())
		g.Expect(runner.Status.ResolvedRuntime).To(BeNil())
		g.Expect(condition(runner, v1alpha1.DevboxRuntimeResolvedConditionType).Status).To(Equal(metav1.ConditionFalse))
		g.Expect(runner.Status.Revisions).To(BeEmpty())
		g.Expect(condition(runner, v1alpha1.ReadyConditionType).Status).To(Equal(metav1.ConditionFalse))
		g.Expect(runner.Status.WorkerPool).NotTo(BeNil(), "the worker pool is reconciled without a runtime")
		g.Expect(runner.Status.ID).NotTo(BeNil(), "and so is the console registration")
	})

	t.Run("delete drains running instances, waits for snapshots, then cleans up", func(t *testing.T) {
		g := NewWithT(t)
		runner := env.get(t, "platform")
		atespace := *runner.Status.Atespace
		consoleID := *runner.Status.ID
		env.substrate.addActor(atespace, "busy", "platform-r2", ateapi.ActorState_ACTOR_STATE_RUNNING)
		g.Expect(env.client.Delete(ctx, runner)).To(Succeed())

		runner = env.reconcile(t, "platform", 1)
		draining := condition(runner, v1alpha1.DevboxDrainingConditionType)
		g.Expect(draining.Reason).To(Equal(string(v1alpha1.DevboxInstancesRunningReason)))
		g.Expect(draining.Message).To(ContainSubstring("1 running instances"))
		g.Expect(*env.console.lastHeartbeat().Status).To(Equal(console.DevboxStatusDegraded))
		g.Expect(env.console.deleted).To(BeEmpty())

		env.substrate.addActor(atespace, "busy", "platform-r2", ateapi.ActorState_ACTOR_STATE_SUSPENDED)
		env.console.snapshotsRemain = true
		runner = env.reconcile(t, "platform", 1)
		g.Expect(condition(runner, v1alpha1.DevboxDrainingConditionType).Reason).To(Equal(string(v1alpha1.DevboxSnapshotsRemainReason)))
		g.Expect(env.substrate.hasAtespace(atespace)).To(BeTrue(), "nothing is deleted while snapshots remain")

		env.console.snapshotsRemain = false
		_, err := env.r.Reconcile(ctx, ctrl.Request{NamespacedName: client.ObjectKey{Name: "platform"}})
		g.Expect(err).NotTo(HaveOccurred())
		g.Expect(env.console.deleted).To(ContainElement(consoleID))
		g.Expect(env.substrate.hasAtespace(atespace)).To(BeFalse())
		g.Expect(env.substrate.actors[atespace]).To(BeEmpty())
		g.Expect(env.substrate.templates[atespace]).To(BeEmpty())
		g.Expect(apierrors.IsNotFound(env.client.Get(ctx, client.ObjectKey{Name: "platform"}, &v1alpha1.DevboxRunner{}))).To(BeTrue())
		mirror := &corev1.Secret{}
		g.Expect(env.client.Get(ctx, client.ObjectKey{Name: v1alpha1.DevboxRunnerEnvSecret, Namespace: devboxTestNamespace}, mirror)).To(Succeed())
		g.Expect(mirror.Data).NotTo(HaveKey("platform"), "a deleted runner's secret env is dropped")

		pool := &unstructured.Unstructured{}
		pool.SetGroupVersionKind(workerPoolGVK)
		err = env.client.Get(ctx, client.ObjectKey{Name: "devbox-platform", Namespace: devboxTestNamespace}, pool)
		g.Expect(apierrors.IsNotFound(err)).To(BeTrue())
		gateway := &appsv1.Deployment{}
		g.Expect(env.client.Get(ctx, client.ObjectKey{Name: devboxGatewayName, Namespace: devboxTestNamespace}, gateway)).
			To(Succeed(), "other runners still need the gateway")
		g.Expect(lo.Map(gateway.GetOwnerReferences(), func(ref metav1.OwnerReference, _ int) string { return ref.Name })).
			To(ContainElements("custom", "old", "scheduled", "elastic"), "every runner sharing the gateway owns it")
		for name, obj := range map[string]client.Object{
			devboxGatewayName:       &corev1.ServiceAccount{},
			devboxGatewaySecretName: &corev1.Secret{},
			devboxEgressAuthzName:   &corev1.Service{},
		} {
			g.Expect(env.client.Get(ctx, client.ObjectKey{Name: name, Namespace: devboxTestNamespace}, obj)).To(Succeed())
			g.Expect(obj.GetOwnerReferences()).To(HaveLen(len(gateway.GetOwnerReferences())), "%T %s has the gateway's owners", obj, name)
		}
		policy := &networkingv1.NetworkPolicy{}
		g.Expect(env.client.Get(ctx, client.ObjectKey{Name: devboxGatewayName, Namespace: devboxTestNamespace}, policy)).To(Succeed())
		g.Expect(policy.GetOwnerReferences()).To(HaveLen(len(gateway.GetOwnerReferences())))
	})

	t.Run("a JuiceFS home names the runner's StorageClass in every revision", func(t *testing.T) {
		g := NewWithT(t)
		env.push(t, "devbox:v1")
		env.newRunner(t, "juicefs", "devbox:v1", func(r *v1alpha1.DevboxRunner) {
			r.Spec.Home = &v1alpha1.DevboxHome{Storage: lo.ToPtr(v1alpha1.DevboxHomeJuiceFS), Size: lo.ToPtr(resource.MustParse("100Gi"))}
		})
		env.reconcile(t, "juicefs", 1)
		_, _ = env.r.Reconcile(ctx, ctrl.Request{NamespacedName: client.ObjectKey{Name: "juicefs"}})
		runner := env.get(t, "juicefs")
		g.Expect(condition(runner, v1alpha1.DevboxTemplateReadyConditionType).Message).To(ContainSubstring("StorageClass devbox-juicefs for JuiceFS homes doesn't exist"))
		g.Expect(runner.Status.Revisions).To(BeEmpty())

		g.Expect(env.client.Create(ctx, &storagev1.StorageClass{
			ObjectMeta:  metav1.ObjectMeta{Name: v1alpha1.DevboxDefaultJuiceFSStorageClass},
			Provisioner: juicefs.DriverName,
			Parameters:  map[string]string{juicefs.ParamUID: "1000"},
		})).To(Succeed())
		runner = env.reconcile(t, "juicefs", 1)
		g.Expect(runner.Status.Revisions).To(HaveLen(1))
		rev := runner.Status.Revisions[0]
		g.Expect(rev.HomeStorage).To(HaveValue(Equal(v1alpha1.DevboxHomeJuiceFS)))
		g.Expect(rev.HomeStorageClass).To(HaveValue(Equal(v1alpha1.DevboxDefaultJuiceFSStorageClass)))
		g.Expect(rev.HomeSize).To(HaveValue(Equal(resource.MustParse("100Gi"))))
		atespace := *runner.Status.Atespace

		tmpl := env.substrate.template(atespace, rev.Name)
		home, _ := lo.Find(tmpl.Volumes, func(v *ateapi.Volume) bool { return v.Name == devboxHomeVolume })
		g.Expect(home.GetExternal().GetTemplate().GetCapacityBytes()).To(Equal(int64(100 << 30)))
		g.Expect(home.GetExternal().GetTemplate().GetStorageClassName()).To(Equal(v1alpha1.DevboxDefaultJuiceFSStorageClass))
		g.Expect(env.substrate.previews[rev.Name]).To(BeTrue())
		g.Expect(rev.HomeSeed).To(HaveValue(Equal("golden." + tmpl.GetMetadata().GetUid())))

		hash := rev.Hash
		gatewayEnv := func() []corev1.EnvVar {
			d := &appsv1.Deployment{}
			g.Expect(env.client.Get(ctx, client.ObjectKey{Name: devboxGatewayName, Namespace: devboxTestNamespace}, d)).To(Succeed())
			return d.Spec.Template.Spec.Containers[0].Env
		}
		g.Expect(gatewayEnv()).NotTo(ContainElement(HaveField("Name", "DEVBOX_JUICEFS_ADDRESS")), "no JuiceFS controller, no seeds")
		g.Expect(env.client.Create(ctx, &corev1.Service{
			ObjectMeta: metav1.ObjectMeta{Name: devboxJuiceFSService, Namespace: "ate-system"},
			Spec:       corev1.ServiceSpec{Ports: []corev1.ServicePort{{Name: "grpc", Port: devboxJuiceFSPort}}},
		})).To(Succeed())
		runner = env.reconcile(t, "juicefs", 1)
		g.Expect(runner.Status.Revisions).To(HaveLen(1), "the per-revision class doesn't change the template hash")
		g.Expect(runner.Status.Revisions[0].Hash).To(Equal(hash))
		g.Expect(gatewayEnv()).To(ContainElement(corev1.EnvVar{Name: "DEVBOX_JUICEFS_ADDRESS", Value: "devbox-juicefs.ate-system.svc:9820"}))

		// The probe starts its actor from the golden home's seed. When the golden home wasn't captured, the
		// revision is built again, once.
		failProbe := func(revision int64) {
			t.Helper()
			cm := &corev1.ConfigMap{}
			g.Expect(env.client.Get(ctx, client.ObjectKey{Name: DevboxProbeConfigMapName("juicefs", revision), Namespace: devboxTestNamespace}, cm)).To(Succeed())
			var req DevboxProbeRequest
			g.Expect(json.Unmarshal([]byte(cm.Data[DevboxProbeRequestKey]), &req)).To(Succeed())
			g.Expect(req.HomeSeed).To(Equal(*runner.RevisionByNumber(revision).HomeSeed))
			g.Expect(req.HomeBytes).To(Equal(int64(100 << 30)))
			cm.Annotations = map[string]string{DevboxProbeStateAnnotation: DevboxProbeStateFailed}
			cm.Data[DevboxProbeErrorKey] = probe.ErrHomeSeedMissing + " (seed golden.x)"
			g.Expect(env.client.Update(ctx, cm)).To(Succeed())
		}
		env.substrate.finishGoldenBoot(atespace, rev.Name)
		runner = env.reconcile(t, "juicefs", 1)
		failProbe(1)
		runner = env.reconcile(t, "juicefs", 2)
		rebuilt := runner.RevisionByNumber(2)
		g.Expect(rebuilt).NotTo(BeNil(), "revision 1 is retired and built again")
		g.Expect(rebuilt.Message).To(HaveValue(Equal(devboxHomeSeedRebuilt)))
		g.Expect(rebuilt.HomeSeed).NotTo(Equal(rev.HomeSeed), "a new template, so a new seed")

		env.substrate.finishGoldenBoot(atespace, rebuilt.Name)
		runner = env.reconcile(t, "juicefs", 1)
		failProbe(2)
		runner = env.reconcile(t, "juicefs", 1)
		g.Expect(runner.RevisionByNumber(2).Phase).To(Equal(v1alpha1.DevboxRevisionFailed), "a second miss fails")
	})

	t.Run("deleting the last runner removes the gateway", func(t *testing.T) {
		g := NewWithT(t)
		for _, name := range []string{"custom", "old", "daemon", "no-runtime", "scheduled", "elastic", "rebuild", "juicefs"} {
			g.Expect(env.client.Delete(ctx, env.get(t, name))).To(Succeed())
			_, err := env.r.Reconcile(ctx, ctrl.Request{NamespacedName: client.ObjectKey{Name: name}})
			g.Expect(err).NotTo(HaveOccurred())
		}
		err := env.client.Get(ctx, client.ObjectKey{Name: devboxGatewayName, Namespace: devboxTestNamespace}, &appsv1.Deployment{})
		g.Expect(apierrors.IsNotFound(err)).To(BeTrue())
		err = env.client.Get(ctx, client.ObjectKey{Name: devboxEgressAuthzName, Namespace: devboxTestNamespace}, &corev1.Service{})
		g.Expect(apierrors.IsNotFound(err)).To(BeTrue())
	})
}

func TestDevboxSubstrateInstallCheck(t *testing.T) {
	g := NewWithT(t)
	env := startDevboxEnv(t)
	ctx := context.Background()

	deployment := func(name string, args ...string) *appsv1.Deployment {
		labels := map[string]string{"app": name}
		return &appsv1.Deployment{
			ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: "ate-system"},
			Spec: appsv1.DeploymentSpec{
				Selector: &metav1.LabelSelector{MatchLabels: labels},
				Template: corev1.PodTemplateSpec{
					ObjectMeta: metav1.ObjectMeta{Labels: labels},
					Spec:       corev1.PodSpec{Containers: []corev1.Container{{Name: "main", Image: "x", Args: args}}},
				},
			},
		}
	}
	g.Expect(env.client.Create(ctx, deployment(atenetEgressName, "--mode=egress"))).To(Succeed())
	g.Expect(env.client.Create(ctx, deployment(atenetRouterName, "--ingress-allowed-spiffe-ids=spiffe://cluster.local/ns/ate-system/sa/atenet-client"))).To(Succeed())
	g.Expect(env.client.Create(ctx, &corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: atenetEgressName, Namespace: "ate-system"}, Data: map[string]string{"envoy.yaml": "clusters: []"}})).To(Succeed())

	problems, err := env.r.substrateInstallProblems(ctx)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(problems).To(HaveLen(3))
	g.Expect(strings.Join(problems, "\n")).To(And(
		ContainSubstring("does not list plural.sh as a credential provider"),
		ContainSubstring("does not use devbox-egress-authz as its extra ext_proc"),
		ContainSubstring("spiffe://cluster.local/ns/"+devboxTestNamespace+"/sa/devbox-gateway"),
	))

	egress := deployment(atenetEgressName, "--mode=egress", "--credential-provider-name=plural.sh", "--credential-provider-address=devbox-gateway."+devboxTestNamespace+".svc:50052")
	current := &appsv1.Deployment{}
	g.Expect(env.client.Get(ctx, client.ObjectKeyFromObject(egress), current)).To(Succeed())
	current.Spec = egress.Spec
	g.Expect(env.client.Update(ctx, current)).To(Succeed())
	router := &appsv1.Deployment{}
	g.Expect(env.client.Get(ctx, client.ObjectKey{Name: atenetRouterName, Namespace: "ate-system"}, router)).To(Succeed())
	router.Spec.Template.Spec.Containers[0].Args = []string{"--ingress-allowed-spiffe-ids=spiffe://cluster.local/ns/ate-system/sa/atenet-client," + env.r.Config.GatewaySpiffeID()}
	g.Expect(env.client.Update(ctx, router)).To(Succeed())
	envoy := &corev1.ConfigMap{}
	g.Expect(env.client.Get(ctx, client.ObjectKey{Name: atenetEgressName, Namespace: "ate-system"}, envoy)).To(Succeed())
	envoy.Data["envoy.yaml"] = "address: devbox-egress-authz." + devboxTestNamespace + ".svc.cluster.local"
	g.Expect(env.client.Update(ctx, envoy)).To(Succeed())

	problems, err = env.r.substrateInstallProblems(ctx)
	g.Expect(err).NotTo(HaveOccurred())
	g.Expect(problems).To(BeEmpty())
}
