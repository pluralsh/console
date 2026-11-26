package egress

import (
	"context"
	"crypto/tls"
	"errors"
	"fmt"
	"net"
	"net/http"
	"time"

	extprocv3 "github.com/envoyproxy/go-control-plane/envoy/service/ext_proc/v3"
	"github.com/go-logr/logr"
	"golang.org/x/sync/errgroup"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/health"
	healthpb "google.golang.org/grpc/health/grpc_health_v1"
	"google.golang.org/protobuf/types/known/timestamppb"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/egress/credproviderv1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/scm"
)

const (
	actorCacheTTL = 30 * time.Second
	sweepInterval = 30 * time.Second
	drainGrace    = 5 * time.Second
)

// Service is the egress half of the gateway. Run serves it; the core may also use its helpers directly.
type Service struct {
	cfg  Config
	deps Deps
	log  logr.Logger

	actors   *actorCache
	creds    *credentialCache
	prs      *prRegistry
	provider *credentialProvider
	authz    *authzServer
	mcp      *mcpServer
	verifier *actorVerifier
}

// New builds a Service and sets the default gateway endpoint BuildPolicy uses.
func New(cfg Config, deps Deps) (*Service, error) {
	if deps.Ingest == nil {
		return nil, errors.New("egress: Deps.Ingest is required")
	}
	if deps.Actors == nil {
		return nil, errors.New("egress: Deps.Actors is required")
	}
	log := deps.Logger
	if log.GetSink() == nil {
		log = logr.Discard()
	}
	if cfg.Gateway.Host != "" {
		SetGatewayEndpoint(cfg.Gateway)
	}

	s := &Service{cfg: cfg, deps: deps, log: log}
	s.actors = newActorCache(deps.Actors, actorCacheTTL)
	s.creds = newCredentialCache(deps.Ingest, log.WithName("credentials"))
	s.prs = newPRRegistry()
	s.provider = &credentialProvider{actors: s.actors, creds: s.creds, log: log.WithName("credprovider")}
	s.authz = &authzServer{
		actors:   s.actors,
		gitlab:   newGitLabResolver(s.creds),
		ingest:   deps.Ingest,
		log:      log.WithName("authz"),
		now:      time.Now,
		onReport: func(info *InstanceInfo, url string) { s.prs.record(info, url, "", "", 0) },
	}

	if cfg.MCPAddr != "" && cfg.ActorJWTIssuer == "" {
		return nil, errors.New("egress: MCPAddr needs ActorJWTIssuer to authenticate devbox MCP callers")
	}
	if cfg.ActorJWTIssuer != "" {
		v, err := newActorVerifier(cfg.ActorJWTIssuer, cfg.Gateway.JWTAudience(), cfg.ActorJWTIssuerCAFile)
		if err != nil {
			return nil, err
		}
		s.verifier = v
		var opts []scm.ClientOption
		if cfg.SCMHTTPProxy != "" {
			opts = append(opts, scm.WithHTTPProxy(cfg.SCMHTTPProxy, ""))
		}
		s.mcp = newMCPServer(&mcpServer{
			verifier: v,
			actors:   s.actors,
			ingest:   deps.Ingest,
			creds:    s.creds,
			prs:      s.prs,
			diffs:    deps.Diffs,
			scmOpts:  opts,
			log:      log.WithName("mcp"),
		})
	}
	return s, nil
}

// Run serves the configured listeners until ctx is done or one fails.
func (s *Service) Run(ctx context.Context) error {
	register(s)
	defer unregister(s)

	g, ctx := errgroup.WithContext(ctx)
	g.Go(func() error {
		s.creds.runSweeper(ctx, sweepInterval)
		return nil
	})

	if s.cfg.CredentialProviderAddr != "" || s.cfg.AuthzAddr != "" {
		creds, err := s.grpcCredentials()
		if err != nil {
			return err
		}
		if addr := s.cfg.CredentialProviderAddr; addr != "" {
			srv := s.newGRPCServer(creds)
			credproviderv1.RegisterCredentialProviderServer(srv, s.provider)
			g.Go(func() error { return serveGRPC(ctx, srv, addr, s.log.WithValues("listener", "credprovider")) })
		}
		if addr := s.cfg.AuthzAddr; addr != "" {
			srv := s.newGRPCServer(creds)
			extprocv3.RegisterExternalProcessorServer(srv, s.authz)
			g.Go(func() error { return serveGRPC(ctx, srv, addr, s.log.WithValues("listener", "authz")) })
		}
	}
	if s.mcp != nil && s.cfg.MCPAddr != "" {
		g.Go(func() error { return s.serveMCP(ctx) })
	}
	return g.Wait()
}

func (s *Service) grpcCredentials() (credentials.TransportCredentials, error) {
	if s.cfg.InsecureSkipClientAuth {
		s.log.Info("WARNING: serving the credential provider and ext_proc without mTLS")
		return insecure.NewCredentials(), nil
	}
	cfg, err := egressServerTLS(s.cfg)
	if err != nil {
		return nil, err
	}
	return credentials.NewTLS(cfg), nil
}

func (s *Service) newGRPCServer(creds credentials.TransportCredentials) *grpc.Server {
	srv := grpc.NewServer(grpc.Creds(creds))
	hs := health.NewServer()
	healthpb.RegisterHealthServer(srv, hs)
	return srv
}

func serveGRPC(ctx context.Context, srv *grpc.Server, addr string, log logr.Logger) error {
	lis, err := (&net.ListenConfig{}).Listen(ctx, "tcp", addr)
	if err != nil {
		return fmt.Errorf("egress: listen on %s: %w", addr, err)
	}
	go func() {
		<-ctx.Done()
		done := make(chan struct{})
		go func() { srv.GracefulStop(); close(done) }()
		select {
		case <-done:
		case <-time.After(drainGrace):
			srv.Stop()
		}
	}()
	log.Info("listening", "address", lis.Addr().String())
	if err := srv.Serve(lis); err != nil && !errors.Is(err, grpc.ErrServerStopped) {
		return fmt.Errorf("egress: serving %s: %w", addr, err)
	}
	return nil
}

func (s *Service) serveMCP(ctx context.Context) error {
	srv := &http.Server{Addr: s.cfg.MCPAddr, Handler: s.mcp.handler, ReadHeaderTimeout: 10 * time.Second}
	useTLS := s.cfg.MCPCertFile != "" && s.cfg.MCPKeyFile != ""
	if useTLS {
		srv.TLSConfig = &tls.Config{
			MinVersion: tls.VersionTLS12,
			GetCertificate: func(*tls.ClientHelloInfo) (*tls.Certificate, error) {
				cert, err := tls.LoadX509KeyPair(s.cfg.MCPCertFile, s.cfg.MCPKeyFile)
				return &cert, err
			},
		}
	}
	lis, err := (&net.ListenConfig{}).Listen(ctx, "tcp", s.cfg.MCPAddr)
	if err != nil {
		return fmt.Errorf("egress: listen on %s: %w", s.cfg.MCPAddr, err)
	}
	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), drainGrace)
		defer cancel()
		_ = srv.Shutdown(shutdownCtx)
	}()
	s.log.Info("listening", "listener", "mcp", "address", lis.Addr().String(), "tls", useTLS)
	if useTLS {
		err = srv.ServeTLS(lis, "", "")
	} else {
		err = srv.Serve(lis)
	}
	if err != nil && !errors.Is(err, http.ErrServerClosed) {
		return fmt.Errorf("egress: serving mcp: %w", err)
	}
	return nil
}

// Invalidate drops everything cached for an instance.
func (s *Service) Invalidate(instanceID string) {
	s.creds.invalidate(instanceID)
	s.actors.invalidate(instanceID)
}

// SetStaticCredential serves token as the kind credential of a pseudo-instance the gateway resolves itself (the
// agent probe, whose AI proxy token the operator mints), until expiresAt or Invalidate. It is never refreshed
// from console. The header value is "Bearer <token>".
func (s *Service) SetStaticCredential(instanceID, kind, token string, expiresAt time.Time) error {
	k, ok := kindToProto[kind]
	if !ok || kind == KindSCM || kind == KindOIDC {
		return fmt.Errorf("egress: %s credentials can't be static", kind)
	}
	if token == "" {
		return errors.New("egress: empty static credential")
	}
	cred := &devboxv1.InstanceCredential{Kind: k, Token: token, ExpiresAt: timestamppb.New(expiresAt)}
	s.creds.setStatic(credKey{instanceID: instanceID, kind: kind}, cred, expiresAt)
	return nil
}

// InstanceCredential returns a cached instance credential, fetching or refreshing it as FetchSecret would. The
// core uses it to serve SandboxCredentials.GetSandboxCredential for kind OIDC (selector identity) after
// authenticating the daemon with VerifyActorJWT. Codex bundles carry a refresh lease and shouldn't be cached here.
func (s *Service) InstanceCredential(ctx context.Context, instanceID string, sel *devboxv1.CredentialSelector) (*devboxv1.InstanceCredential, error) {
	var kind string
	for k, v := range kindToProto {
		if v == sel.GetKind() {
			kind = k
		}
	}
	if kind == "" {
		return nil, fmt.Errorf("egress: credential kind %s isn't cached by the gateway", sel.GetKind())
	}
	key := credKey{instanceID: instanceID, kind: kind}
	switch kind {
	case KindSCM:
		key.selector = canonicalSCMHost(sel.GetHost())
	case KindOIDC:
		key.selector = sel.GetIdentity()
	}
	e, err := s.creds.get(ctx, key)
	if err != nil {
		return nil, err
	}
	return e.cred, nil
}

// VerifyActorJWT verifies an actor JWT injected by egress and returns the caller's instance. The core can use it
// for other actor-JWT-authenticated services (SandboxCredentials). It needs the MCP to be configured.
func (s *Service) VerifyActorJWT(ctx context.Context, raw string) (*Caller, error) {
	if s.verifier == nil {
		return nil, errors.New("egress: actor JWT verification isn't configured (set ActorJWTIssuer)")
	}
	actor, err := s.verifier.verify(ctx, raw)
	if err != nil {
		return nil, err
	}
	info, err := s.actors.resolve(ctx, actor)
	if err != nil {
		return nil, err
	}
	return &Caller{ActorID: actor, Instance: info}, nil
}

// MCPHandler serves the devbox MCP at MCPPath. devbox-gateway mounts it on its own DefaultMCPPort server, next to
// SandboxCredentials, so egress needs no MCP listener of its own. It's nil unless ActorJWTIssuer is set.
func (s *Service) MCPHandler() http.Handler {
	if s.mcp == nil {
		return nil
	}
	return s.mcp.handler
}
