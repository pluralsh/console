package core

import (
	"context"
	"errors"
	"net"
	"testing"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
	"google.golang.org/grpc/test/bufconn"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/egress"
)

// fakeCredentials accepts "jwt-<actor>" tokens and serves OIDC tokens per identity.
type fakeCredentials struct {
	g *Gateway
}

func (f *fakeCredentials) VerifyActorJWT(ctx context.Context, raw string) (*egress.Caller, error) {
	if len(raw) < 5 || raw[:4] != "jwt-" {
		return nil, errors.New("bad signature")
	}
	info, err := f.g.ResolveActor(ctx, raw[4:])
	if err != nil {
		return nil, err
	}
	return &egress.Caller{ActorID: raw[4:], Instance: info}, nil
}

func (f *fakeCredentials) InstanceCredential(_ context.Context, instanceID string, sel *devboxv1.CredentialSelector) (*devboxv1.InstanceCredential, error) {
	return &devboxv1.InstanceCredential{Kind: sel.GetKind(), Identity: sel.GetIdentity(), Token: "oidc-" + instanceID + "-" + sel.GetIdentity()}, nil
}

func credentialsClient(t *testing.T, g *Gateway) devboxv1.SandboxCredentialsClient {
	lis := bufconn.Listen(1 << 20)
	srv := grpc.NewServer()
	g.RegisterSandboxCredentials(srv)
	go func() { _ = srv.Serve(lis) }()
	conn, err := grpc.NewClient("passthrough:///creds",
		grpc.WithContextDialer(func(ctx context.Context, _ string) (net.Conn, error) { return lis.DialContext(ctx) }),
		grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_ = conn.Close()
		srv.Stop()
	})
	return devboxv1.NewSandboxCredentialsClient(conn)
}

func bearer(token string) context.Context {
	return metadata.AppendToOutgoingContext(context.Background(), "authorization", "Bearer "+token)
}

func TestSandboxCredentialsAuth(t *testing.T) {
	h := newHarness(t, nil)
	h.running("inst-1")
	h.g.UseEgress(h.egress, &fakeCredentials{g: h.g})
	c := credentialsClient(t, h.g)
	oidc := &devboxv1.GetSandboxCredentialRequest{Selector: &devboxv1.CredentialSelector{Kind: devboxv1.CredentialKind_CREDENTIAL_KIND_OIDC, Identity: "aws"}}

	if _, err := c.GetSandboxCredential(context.Background(), oidc); status.Code(err) != codes.Unauthenticated {
		t.Fatalf("no token = %v", err)
	}
	if _, err := c.GetSandboxCredential(bearer("forged"), oidc); status.Code(err) != codes.Unauthenticated {
		t.Fatalf("bad token = %v", err)
	}
	if _, err := c.GetSandboxCredential(bearer("jwt-"+testAtespace+"/someone-else"), oidc); status.Code(err) != codes.PermissionDenied {
		t.Fatalf("unknown actor = %v", err)
	}

	ctx := bearer("jwt-" + testAtespace + "/dbx-inst-1")
	resp, err := c.GetSandboxCredential(ctx, oidc)
	if err != nil || len(resp.GetCredentials()) != 1 || resp.GetCredentials()[0].GetToken() != "oidc-inst-1-aws" {
		t.Fatalf("OIDC = %v, %v", resp, err)
	}

	codex := &devboxv1.GetSandboxCredentialRequest{Selector: &devboxv1.CredentialSelector{Kind: devboxv1.CredentialKind_CREDENTIAL_KIND_CODEX}}
	resp, err = c.GetSandboxCredential(ctx, codex)
	if err != nil || resp.GetCredentials()[0].GetCredentialId() != "cred-1" {
		t.Fatalf("Codex = %v, %v", resp, err)
	}
	h.ingest.mu.Lock()
	credReq := h.ingest.creds[0]
	h.ingest.mu.Unlock()
	if credReq.GetInstanceId() != "inst-1" {
		t.Fatalf("Codex fetched for %q", credReq.GetInstanceId())
	}

	scm := &devboxv1.GetSandboxCredentialRequest{Selector: &devboxv1.CredentialSelector{Kind: devboxv1.CredentialKind_CREDENTIAL_KIND_SCM}}
	if _, err := c.GetSandboxCredential(ctx, scm); status.Code(err) != codes.PermissionDenied {
		t.Fatalf("SCM kind = %v", err)
	}

	up, err := c.UpdateCodexBundle(ctx, &devboxv1.UpdateCodexBundleRequest{CredentialId: "cred-1", ExpectedVersion: 3, BundleJson: []byte(`{}`)})
	if err != nil || !up.GetApplied() {
		t.Fatalf("UpdateCodexBundle = %v, %v", up, err)
	}
	h.ingest.mu.Lock()
	upd := h.ingest.updates[0]
	h.ingest.mu.Unlock()
	if upd.GetInstanceId() != "inst-1" || upd.GetExpectedVersion() != 3 {
		t.Fatalf("write-back = %v", upd)
	}
	if _, err := c.UpdateCodexBundle(bearer("forged"), &devboxv1.UpdateCodexBundleRequest{CredentialId: "cred-1", BundleJson: []byte(`{}`)}); status.Code(err) != codes.Unauthenticated {
		t.Fatalf("forged write-back = %v", err)
	}
}
