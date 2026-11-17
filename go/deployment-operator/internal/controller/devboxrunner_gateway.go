package controller

import (
	"context"
	"fmt"
	"strings"

	"github.com/samber/lo"
	appsv1 "k8s.io/api/apps/v1"
	certificatesv1 "k8s.io/api/certificates/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/util/intstr"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/internal/utils"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate"
)

const (
	devboxGatewayName = "devbox-gateway"
	// devboxEgressAuthzName is the Service atenet-egress dials as its additional ext_proc
	// (atenet.egress.additionalExtprocService=<namespace>/devbox-egress-authz:50053).
	devboxEgressAuthzName     = "devbox-egress-authz"
	devboxGatewaySecretName   = "devbox-gateway-env"
	devboxCredentialProvider  = "plural.sh"
	devboxGatewayManagedLabel = "devboxes.plural.sh/gateway"

	devboxGatewayCredProviderPort = 50052
	devboxGatewayExtProcPort      = 50053
	devboxGatewayMCPPort          = 8080
	devboxGatewayMetricsPort      = 9090

	ateAPIAccessLabel        = "ate.dev/api-access"
	stringTrue               = "true"
	atenetEgressName         = "atenet-egress"
	atenetRouterName         = "atenet-router"
	servicednsSigner         = "servicedns.podcert.ate.dev/identity"
	podidentitySigner        = "podidentity.podcert.ate.dev/identity"
	podcertCanaryingLabel    = "podcert.ate.dev/canarying"
	gatewayAteAPIMount       = "/var/run/secrets/ate.dev/api"
	gatewayPodIdentityMount  = "/run/podidentity.podcert.ate.dev"
	gatewayServiceDNSMount   = "/run/servicedns.podcert.ate.dev"
	gatewayServiceDNSCAMount = "/run/servicedns-ca.podcert.ate.dev"
)

func devboxGatewayLabels() map[string]string {
	return map[string]string{
		"app.kubernetes.io/name":       devboxGatewayName,
		"app.kubernetes.io/component":  "devbox-gateway",
		"app.kubernetes.io/managed-by": "deployment-operator",
		devboxGatewayManagedLabel:      stringTrue,
	}
}

func devboxGatewaySelector() map[string]string {
	return map[string]string{"app.kubernetes.io/name": devboxGatewayName}
}

// reconcileGateway deploys the single per-cluster devbox-gateway: ServiceAccount, env Secret, Deployment,
// the gateway and egress-authz Services, and a NetworkPolicy admitting only atenet-egress to its ports.
// It is shared by every DevboxRunner, so it carries no owner reference and is deleted with the last runner.
func (r *DevboxRunnerReconciler) reconcileGateway(ctx context.Context, runner *v1alpha1.DevboxRunner) error {
	if err := r.checkPodCertificates(); err != nil {
		return err
	}

	ns := r.Config.OperatorNamespace
	if err := r.labelNamespaceForSubstrate(ctx, ns); err != nil {
		return err
	}

	sa := &corev1.ServiceAccount{ObjectMeta: metav1.ObjectMeta{Name: devboxGatewayName, Namespace: ns}}
	if _, err := controllerutil.CreateOrPatch(ctx, r.Client, sa, func() error {
		sa.Labels = lo.Assign(sa.Labels, devboxGatewayLabels())
		sa.Annotations = lo.Assign(sa.Annotations, r.Config.GatewayServiceAccountAnnotations)
		return nil
	}); err != nil {
		return fmt.Errorf("reconciling gateway ServiceAccount: %w", err)
	}

	secret := &corev1.Secret{ObjectMeta: metav1.ObjectMeta{Name: devboxGatewaySecretName, Namespace: ns}}
	if _, err := controllerutil.CreateOrPatch(ctx, r.Client, secret, func() error {
		secret.Labels = lo.Assign(secret.Labels, devboxGatewayLabels())
		secret.Type = corev1.SecretTypeOpaque
		secret.Data = map[string][]byte{"DEPLOY_TOKEN": []byte(r.Config.DeployToken)}
		return nil
	}); err != nil {
		return fmt.Errorf("reconciling gateway Secret: %w", err)
	}

	// Both Services select the gateway pods and exist before them: the servicedns signer issues the serving
	// certificate with one DNS SAN per selecting Service (devbox-gateway.<ns>.svc for the credential provider,
	// devbox-egress-authz.<ns>.svc for the ext_proc), as of the pod's certificate request.
	for _, svc := range []*corev1.Service{
		r.gatewayService(devboxGatewayName, []corev1.ServicePort{
			{Name: "credprovider", Port: devboxGatewayCredProviderPort, TargetPort: intstr.FromString("credprovider"), AppProtocol: lo.ToPtr("grpc")},
			{Name: "mcp", Port: devboxGatewayMCPPort, TargetPort: intstr.FromString("mcp"), AppProtocol: lo.ToPtr("http")},
			{Name: "metrics", Port: devboxGatewayMetricsPort, TargetPort: intstr.FromString("metrics"), AppProtocol: lo.ToPtr("http")},
		}),
		r.gatewayService(devboxEgressAuthzName, []corev1.ServicePort{
			{Name: "extproc", Port: devboxGatewayExtProcPort, TargetPort: intstr.FromString("extproc"), AppProtocol: lo.ToPtr("grpc")},
		}),
	} {
		desired := svc.DeepCopy()
		if _, err := controllerutil.CreateOrPatch(ctx, r.Client, svc, func() error {
			svc.Labels = lo.Assign(svc.Labels, desired.Labels)
			svc.Spec.Selector = desired.Spec.Selector
			svc.Spec.Ports = desired.Spec.Ports
			return nil
		}); err != nil {
			return fmt.Errorf("reconciling gateway Service %s: %w", svc.Name, err)
		}
	}

	// The serving names are hashed too, so pods re-request their certificate if a Service is renamed.
	checksum, err := utils.HashObject(struct {
		Token        string
		Env          []corev1.EnvVar
		ServingNames []string
	}{r.Config.DeployToken, r.gatewayEnv(), []string{r.gatewayHost(devboxGatewayName), r.gatewayHost(devboxEgressAuthzName)}})
	if err != nil {
		return err
	}

	deployment := &appsv1.Deployment{ObjectMeta: metav1.ObjectMeta{Name: devboxGatewayName, Namespace: ns}}
	if _, err := controllerutil.CreateOrPatch(ctx, r.Client, deployment, func() error {
		deployment.Labels = lo.Assign(deployment.Labels, devboxGatewayLabels())
		deployment.Spec.Replicas = lo.ToPtr(r.Config.GatewayReplicas)
		deployment.Spec.Selector = &metav1.LabelSelector{MatchLabels: devboxGatewaySelector()}
		deployment.Spec.Template = r.gatewayPodTemplate(checksum)
		return nil
	}); err != nil {
		return fmt.Errorf("reconciling gateway Deployment: %w", err)
	}

	policy := &networkingv1.NetworkPolicy{ObjectMeta: metav1.ObjectMeta{Name: devboxGatewayName, Namespace: ns}}
	if _, err := controllerutil.CreateOrPatch(ctx, r.Client, policy, func() error {
		policy.Labels = lo.Assign(policy.Labels, devboxGatewayLabels())
		policy.Spec = r.gatewayNetworkPolicySpec()
		return nil
	}); err != nil {
		return fmt.Errorf("reconciling gateway NetworkPolicy: %w", err)
	}

	r.markGatewayReady(runner, deployment)
	r.checkSubstrateInstall(ctx, runner)
	return nil
}

// checkPodCertificates fails unless certificates.k8s.io serves the kinds behind the gateway's projected volumes.
// Without them the API server silently drops the podCertificate and clusterTrustBundle sources, and the gateway
// starts without its Substrate token CA or identity and never becomes ready.
func (r *DevboxRunnerReconciler) checkPodCertificates() error {
	var missing []string
	for _, kind := range []string{"PodCertificateRequest", "ClusterTrustBundle"} {
		_, err := r.RESTMapper().RESTMapping(schema.GroupKind{Group: certificatesv1.GroupName, Kind: kind}, clusterTrustBundleVersions...)
		switch {
		case meta.IsNoMatchError(err):
			missing = append(missing, kind)
		case err != nil:
			return err
		}
	}
	if len(missing) > 0 {
		return fmt.Errorf("certificates.k8s.io doesn't serve %s, which devbox-gateway and Substrate need for pod certificates; "+
			"they're on by default from Kubernetes 1.37 (EKS, GKE and AKS can't enable them earlier)", strings.Join(missing, " or "))
	}
	return nil
}

func (r *DevboxRunnerReconciler) gatewayService(name string, ports []corev1.ServicePort) *corev1.Service {
	return &corev1.Service{
		ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: r.Config.OperatorNamespace, Labels: devboxGatewayLabels()},
		Spec:       corev1.ServiceSpec{Selector: devboxGatewaySelector(), Ports: ports},
	}
}

func (r *DevboxRunnerReconciler) gatewayEnv() []corev1.EnvVar {
	return []corev1.EnvVar{
		{Name: "CONSOLE_URL", Value: r.Config.ConsoleURL},
		{Name: "DEVBOX_KAS_URL", Value: r.Config.KasURL},
		{Name: "CLUSTER_ID", Value: r.Config.ClusterID},
		{Name: "DEVBOX_OPERATOR_VERSION", Value: r.Config.OperatorVersion},
		{Name: "ATE_API_ADDRESS", Value: r.Config.SubstrateAddress},
		{Name: "ATE_API_TOKEN_FILE", Value: gatewayAteAPIMount + "/token"},
		{Name: "ATE_API_CA_FILE", Value: gatewayAteAPIMount + "/ca.crt"},
		{Name: "DEVBOX_POD_IDENTITY_DIR", Value: gatewayPodIdentityMount},
		{Name: "DEVBOX_SERVICE_DNS_DIR", Value: gatewayServiceDNSMount},
		{Name: "DEVBOX_SERVICE_DNS_CA_DIR", Value: gatewayServiceDNSCAMount},
		{Name: "DEVBOX_CREDENTIAL_PROVIDER_ADDR", Value: fmt.Sprintf(":%d", devboxGatewayCredProviderPort)},
		{Name: "DEVBOX_EXTPROC_ADDR", Value: fmt.Sprintf(":%d", devboxGatewayExtProcPort)},
		{Name: "DEVBOX_MCP_ADDR", Value: fmt.Sprintf(":%d", devboxGatewayMCPPort)},
		{Name: "DEVBOX_METRICS_ADDR", Value: fmt.Sprintf(":%d", devboxGatewayMetricsPort)},
		{Name: "DEVBOX_PROBE_NAMESPACE", Value: r.Config.OperatorNamespace},
		{Name: "DEVBOX_SUBSTRATE_NAMESPACE", Value: r.Config.SubstrateNamespace},
		{Name: "DEVBOX_ROUTER_ADDRESS", Value: r.Config.RouterAddress},
		{Name: "DEVBOX_ACTOR_JWT_ISSUER", Value: r.Config.ActorJWTIssuer},
		{Name: "DEVBOX_GATEWAY_HOST", Value: r.gatewayHost(devboxGatewayName)},
		{Name: "DEVBOX_EGRESS_AUTHZ_HOST", Value: r.gatewayHost(devboxEgressAuthzName)},
	}
}

// gatewayHost is the name atenet-egress dials a gateway Service at, and the DNS SAN the servicedns signer issues
// the gateway for it.
func (r *DevboxRunnerReconciler) gatewayHost(service string) string {
	return service + "." + r.Config.OperatorNamespace + ".svc"
}

func (r *DevboxRunnerReconciler) gatewayPodTemplate(checksum string) corev1.PodTemplateSpec {
	env := append(r.gatewayEnv(),
		corev1.EnvVar{Name: "POD_NAME", ValueFrom: &corev1.EnvVarSource{FieldRef: &corev1.ObjectFieldSelector{FieldPath: "metadata.name"}}},
		corev1.EnvVar{Name: "POD_NAMESPACE", ValueFrom: &corev1.EnvVarSource{FieldRef: &corev1.ObjectFieldSelector{FieldPath: "metadata.namespace"}}},
		corev1.EnvVar{Name: "DEPLOY_TOKEN", ValueFrom: &corev1.EnvVarSource{SecretKeyRef: &corev1.SecretKeySelector{
			LocalObjectReference: corev1.LocalObjectReference{Name: devboxGatewaySecretName}, Key: "DEPLOY_TOKEN",
		}}},
	)
	live := &metav1.LabelSelector{MatchLabels: map[string]string{podcertCanaryingLabel: "live"}}

	return corev1.PodTemplateSpec{
		ObjectMeta: metav1.ObjectMeta{
			Labels:      devboxGatewayLabels(),
			Annotations: map[string]string{"devboxes.plural.sh/config-checksum": checksum},
		},
		Spec: corev1.PodSpec{
			ServiceAccountName: devboxGatewayName,
			SecurityContext: &corev1.PodSecurityContext{
				RunAsNonRoot:   lo.ToPtr(true),
				RunAsUser:      lo.ToPtr(int64(65532)),
				RunAsGroup:     lo.ToPtr(int64(65532)),
				FSGroup:        lo.ToPtr(int64(65532)),
				SeccompProfile: &corev1.SeccompProfile{Type: corev1.SeccompProfileTypeRuntimeDefault},
			},
			Containers: []corev1.Container{{
				Name:            "gateway",
				Image:           r.Config.GatewayImageRef(),
				ImagePullPolicy: corev1.PullIfNotPresent,
				Env:             env,
				Ports: []corev1.ContainerPort{
					{Name: "credprovider", ContainerPort: devboxGatewayCredProviderPort},
					{Name: "extproc", ContainerPort: devboxGatewayExtProcPort},
					{Name: "mcp", ContainerPort: devboxGatewayMCPPort},
					{Name: "metrics", ContainerPort: devboxGatewayMetricsPort},
				},
				ReadinessProbe: &corev1.Probe{ProbeHandler: corev1.ProbeHandler{TCPSocket: &corev1.TCPSocketAction{Port: intstr.FromString("credprovider")}}},
				LivenessProbe: &corev1.Probe{
					ProbeHandler:        corev1.ProbeHandler{TCPSocket: &corev1.TCPSocketAction{Port: intstr.FromString("metrics")}},
					InitialDelaySeconds: 10,
				},
				SecurityContext: &corev1.SecurityContext{
					AllowPrivilegeEscalation: lo.ToPtr(false),
					ReadOnlyRootFilesystem:   lo.ToPtr(true),
					Capabilities:             &corev1.Capabilities{Drop: []corev1.Capability{"ALL"}},
				},
				VolumeMounts: []corev1.VolumeMount{
					{Name: "ate-api", MountPath: gatewayAteAPIMount, ReadOnly: true},
					{Name: "podidentity", MountPath: gatewayPodIdentityMount, ReadOnly: true},
					{Name: "servicedns", MountPath: gatewayServiceDNSMount, ReadOnly: true},
					{Name: "servicedns-ca", MountPath: gatewayServiceDNSCAMount, ReadOnly: true},
					{Name: "tmp", MountPath: "/tmp"},
				},
			}},
			Volumes: []corev1.Volume{
				{Name: "ate-api", VolumeSource: corev1.VolumeSource{Projected: &corev1.ProjectedVolumeSource{Sources: []corev1.VolumeProjection{
					{ServiceAccountToken: &corev1.ServiceAccountTokenProjection{Audience: substrate.TokenAudience, ExpirationSeconds: lo.ToPtr(int64(3600)), Path: "token"}},
					{ClusterTrustBundle: &corev1.ClusterTrustBundleProjection{SignerName: lo.ToPtr(servicednsSigner), LabelSelector: live, Path: "ca.crt"}},
				}}}},
				// Client identity towards atenet-router, and the trust bundle atenet-egress's client certificate is
				// verified against on the credential provider and ext_proc.
				{Name: "podidentity", VolumeSource: corev1.VolumeSource{Projected: &corev1.ProjectedVolumeSource{Sources: []corev1.VolumeProjection{
					{PodCertificate: &corev1.PodCertificateProjection{SignerName: podidentitySigner, KeyType: "ECDSAP256", CredentialBundlePath: "credential-bundle.pem"}},
					{ClusterTrustBundle: &corev1.ClusterTrustBundleProjection{SignerName: lo.ToPtr(podidentitySigner), LabelSelector: live, Path: "trust-bundle.pem"}},
				}}}},
				// The serving certificate of the credential provider and ext_proc, issued for both gateway Services.
				{Name: "servicedns", VolumeSource: corev1.VolumeSource{Projected: &corev1.ProjectedVolumeSource{Sources: []corev1.VolumeProjection{
					{PodCertificate: &corev1.PodCertificateProjection{SignerName: servicednsSigner, KeyType: "ECDSAP256", CredentialBundlePath: "credential-bundle.pem"}},
				}}}},
				{Name: "servicedns-ca", VolumeSource: corev1.VolumeSource{Projected: &corev1.ProjectedVolumeSource{Sources: []corev1.VolumeProjection{
					{ClusterTrustBundle: &corev1.ClusterTrustBundleProjection{SignerName: lo.ToPtr(servicednsSigner), LabelSelector: live, Path: "trust-bundle.pem"}},
				}}}},
				{Name: "tmp", VolumeSource: corev1.VolumeSource{EmptyDir: &corev1.EmptyDirVolumeSource{}}},
			},
		},
	}
}

func (r *DevboxRunnerReconciler) gatewayNetworkPolicySpec() networkingv1.NetworkPolicySpec {
	tcp := corev1.ProtocolTCP
	port := func(p int) networkingv1.NetworkPolicyPort {
		return networkingv1.NetworkPolicyPort{Protocol: &tcp, Port: lo.ToPtr(intstr.FromInt32(int32(p)))}
	}
	return networkingv1.NetworkPolicySpec{
		PodSelector: metav1.LabelSelector{MatchLabels: devboxGatewaySelector()},
		PolicyTypes: []networkingv1.PolicyType{networkingv1.PolicyTypeIngress},
		Ingress: []networkingv1.NetworkPolicyIngressRule{
			{
				From: []networkingv1.NetworkPolicyPeer{{
					NamespaceSelector: &metav1.LabelSelector{MatchLabels: map[string]string{"kubernetes.io/metadata.name": r.Config.SubstrateNamespace}},
					PodSelector:       &metav1.LabelSelector{MatchLabels: map[string]string{"app": atenetEgressName}},
				}},
				Ports: []networkingv1.NetworkPolicyPort{port(devboxGatewayCredProviderPort), port(devboxGatewayExtProcPort), port(devboxGatewayMCPPort)},
			},
			{Ports: []networkingv1.NetworkPolicyPort{port(devboxGatewayMetricsPort)}},
		},
	}
}

// labelNamespaceForSubstrate marks the operator namespace as a Substrate API client namespace, which
// ate-api-server requires of both the operator and the gateway.
func (r *DevboxRunnerReconciler) labelNamespaceForSubstrate(ctx context.Context, name string) error {
	ns := &corev1.Namespace{}
	if err := r.Get(ctx, client.ObjectKey{Name: name}, ns); err != nil {
		return fmt.Errorf("getting namespace %s: %w", name, err)
	}
	if ns.Labels[ateAPIAccessLabel] == stringTrue {
		return nil
	}
	patch := client.MergeFrom(ns.DeepCopy())
	ns.Labels = lo.Assign(ns.Labels, map[string]string{ateAPIAccessLabel: stringTrue})
	return r.Patch(ctx, ns, patch)
}

func (r *DevboxRunnerReconciler) markGatewayReady(runner *v1alpha1.DevboxRunner, deployment *appsv1.Deployment) {
	if deployment.Status.AvailableReplicas > 0 {
		utils.MarkCondition(runner.SetCondition, v1alpha1.DevboxGatewayReadyConditionType, metav1.ConditionTrue, v1alpha1.ReadyConditionReason,
			fmt.Sprintf("%d/%d gateway replicas available", deployment.Status.AvailableReplicas, lo.FromPtr(deployment.Spec.Replicas)))
		return
	}
	utils.MarkCondition(runner.SetCondition, v1alpha1.DevboxGatewayReadyConditionType, metav1.ConditionFalse, v1alpha1.DevboxPendingReason,
		fmt.Sprintf("Deployment %s/%s has no available replicas", deployment.Namespace, deployment.Name))
}

// checkSubstrateInstall verifies the Substrate install settings devboxes depend on, which the operator can't set
// itself: plural.sh as an egress credential provider, devbox-egress-authz as the additional egress ext_proc,
// and the gateway's SPIFFE ID in atenet-router's --ingress-allowed-spiffe-ids.
func (r *DevboxRunnerReconciler) checkSubstrateInstall(ctx context.Context, runner *v1alpha1.DevboxRunner) {
	problems, err := r.substrateInstallProblems(ctx)
	switch {
	case err != nil:
		utils.MarkCondition(runner.SetCondition, v1alpha1.DevboxSubstrateInstallConditionType, metav1.ConditionUnknown, v1alpha1.ErrorConditionReason, err.Error())
	case len(problems) > 0:
		utils.MarkCondition(runner.SetCondition, v1alpha1.DevboxSubstrateInstallConditionType, metav1.ConditionFalse, v1alpha1.DevboxMisconfiguredReason,
			strings.Join(problems, "; "))
	default:
		utils.MarkCondition(runner.SetCondition, v1alpha1.DevboxSubstrateInstallConditionType, metav1.ConditionTrue, v1alpha1.ReadyConditionReason, "")
	}
}

func (r *DevboxRunnerReconciler) substrateInstallProblems(ctx context.Context) ([]string, error) {
	ns := r.Config.SubstrateNamespace
	var problems []string

	egress := &appsv1.Deployment{}
	if err := r.Get(ctx, client.ObjectKey{Name: atenetEgressName, Namespace: ns}, egress); err != nil {
		if apierrors.IsNotFound(err) {
			return []string{fmt.Sprintf("Substrate is not installed: no Deployment %s/%s", ns, atenetEgressName)}, nil
		}
		return nil, err
	}
	if !containerArgsContain(egress.Spec.Template.Spec, "--credential-provider-name="+devboxCredentialProvider) {
		problems = append(problems, fmt.Sprintf("%s does not list %s as a credential provider; set atenet.egress.credentialProvider to %s at %s.%s.svc:%d",
			atenetEgressName, devboxCredentialProvider, devboxCredentialProvider, devboxGatewayName, r.Config.OperatorNamespace, devboxGatewayCredProviderPort))
	}

	authzHost := fmt.Sprintf("%s.%s.svc", devboxEgressAuthzName, r.Config.OperatorNamespace)
	envoy := &corev1.ConfigMap{}
	if err := r.APIReader.Get(ctx, client.ObjectKey{Name: atenetEgressName, Namespace: ns}, envoy); client.IgnoreNotFound(err) != nil {
		return nil, err
	}
	if !lo.SomeBy(lo.Values(envoy.Data), func(v string) bool { return strings.Contains(v, authzHost) }) {
		problems = append(problems, fmt.Sprintf("%s does not use %s as its extra ext_proc; set atenet.egress.additionalExtprocService=%s/%s:%d",
			atenetEgressName, devboxEgressAuthzName, r.Config.OperatorNamespace, devboxEgressAuthzName, devboxGatewayExtProcPort))
	}

	router := &appsv1.Deployment{}
	if err := r.Get(ctx, client.ObjectKey{Name: atenetRouterName, Namespace: ns}, router); err != nil {
		if apierrors.IsNotFound(err) {
			return append(problems, fmt.Sprintf("no Deployment %s/%s", ns, atenetRouterName)), nil
		}
		return nil, err
	}
	if !containerArgsContain(router.Spec.Template.Spec, r.Config.GatewaySpiffeID()) {
		problems = append(problems, fmt.Sprintf("%s --ingress-allowed-spiffe-ids does not include %s", atenetRouterName, r.Config.GatewaySpiffeID()))
	}
	return problems, nil
}

func containerArgsContain(spec corev1.PodSpec, needle string) bool {
	for _, c := range append(spec.InitContainers, spec.Containers...) {
		for _, arg := range append(append([]string{}, c.Command...), c.Args...) {
			if strings.Contains(arg, needle) {
				return true
			}
		}
	}
	return false
}

// deleteGateway removes the gateway once no DevboxRunner is left.
func (r *DevboxRunnerReconciler) deleteGateway(ctx context.Context) error {
	ns := r.Config.OperatorNamespace
	objects := []client.Object{
		&appsv1.Deployment{ObjectMeta: metav1.ObjectMeta{Name: devboxGatewayName, Namespace: ns}},
		&corev1.Service{ObjectMeta: metav1.ObjectMeta{Name: devboxGatewayName, Namespace: ns}},
		&corev1.Service{ObjectMeta: metav1.ObjectMeta{Name: devboxEgressAuthzName, Namespace: ns}},
		&networkingv1.NetworkPolicy{ObjectMeta: metav1.ObjectMeta{Name: devboxGatewayName, Namespace: ns}},
		&corev1.Secret{ObjectMeta: metav1.ObjectMeta{Name: devboxGatewaySecretName, Namespace: ns}},
		&corev1.Secret{ObjectMeta: metav1.ObjectMeta{Name: DevboxProbeTokenSecretName, Namespace: ns}},
		&corev1.ServiceAccount{ObjectMeta: metav1.ObjectMeta{Name: devboxGatewayName, Namespace: ns}},
	}
	for _, obj := range objects {
		if err := r.Delete(ctx, obj); client.IgnoreNotFound(err) != nil {
			return fmt.Errorf("deleting gateway %T %s: %w", obj, obj.GetName(), err)
		}
	}
	return nil
}
