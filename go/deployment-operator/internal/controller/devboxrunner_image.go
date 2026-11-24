package controller

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore/policy"
	"github.com/Azure/azure-sdk-for-go/sdk/azidentity"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/ecr"
	"github.com/google/go-containerregistry/pkg/authn"
	"github.com/google/go-containerregistry/pkg/name"
	v1 "github.com/google/go-containerregistry/pkg/v1"
	"github.com/google/go-containerregistry/pkg/v1/google"
	"github.com/google/go-containerregistry/pkg/v1/remote"
	corev1 "k8s.io/api/core/v1"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
)

// ResolvedDevboxImage is spec.image pinned by digest, plus the config fields the image contract checks.
type ResolvedDevboxImage struct {
	// Reference is <repository>@<digest>; the digest is the index digest for multi-platform images.
	Reference  string
	Digest     string
	Labels     map[string]string
	Entrypoint []string
	User       string
	Env        map[string]string
}

// DevboxImageResolver resolves an image reference to a digest and reads its config.
type DevboxImageResolver interface {
	Resolve(ctx context.Context, image string, pullSecrets []corev1.SecretReference) (*ResolvedDevboxImage, error)
}

// RegistryImageResolver resolves through the registry with cloud workload-identity keychains
// (ECR, Artifact Registry/GCR, ACR) plus the runner's imagePullSecrets.
type RegistryImageResolver struct {
	Client client.Client
	// SecretNamespace is used for pull secrets without a namespace.
	SecretNamespace string
	// Platform selects the config of multi-platform images, defaults to linux/amd64.
	Platform *v1.Platform
	// Options are extra remote options, e.g. a transport in tests.
	Options []remote.Option

	cloud     authn.Keychain
	cloudOnce sync.Once
}

func (r *RegistryImageResolver) Resolve(ctx context.Context, image string, pullSecrets []corev1.SecretReference) (*ResolvedDevboxImage, error) {
	ref, err := name.ParseReference(image)
	if err != nil {
		return nil, fmt.Errorf("invalid image reference %q: %w", image, err)
	}

	secrets, err := r.secretsKeychain(ctx, pullSecrets)
	if err != nil {
		return nil, err
	}
	r.cloudOnce.Do(func() { r.cloud = cloudKeychain() })

	platform := v1.Platform{OS: "linux", Architecture: "amd64"}
	if r.Platform != nil {
		platform = *r.Platform
	}
	opts := append([]remote.Option{
		remote.WithContext(ctx),
		remote.WithAuthFromKeychain(authn.NewMultiKeychain(secrets, r.cloud, authn.DefaultKeychain)),
		remote.WithPlatform(platform),
	}, r.Options...)

	desc, err := remote.Get(ref, opts...)
	if err != nil {
		return nil, fmt.Errorf("resolving %s: %w", image, err)
	}
	img, err := desc.Image()
	if err != nil {
		return nil, fmt.Errorf("reading %s for %s: %w", image, platform.String(), err)
	}
	cfg, err := img.ConfigFile()
	if err != nil {
		return nil, fmt.Errorf("reading config of %s: %w", image, err)
	}

	env := map[string]string{}
	for _, kv := range cfg.Config.Env {
		if k, v, ok := strings.Cut(kv, "="); ok {
			env[k] = v
		}
	}
	return &ResolvedDevboxImage{
		Reference:  ref.Context().Name() + "@" + desc.Digest.String(),
		Digest:     desc.Digest.String(),
		Labels:     cfg.Config.Labels,
		Entrypoint: cfg.Config.Entrypoint,
		User:       cfg.Config.User,
		Env:        env,
	}, nil
}

func (r *RegistryImageResolver) secretsKeychain(ctx context.Context, refs []corev1.SecretReference) (authn.Keychain, error) {
	kc := dockerConfigKeychain{}
	for _, ref := range refs {
		ns := ref.Namespace
		if ns == "" {
			ns = r.SecretNamespace
		}
		secret := &corev1.Secret{}
		if err := r.Client.Get(ctx, client.ObjectKey{Name: ref.Name, Namespace: ns}, secret); err != nil {
			return nil, fmt.Errorf("reading image pull secret %s/%s: %w", ns, ref.Name, err)
		}
		if err := kc.add(secret); err != nil {
			return nil, fmt.Errorf("parsing image pull secret %s/%s: %w", ns, ref.Name, err)
		}
	}
	return kc, nil
}

// dockerConfigKeychain resolves registries from kubernetes.io/dockerconfigjson secrets.
type dockerConfigKeychain map[string]authn.AuthConfig

func (k dockerConfigKeychain) add(secret *corev1.Secret) error {
	var cfg struct {
		Auths map[string]authn.AuthConfig `json:"auths"`
	}
	switch {
	case len(secret.Data[corev1.DockerConfigJsonKey]) > 0:
		if err := json.Unmarshal(secret.Data[corev1.DockerConfigJsonKey], &cfg); err != nil {
			return err
		}
	case len(secret.Data[corev1.DockerConfigKey]) > 0:
		if err := json.Unmarshal(secret.Data[corev1.DockerConfigKey], &cfg.Auths); err != nil {
			return err
		}
	default:
		return fmt.Errorf("secret has neither %s nor %s", corev1.DockerConfigJsonKey, corev1.DockerConfigKey)
	}

	for server, auth := range cfg.Auths {
		if auth.Auth != "" && auth.Username == "" {
			if decoded, err := base64.StdEncoding.DecodeString(auth.Auth); err == nil {
				if u, p, ok := strings.Cut(string(decoded), ":"); ok {
					auth.Username, auth.Password, auth.Auth = u, p, ""
				}
			}
		}
		k[normalizeRegistryHost(server)] = auth
	}
	return nil
}

func (k dockerConfigKeychain) Resolve(target authn.Resource) (authn.Authenticator, error) {
	host := normalizeRegistryHost(target.RegistryStr())
	if auth, ok := k[host]; ok {
		return authn.FromConfig(auth), nil
	}
	return authn.Anonymous, nil
}

func normalizeRegistryHost(server string) string {
	if u, err := url.Parse(server); err == nil && u.Host != "" {
		server = u.Host
	}
	server = strings.TrimSuffix(strings.Split(server, "/")[0], "/")
	switch server {
	case "docker.io", "registry-1.docker.io":
		return name.DefaultRegistry
	}
	return server
}

// cloudKeychain returns the workload-identity keychains for the three clouds, each only answering for its own registries.
func cloudKeychain() authn.Keychain {
	return authn.NewMultiKeychain(google.Keychain, &ecrKeychain{}, &acrKeychain{})
}

var ecrHost = regexp.MustCompile(`^(\d{12})\.dkr\.ecr(-fips)?\.([a-z0-9-]+)\.amazonaws\.com(\.cn)?$`)

type cachedAuth struct {
	auth    authn.AuthConfig
	expires time.Time
}

type ecrKeychain struct {
	mu    sync.Mutex
	cache map[string]cachedAuth
}

func (k *ecrKeychain) Resolve(target authn.Resource) (authn.Authenticator, error) {
	host := target.RegistryStr()
	m := ecrHost.FindStringSubmatch(host)
	if m == nil {
		return authn.Anonymous, nil
	}

	k.mu.Lock()
	defer k.mu.Unlock()
	if c, ok := k.cache[host]; ok && time.Now().Before(c.expires) {
		return authn.FromConfig(c.auth), nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	cfg, err := awsconfig.LoadDefaultConfig(ctx, awsconfig.WithRegion(m[3]))
	if err != nil {
		return authn.Anonymous, nil
	}
	out, err := ecr.NewFromConfig(cfg).GetAuthorizationToken(ctx, &ecr.GetAuthorizationTokenInput{})
	if err != nil || len(out.AuthorizationData) == 0 || out.AuthorizationData[0].AuthorizationToken == nil {
		return authn.Anonymous, nil
	}
	decoded, err := base64.StdEncoding.DecodeString(*out.AuthorizationData[0].AuthorizationToken)
	if err != nil {
		return authn.Anonymous, nil
	}
	user, pass, _ := strings.Cut(string(decoded), ":")
	auth := authn.AuthConfig{Username: user, Password: pass}
	expires := time.Now().Add(time.Hour)
	if out.AuthorizationData[0].ExpiresAt != nil {
		expires = out.AuthorizationData[0].ExpiresAt.Add(-5 * time.Minute)
	}
	if k.cache == nil {
		k.cache = map[string]cachedAuth{}
	}
	k.cache[host] = cachedAuth{auth: auth, expires: expires}
	return authn.FromConfig(auth), nil
}

type acrKeychain struct {
	mu    sync.Mutex
	cache map[string]cachedAuth
}

// acrNullUser is the username ACR expects alongside a refresh token.
const acrNullUser = "00000000-0000-0000-0000-000000000000"

func (k *acrKeychain) Resolve(target authn.Resource) (authn.Authenticator, error) {
	host := target.RegistryStr()
	if !strings.HasSuffix(host, ".azurecr.io") && !strings.HasSuffix(host, ".azurecr.cn") && !strings.HasSuffix(host, ".azurecr.us") {
		return authn.Anonymous, nil
	}

	k.mu.Lock()
	defer k.mu.Unlock()
	if c, ok := k.cache[host]; ok && time.Now().Before(c.expires) {
		return authn.FromConfig(c.auth), nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	cred, err := azidentity.NewDefaultAzureCredential(nil)
	if err != nil {
		return authn.Anonymous, nil
	}
	token, err := cred.GetToken(ctx, policy.TokenRequestOptions{Scopes: []string{"https://management.azure.com/.default"}})
	if err != nil {
		return authn.Anonymous, nil
	}

	form := url.Values{"grant_type": {"access_token"}, "service": {host}, "access_token": {token.Token}}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://"+host+"/oauth2/exchange", strings.NewReader(form.Encode()))
	if err != nil {
		return authn.Anonymous, nil
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return authn.Anonymous, nil
	}
	defer res.Body.Close()
	var exchanged struct {
		RefreshToken string `json:"refresh_token"`
	}
	if res.StatusCode != http.StatusOK || json.NewDecoder(res.Body).Decode(&exchanged) != nil || exchanged.RefreshToken == "" {
		return authn.Anonymous, nil
	}

	auth := authn.AuthConfig{Username: acrNullUser, Password: exchanged.RefreshToken}
	if k.cache == nil {
		k.cache = map[string]cachedAuth{}
	}
	k.cache[host] = cachedAuth{auth: auth, expires: token.ExpiresOn.Add(-5 * time.Minute)}
	return authn.FromConfig(auth), nil
}

// DevboxImageContractResult is the outcome of checking a resolved image against its contract.
type DevboxImageContractResult struct {
	// Violations make the image unusable; the template revision is not built.
	Violations []string
	// DaemonVersion is only set for runtime images.
	DaemonVersion string
}

func (r DevboxImageContractResult) OK() bool {
	return len(r.Violations) == 0
}

// CheckDevboxImageContract checks an environment image (spec.image) against contract v1, as far as the image
// config shows without pulling layers: the contract label, UID 1000 and the trust directory. The image's
// ENTRYPOINT and any devbox-daemon in it are ignored, since the devbox container runs the daemon the runtime
// sidecar installs. The shell that starts it, agent presence and trust-store writability are verified in the
// guest, by the golden boot and its agent probe.
func CheckDevboxImageContract(img *ResolvedDevboxImage) DevboxImageContractResult {
	res := DevboxImageContractResult{}

	if contract := img.Labels[v1alpha1.DevboxImageContractLabel]; contract != v1alpha1.DevboxImageContractV1 {
		res.Violations = append(res.Violations, fmt.Sprintf("label %s is %q, want %q; build FROM ghcr.io/pluralsh/devbox-minimal or devbox-fat",
			v1alpha1.DevboxImageContractLabel, contract, v1alpha1.DevboxImageContractV1))
	}

	if uid := strings.Split(img.User, ":")[0]; uid != "1000" {
		res.Violations = append(res.Violations, fmt.Sprintf("USER is %q, want UID 1000 (USER 1000:1000 or USER dev with dev as UID 1000 declared numerically)", img.User))
	}

	if dir, ok := img.Env["DEVBOX_TRUST_DIR"]; !ok || !strings.HasPrefix(dir, "/") {
		res.Violations = append(res.Violations, fmt.Sprintf("DEVBOX_TRUST_DIR is %q, want an absolute path such as /var/lib/devbox/trust", dir))
	}
	return res
}

// CheckDevboxRuntimeContract checks the runtime image the operator resolved for itself. Its daemon version is
// not compared with the operator's: the image is selected by the operator's version, and its daemon keeps the
// version of the release that last changed it.
func CheckDevboxRuntimeContract(img *ResolvedDevboxImage) DevboxImageContractResult {
	res := DevboxImageContractResult{DaemonVersion: img.Labels[v1alpha1.DevboxImageDaemonVersionLabel]}

	if contract := img.Labels[v1alpha1.DevboxRuntimeContractLabel]; contract != v1alpha1.DevboxRuntimeContractV1 {
		res.Violations = append(res.Violations, fmt.Sprintf("label %s is %q, want %q; the runtime image must be ghcr.io/pluralsh/devbox-runtime-core or a mirror of it",
			v1alpha1.DevboxRuntimeContractLabel, contract, v1alpha1.DevboxRuntimeContractV1))
	}
	if res.DaemonVersion == "" {
		res.Violations = append(res.Violations, fmt.Sprintf("label %s is missing", v1alpha1.DevboxImageDaemonVersionLabel))
	}
	return res
}
