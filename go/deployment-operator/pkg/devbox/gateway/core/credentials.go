package core

import (
	"context"
	"errors"
	"strings"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/egress"
)

// sandboxCredentials serves devbox.v1.SandboxCredentials to daemons through egress, which injects the actor JWT
// that identifies the calling instance. Requests never name an instance.
type sandboxCredentials struct {
	devboxv1.UnimplementedSandboxCredentialsServer
	g *Gateway
}

// RegisterSandboxCredentials adds SandboxCredentials to a server.
func (g *Gateway) RegisterSandboxCredentials(s grpc.ServiceRegistrar) {
	devboxv1.RegisterSandboxCredentialsServer(s, &sandboxCredentials{g: g})
}

func (s *sandboxCredentials) caller(ctx context.Context) (*Instance, error) {
	if s.g.deps.Credentials == nil {
		return nil, status.Error(codes.Unavailable, "sandbox credentials aren't configured on this gateway")
	}
	md, _ := metadata.FromIncomingContext(ctx)
	scheme, token, ok := strings.Cut(strings.TrimSpace(firstMD(md, "authorization")), " ")
	if !ok || !strings.EqualFold(scheme, "bearer") || strings.TrimSpace(token) == "" {
		return nil, status.Error(codes.Unauthenticated, "an actor JWT is required")
	}
	caller, err := s.g.deps.Credentials.VerifyActorJWT(ctx, strings.TrimSpace(token))
	switch {
	case errors.Is(err, egress.ErrUnknownActor):
		return nil, status.Error(codes.PermissionDenied, "caller is not a devbox instance")
	case err != nil:
		s.g.log.V(1).Info("rejected sandbox credentials caller", "error", err.Error())
		return nil, status.Error(codes.Unauthenticated, "invalid actor JWT")
	case caller == nil || caller.Instance == nil:
		return nil, status.Error(codes.PermissionDenied, "caller is not a devbox instance")
	}
	inst := s.g.get(caller.Instance.InstanceID)
	if inst == nil || inst.ActorID() != caller.ActorID {
		return nil, status.Error(codes.PermissionDenied, "caller is not a devbox instance")
	}
	return inst, nil
}

func (s *sandboxCredentials) GetSandboxCredential(ctx context.Context, req *devboxv1.GetSandboxCredentialRequest) (*devboxv1.GetSandboxCredentialResponse, error) {
	inst, err := s.caller(ctx)
	if err != nil {
		return nil, err
	}
	sel := req.GetSelector()
	switch sel.GetKind() {
	case devboxv1.CredentialKind_CREDENTIAL_KIND_OIDC:
		identities := []string{sel.GetIdentity()}
		if sel.GetIdentity() == "" {
			inst.mu.Lock()
			if inst.runner != nil && len(inst.runner.CloudIdentities) > 0 {
				identities = identities[:0]
				for _, ci := range inst.runner.CloudIdentities {
					identities = append(identities, ci.GetName())
				}
			}
			inst.mu.Unlock()
		}
		resp := &devboxv1.GetSandboxCredentialResponse{}
		for _, id := range identities {
			cred, err := s.g.deps.Credentials.InstanceCredential(ctx, inst.ID, &devboxv1.CredentialSelector{Kind: sel.GetKind(), Identity: id})
			if err != nil {
				return nil, credentialsError(err)
			}
			resp.Credentials = append(resp.Credentials, cred)
		}
		return resp, nil
	case devboxv1.CredentialKind_CREDENTIAL_KIND_CODEX:
		// Not cached: Codex bundles carry a per-credential refresh lease console arbitrates.
		out, err := s.g.deps.Ingest.GetInstanceCredentials(ctx, &devboxv1.GetInstanceCredentialsRequest{
			InstanceId:  inst.ID,
			Credentials: []*devboxv1.CredentialSelector{sel},
		})
		if err != nil {
			return nil, credentialsError(err)
		}
		return &devboxv1.GetSandboxCredentialResponse{Credentials: out.GetCredentials()}, nil
	default:
		return nil, status.Errorf(codes.PermissionDenied, "credential kind %s is injected at egress and never enters the sandbox", sel.GetKind())
	}
}

func (s *sandboxCredentials) UpdateCodexBundle(ctx context.Context, req *devboxv1.UpdateCodexBundleRequest) (*devboxv1.UpdateCodexBundleResponse, error) {
	inst, err := s.caller(ctx)
	if err != nil {
		return nil, err
	}
	if req.GetCredentialId() == "" || len(req.GetBundleJson()) == 0 {
		return nil, status.Error(codes.InvalidArgument, "credential_id and bundle_json are required")
	}
	resp, err := s.g.deps.Ingest.UpdateAgentCredential(ctx, &devboxv1.UpdateAgentCredentialRequest{
		InstanceId:      inst.ID,
		CredentialId:    req.GetCredentialId(),
		ExpectedVersion: req.GetExpectedVersion(),
		BundleJson:      req.GetBundleJson(),
		RefreshedAt:     req.GetRefreshedAt(),
	})
	if err != nil {
		return nil, credentialsError(err)
	}
	return &devboxv1.UpdateCodexBundleResponse{Applied: resp.GetApplied(), Current: resp.GetCurrent()}, nil
}

func credentialsError(err error) error {
	if _, ok := status.FromError(err); ok {
		return err
	}
	return statusError(codes.Unavailable, devboxv1.ErrorReason_ERROR_REASON_CREDENTIALS_UNAVAILABLE, "%v", err)
}
