package egress

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"strings"

	"github.com/go-logr/logr"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/egress/credproviderv1"
)

// secretRef is a parsed ate-secret://plural.sh/instances/<id>/<kind>[/<host>] URI.
type secretRef struct {
	instanceID string
	kind       string
	host       string
	// bare asks for the SCM token itself (KindSCMToken) instead of the Authorization value.
	bare bool
}

func parseSecretURI(uri string) (secretRef, error) {
	rest, ok := strings.CutPrefix(uri, "ate-secret://"+CredentialProviderName+"/")
	if !ok {
		return secretRef{}, fmt.Errorf("URI %q is not served by provider %s", uri, CredentialProviderName)
	}
	parts := strings.Split(rest, "/")
	if len(parts) < 3 || len(parts) > 4 || parts[0] != "instances" || parts[1] == "" {
		return secretRef{}, fmt.Errorf("URI %q is not ate-secret://%s/instances/<id>/<kind>", uri, CredentialProviderName)
	}
	ref := secretRef{instanceID: parts[1], kind: parts[2]}
	if ref.kind == KindSCMToken {
		ref.kind, ref.bare = KindSCM, true
	}
	if len(parts) == 4 {
		if ref.kind != KindSCM || parts[3] == "" {
			return secretRef{}, fmt.Errorf("URI %q: only scm credentials take a host", uri)
		}
		ref.host = canonicalSCMHost(parts[3])
	}
	switch ref.kind {
	case KindSCM, KindAIProxy, KindConsole, KindClaudeOAuth:
	default:
		return secretRef{}, fmt.Errorf("URI %q: unsupported credential kind %q", uri, ref.kind)
	}
	return ref, nil
}

// credentialProvider implements substrate.credprovider.v1.CredentialProvider for atenet-egress. Egress calls it on
// every request that needs injection and fails closed: NotFound and PermissionDenied become a 403 in the sandbox,
// Unavailable a retryable 503.
type credentialProvider struct {
	credproviderv1.UnimplementedCredentialProviderServer

	actors *actorCache
	creds  *credentialCache
	log    logr.Logger
}

func (p *credentialProvider) FetchSecret(ctx context.Context, req *credproviderv1.FetchSecretRequest) (*credproviderv1.FetchSecretResponse, error) {
	ref, err := parseSecretURI(req.GetUri())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, err.Error())
	}
	actor, err := ActorIDFromSPIFFEID(req.GetActorSpiffeId())
	if err != nil {
		return nil, status.Errorf(codes.PermissionDenied, "a valid actor identity is required: %v", err)
	}
	info, err := p.actors.resolve(ctx, actor)
	switch {
	case errors.Is(err, ErrUnknownActor):
		p.log.Info("credential request denied: actor is not a devbox instance", "actor", actor, "instance", ref.instanceID)
		return nil, status.Errorf(codes.PermissionDenied, "actor %s is not a devbox instance", actor)
	case err != nil:
		return nil, status.Errorf(codes.Unavailable, "resolving actor %s: %v", actor, err)
	}
	if info.InstanceID != ref.instanceID {
		p.log.Info("credential request denied: actor asked for another instance's credential", "actor", actor, "actorInstance", info.InstanceID, "instance", ref.instanceID, "kind", ref.kind)
		return nil, status.Errorf(codes.PermissionDenied, "actor %s may not resolve credentials of instance %s", actor, ref.instanceID)
	}
	key, err := authorizeCredential(info, ref)
	if err != nil {
		return nil, status.Error(codes.PermissionDenied, err.Error())
	}

	e, err := p.creds.get(ctx, key)
	if err != nil {
		if status.Code(err) == codes.Unavailable {
			p.log.Info("credentials unavailable", "instance", ref.instanceID, "kind", ref.kind, "error", status.Convert(err).Message())
		}
		return nil, err
	}
	if ref.bare {
		token, err := RawSCMToken(e.cred)
		if err != nil {
			return nil, status.Error(codes.NotFound, err.Error())
		}
		return &credproviderv1.FetchSecretResponse{OpaqueBytes: []byte(token)}, nil
	}
	return &credproviderv1.FetchSecretResponse{OpaqueBytes: e.value}, nil
}

// authorizeCredential checks that the instance may have the credential it names, and returns its cache key.
func authorizeCredential(info *InstanceInfo, ref secretRef) (credKey, error) {
	key := credKey{instanceID: ref.instanceID, kind: ref.kind}
	switch ref.kind {
	case KindSCM:
		hosts := make([]string, 0, len(info.SCMHosts))
		for _, h := range info.SCMHosts {
			hosts = append(hosts, canonicalSCMHost(h))
		}
		host := ref.host
		if host == "" && len(hosts) == 1 {
			host = hosts[0]
		}
		if host == "" || !slices.Contains(hosts, host) {
			return key, fmt.Errorf("instance %s has no SCM connection for %q", info.InstanceID, ref.host)
		}
		key.selector = host
	case KindClaudeOAuth:
		if !subscriptionBilling(info.AgentBilling, "claude") {
			return key, fmt.Errorf("instance %s doesn't bill Claude through a subscription", info.InstanceID)
		}
	}
	return key, nil
}
