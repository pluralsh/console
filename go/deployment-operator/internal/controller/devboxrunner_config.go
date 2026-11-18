package controller

import (
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/common"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate"
)

const (
	defaultDevboxImageRepository  = "ghcr.io/pluralsh/devbox-fat"
	defaultGatewayImageRepository = "ghcr.io/pluralsh/devbox-gateway"
	defaultSubstrateNamespace     = "ate-system"
	defaultPollInterval           = time.Hour
	defaultDrainTimeout           = 30 * time.Minute
	defaultHeartbeatInterval      = 2 * time.Minute
)

// DevboxConfig is the operator-wide devbox configuration. It comes from environment variables the
// deployment-operator chart sets when devboxes.enabled is true, so cmd/agent's flag set stays untouched.
type DevboxConfig struct {
	// Enabled is DEVBOXES_ENABLED; the controller is only registered when it is true.
	Enabled bool
	// OperatorVersion is IMAGE_TAG, used for default images and the daemon compatibility check.
	OperatorVersion string
	// OperatorNamespace holds the gateway and, unless WorkerPoolNamespace is set, the WorkerPools.
	OperatorNamespace string
	// OperatorServiceAccount is the operator's own ServiceAccount, granted owner on each atespace.
	OperatorServiceAccount string

	// DefaultImage is DEVBOX_DEFAULT_IMAGE, the image for runners without spec.image. When unset, DevboxImage
	// falls back to devbox-fat at OperatorVersion on the agent's base registry.
	DefaultImage string
	// GatewayImage is DEVBOX_GATEWAY_IMAGE. When unset, GatewayImageRef falls back like DefaultImage.
	GatewayImage string
	// GatewayReplicas is DEVBOX_GATEWAY_REPLICAS.
	GatewayReplicas int32
	// GatewayServiceAccountAnnotations is DEVBOX_GATEWAY_SA_ANNOTATIONS (k=v,k=v), e.g. workload identity.
	GatewayServiceAccountAnnotations map[string]string

	// WorkerImages maps a sandbox class to its Substrate worker image (DEVBOX_WORKER_IMAGE_GVISOR, DEVBOX_WORKER_IMAGE_MICROVM).
	WorkerImages map[v1alpha1.DevboxSandboxClass]string
	// WorkerPoolNamespace is DEVBOX_WORKERPOOL_NAMESPACE, defaults to OperatorNamespace.
	WorkerPoolNamespace string

	// SubstrateNamespace is SUBSTRATE_NAMESPACE, where atenet-egress and atenet-router run.
	SubstrateNamespace string
	// SubstrateAddress is ATE_API_ADDRESS, ate-api-server's address for runners without spec.substrate.address.
	SubstrateAddress string
	// RouterAddress is DEVBOX_ROUTER_ADDRESS, atenet-router's gRPC address; defaults to atenet-router.<SubstrateNamespace>.svc:443.
	RouterAddress string
	// ActorJWTIssuer is DEVBOX_ACTOR_JWT_ISSUER, Substrate's actor JWT issuer; defaults to the agent-substrate chart's https://idp.<SubstrateNamespace>.svc.
	ActorJWTIssuer string

	// ConsoleURL and DeployToken are the operator's own; the gateway gets the same.
	ConsoleURL  string
	DeployToken string
	// KasURL is KAS's devbox listener, which the gateway tunnels through.
	KasURL    string
	ClusterID string

	DrainTimeout      time.Duration
	HeartbeatInterval time.Duration
}

func LoadDevboxConfig(operatorNamespace, consoleURL, deployToken, clusterID string) DevboxConfig {
	version := os.Getenv("IMAGE_TAG")
	cfg := DevboxConfig{
		Enabled:                          envBool("DEVBOXES_ENABLED"),
		OperatorVersion:                  version,
		OperatorNamespace:                operatorNamespace,
		OperatorServiceAccount:           envOr("DEVBOX_OPERATOR_SERVICE_ACCOUNT", "deployment-operator"),
		DefaultImage:                     os.Getenv("DEVBOX_DEFAULT_IMAGE"),
		GatewayImage:                     os.Getenv("DEVBOX_GATEWAY_IMAGE"),
		GatewayReplicas:                  int32(envInt("DEVBOX_GATEWAY_REPLICAS", 1)),
		GatewayServiceAccountAnnotations: parseKeyValues(os.Getenv("DEVBOX_GATEWAY_SA_ANNOTATIONS")),
		WorkerImages: map[v1alpha1.DevboxSandboxClass]string{
			v1alpha1.DevboxSandboxGVisor:  os.Getenv("DEVBOX_WORKER_IMAGE_GVISOR"),
			v1alpha1.DevboxSandboxMicroVM: os.Getenv("DEVBOX_WORKER_IMAGE_MICROVM"),
		},
		WorkerPoolNamespace: envOr("DEVBOX_WORKERPOOL_NAMESPACE", operatorNamespace),
		SubstrateNamespace:  envOr("SUBSTRATE_NAMESPACE", defaultSubstrateNamespace),
		SubstrateAddress:    envOr("ATE_API_ADDRESS", substrate.DefaultAddress),
		ConsoleURL:          consoleURL,
		DeployToken:         deployToken,
		KasURL:              envOr("DEVBOX_KAS_URL", kasDevboxURL(consoleURL)),
		ClusterID:           clusterID,
		DrainTimeout:        envDuration("DEVBOX_DRAIN_TIMEOUT", defaultDrainTimeout),
		HeartbeatInterval:   envDuration("DEVBOX_HEARTBEAT_INTERVAL", defaultHeartbeatInterval),
	}
	cfg.RouterAddress = envOr("DEVBOX_ROUTER_ADDRESS", "atenet-router."+cfg.SubstrateNamespace+".svc:443")
	cfg.ActorJWTIssuer = envOr("DEVBOX_ACTOR_JWT_ISSUER", "https://idp."+cfg.SubstrateNamespace+".svc")
	return cfg
}

// GatewaySpiffeID is the identity the gateway presents to atenet-router; it must be in --ingress-allowed-spiffe-ids.
func (c DevboxConfig) GatewaySpiffeID() string {
	return "spiffe://cluster.local/ns/" + c.OperatorNamespace + "/sa/" + devboxGatewayName
}

// GatewayPrincipal is the gateway's Substrate API principal, as an access policy member ("user:<id>").
func (c DevboxConfig) GatewayPrincipal() string {
	return "user:system:serviceaccount:" + c.OperatorNamespace + ":" + devboxGatewayName
}

func (c DevboxConfig) OperatorPrincipal() string {
	return "user:system:serviceaccount:" + c.OperatorNamespace + ":" + c.OperatorServiceAccount
}

// DevboxImage is the image for runners without spec.image. The base registry is read on every call since the
// agent configuration can change it at runtime.
func (c DevboxConfig) DevboxImage() string {
	return c.imageOrDefault(c.DefaultImage, defaultDevboxImageRepository)
}

func (c DevboxConfig) GatewayImageRef() string {
	return c.imageOrDefault(c.GatewayImage, defaultGatewayImageRepository)
}

func (c DevboxConfig) imageOrDefault(image, repository string) string {
	if image != "" {
		return image
	}
	return common.GetConfigurationManager().SwapBaseRegistry(imageAtVersion(repository, c.OperatorVersion))
}

func imageAtVersion(repository, version string) string {
	if version == "" {
		version = "latest"
	}
	return repository + ":" + version
}

// kasDevboxURL is KAS's devbox listener on the console host, which the console chart routes at /ext/devbox
// (agentk's /ext/kas goes to a different KAS listener).
func kasDevboxURL(consoleURL string) string {
	u, err := url.Parse(consoleURL)
	if err != nil || u.Host == "" {
		return ""
	}
	scheme := "wss"
	if u.Scheme == "http" {
		scheme = "ws"
	}
	return scheme + "://" + u.Host + "/ext/devbox"
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envBool(key string) bool {
	v, _ := strconv.ParseBool(os.Getenv(key))
	return v
}

func envInt(key string, fallback int) int {
	if v, err := strconv.Atoi(os.Getenv(key)); err == nil {
		return v
	}
	return fallback
}

func envDuration(key string, fallback time.Duration) time.Duration {
	if v, err := time.ParseDuration(os.Getenv(key)); err == nil && v > 0 {
		return v
	}
	return fallback
}

func parseKeyValues(s string) map[string]string {
	out := map[string]string{}
	for _, pair := range strings.Split(s, ",") {
		k, v, ok := strings.Cut(strings.TrimSpace(pair), "=")
		if ok && k != "" {
			out[k] = v
		}
	}
	return out
}
