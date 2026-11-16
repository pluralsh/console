package egress

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"math/big"
	"net"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/go-logr/logr"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/egress/credproviderv1"
)

const devboxActor = "spiffe://substrate-actor.local/actor/devboxes/box-1-i1"

func newTestProvider(t *testing.T, ingest *fakeIngest, info *InstanceInfo) *credentialProvider {
	t.Helper()
	resolver := &fakeResolver{actors: map[string]*InstanceInfo{}}
	if info != nil {
		resolver.actors["devboxes/box-1-i1"] = info
	}
	return &credentialProvider{
		actors: newActorCache(resolver, time.Minute),
		creds:  newCredentialCache(ingest, logr.Discard()),
		log:    logr.Discard(),
	}
}

func credInstance() *InstanceInfo {
	return &InstanceInfo{
		InstanceID:   "i1",
		SCMHosts:     []string{"github.com", "gitlab.example.com"},
		AgentBilling: map[string]string{"claude": "proxy"},
	}
}

func TestFetchSecretAuthorization(t *testing.T) {
	ingest := &fakeIngest{creds: tokenCreds(time.Now, time.Hour)}
	p := newTestProvider(t, ingest, credInstance())

	cases := []struct {
		name  string
		uri   string
		actor string
		code  codes.Code
		value string
	}{
		{name: "scm", uri: "ate-secret://plural.sh/instances/i1/scm/github.com", actor: devboxActor, value: "Bearer tok-CREDENTIAL_KIND_SCM-1"},
		{name: "scm companion host maps to connection", uri: "ate-secret://plural.sh/instances/i1/scm/api.github.com", actor: devboxActor, value: "Bearer tok-CREDENTIAL_KIND_SCM-1"},
		{name: "console", uri: "ate-secret://plural.sh/instances/i1/console", actor: devboxActor, value: "Bearer tok-CREDENTIAL_KIND_CONSOLE-2"},
		{name: "worker-for-actor identity accepted", uri: "ate-secret://plural.sh/instances/i1/ai-proxy", actor: "spiffe://substrate-actor.local/worker-for-actor/devboxes/box-1-i1", value: "Bearer tok-CREDENTIAL_KIND_AI_PROXY-3"},
		{name: "another instance", uri: "ate-secret://plural.sh/instances/i2/console", actor: devboxActor, code: codes.PermissionDenied},
		{name: "unknown actor", uri: "ate-secret://plural.sh/instances/i1/console", actor: "spiffe://substrate-actor.local/actor/devboxes/someone-else", code: codes.PermissionDenied},
		{name: "missing actor", uri: "ate-secret://plural.sh/instances/i1/console", code: codes.PermissionDenied},
		{name: "scm host without connection", uri: "ate-secret://plural.sh/instances/i1/scm/bitbucket.org", actor: devboxActor, code: codes.PermissionDenied},
		{name: "ambiguous bare scm", uri: "ate-secret://plural.sh/instances/i1/scm", actor: devboxActor, code: codes.PermissionDenied},
		{name: "claude oauth without subscription", uri: "ate-secret://plural.sh/instances/i1/claude-oauth", actor: devboxActor, code: codes.PermissionDenied},
		{name: "other provider", uri: "ate-secret://k8s/ns/secret/key", actor: devboxActor, code: codes.InvalidArgument},
		{name: "unknown kind", uri: "ate-secret://plural.sh/instances/i1/aws", actor: devboxActor, code: codes.InvalidArgument},
		{name: "host on non-scm kind", uri: "ate-secret://plural.sh/instances/i1/console/x", actor: devboxActor, code: codes.InvalidArgument},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			resp, err := p.FetchSecret(context.Background(), &credproviderv1.FetchSecretRequest{Uri: tc.uri, ActorSpiffeId: tc.actor})
			if status.Code(err) != tc.code {
				t.Fatalf("code = %v (%v), want %v", status.Code(err), err, tc.code)
			}
			if tc.code == codes.OK && string(resp.GetOpaqueBytes()) != tc.value {
				t.Fatalf("value = %q, want %q", resp.GetOpaqueBytes(), tc.value)
			}
		})
	}
}

func TestFetchSecretSCMTokenIsTheBareToken(t *testing.T) {
	ingest := &fakeIngest{creds: basicSCMCreds("oauth2", tokenCreds(time.Now, time.Hour))}
	p := newTestProvider(t, ingest, credInstance())
	fetch := func(uri string) (string, error) {
		resp, err := p.FetchSecret(context.Background(), &credproviderv1.FetchSecretRequest{Uri: uri, ActorSpiffeId: devboxActor})
		return string(resp.GetOpaqueBytes()), err
	}

	header, err := fetch("ate-secret://plural.sh/instances/i1/scm/gitlab.example.com")
	if err != nil || !strings.HasPrefix(header, "Basic ") {
		t.Fatalf("scm = %q, %v; want a Basic header value", header, err)
	}
	token, err := fetch("ate-secret://plural.sh/instances/i1/scm-token/gitlab.example.com")
	if err != nil || token != "tok-CREDENTIAL_KIND_SCM-1" {
		t.Fatalf("scm-token = %q, %v; want the raw token from the same cached credential", token, err)
	}
	if n := ingest.credCall.Load(); n != 1 {
		t.Fatalf("console called %d times; scm and scm-token should share one credential", n)
	}
	if _, err := fetch("ate-secret://plural.sh/instances/i1/scm-token/bitbucket.org"); status.Code(err) != codes.PermissionDenied {
		t.Fatalf("scm-token for a host without a connection: %v, want PermissionDenied", err)
	}
}

func TestFetchSecretSingleSCMHostAcceptsBareURI(t *testing.T) {
	info := credInstance()
	info.SCMHosts = []string{"github.com"}
	info.AgentBilling = map[string]string{"AGENT_TYPE_CLAUDE": "BILLING_MODE_SUBSCRIPTION"}
	p := newTestProvider(t, &fakeIngest{creds: tokenCreds(time.Now, time.Hour)}, info)
	for _, uri := range []string{"ate-secret://plural.sh/instances/i1/scm", "ate-secret://plural.sh/instances/i1/claude-oauth"} {
		if _, err := p.FetchSecret(context.Background(), &credproviderv1.FetchSecretRequest{Uri: uri, ActorSpiffeId: devboxActor}); err != nil {
			t.Fatalf("%s: %v", uri, err)
		}
	}
}

func TestFetchSecretResolverErrorIsUnavailable(t *testing.T) {
	ingest := &fakeIngest{creds: tokenCreds(time.Now, time.Hour)}
	p := newTestProvider(t, ingest, credInstance())
	p.actors.resolver.(*fakeResolver).err = context.DeadlineExceeded
	_, err := p.FetchSecret(context.Background(), &credproviderv1.FetchSecretRequest{Uri: "ate-secret://plural.sh/instances/i1/console", ActorSpiffeId: devboxActor})
	if status.Code(err) != codes.Unavailable {
		t.Fatalf("want Unavailable, got %v", err)
	}
}

func TestStaticCredentialIsServedWithoutConsole(t *testing.T) {
	clock := newFakeClock()
	ingest := &fakeIngest{creds: tokenCreds(clock.Now, time.Hour)}
	c := newClockedCache(ingest, clock)
	key := credKey{instanceID: "probe-r1", kind: KindAIProxy}
	c.setStatic(key, &devboxv1.InstanceCredential{Kind: devboxv1.CredentialKind_CREDENTIAL_KIND_AI_PROXY, Token: "plrl-dbx-x"}, clock.Now().Add(time.Hour))

	for range 3 {
		clock.Advance(50 * time.Minute / 3)
		e, err := c.get(context.Background(), key)
		if err != nil || string(e.value) != "Bearer plrl-dbx-x" {
			t.Fatalf("static credential: %v, %v", e, err)
		}
		c.sweep()
	}
	clock.Advance(11 * time.Minute)
	if _, err := c.get(context.Background(), key); status.Code(err) != codes.Unavailable {
		t.Fatalf("expired static credential: want Unavailable, got %v", err)
	}
	time.Sleep(20 * time.Millisecond)
	if n := ingest.credCall.Load(); n != 0 {
		t.Fatalf("static credentials must never reach console, got %d Ingest calls", n)
	}
	c.invalidate("probe-r1")
	if _, ok := c.entries[key]; ok {
		t.Fatal("Invalidate should drop static credentials")
	}
}

func TestHeaderValueFormats(t *testing.T) {
	cases := map[string]string{
		"":             "Bearer t",
		"token %s":     "token t",
		"Basic ":       "Basic t",
		"PRIVATE-%s-x": "PRIVATE-t-x",
	}
	for format, want := range cases {
		got := string(headerValue(&devboxv1.InstanceCredential{Token: "t", HeaderFormat: format}))
		if got != want {
			t.Errorf("format %q: %q, want %q", format, got, want)
		}
	}
}

func newClockedCache(ingest *fakeIngest, clock *fakeClock) *credentialCache {
	c := newCredentialCache(ingest, logr.Discard())
	c.now = clock.Now
	return c
}

var consoleKey = credKey{instanceID: "i1", kind: KindConsole}

func waitFor(t *testing.T, what string, cond func() bool) {
	t.Helper()
	deadline := time.Now().Add(5 * time.Second)
	for !cond() {
		if time.Now().After(deadline) {
			t.Fatalf("timed out waiting for %s", what)
		}
		time.Sleep(5 * time.Millisecond)
	}
}

func TestCredentialRefreshAhead(t *testing.T) {
	clock := newFakeClock()
	ingest := &fakeIngest{creds: tokenCreds(clock.Now, time.Hour)}
	c := newClockedCache(ingest, clock)

	e, err := c.get(context.Background(), consoleKey)
	if err != nil {
		t.Fatal(err)
	}
	first := string(e.value)
	if want := clock.Now().Add(50 * time.Minute); !e.refreshAfter.Equal(want) {
		t.Fatalf("refreshAfter = %v, want 10m before expiry (%v)", e.refreshAfter, want)
	}

	clock.Advance(40 * time.Minute)
	if e, _ := c.get(context.Background(), consoleKey); string(e.value) != first || ingest.credCall.Load() != 1 {
		t.Fatalf("fresh entry should be served from cache")
	}

	clock.Advance(15 * time.Minute) // past refresh_after, before expiry
	e, err = c.get(context.Background(), consoleKey)
	if err != nil || string(e.value) != first {
		t.Fatalf("stale entry should be served while refreshing: %v %q", err, e.value)
	}
	waitFor(t, "background refresh", func() bool {
		e, _ := c.get(context.Background(), consoleKey)
		return string(e.value) != first
	})
	if n := ingest.credCall.Load(); n != 2 {
		t.Fatalf("want exactly one refresh, got %d Ingest calls", n)
	}
}

// Callers that see the stale entry while its refresh is in flight, or after singleflight finished it but before
// they were scheduled, must not start another refresh.
func TestCredentialRefreshStartsOnce(t *testing.T) {
	clock := newFakeClock()
	ingest := &fakeIngest{creds: tokenCreds(clock.Now, time.Hour)}
	c := newClockedCache(ingest, clock)
	e, err := c.get(context.Background(), consoleKey)
	if err != nil {
		t.Fatal(err)
	}
	first := string(e.value)

	gate := make(chan struct{})
	ingest.mu.Lock()
	ingest.credGate = gate
	ingest.mu.Unlock()
	clock.Advance(55 * time.Minute)
	for range 50 {
		if e, err := c.get(context.Background(), consoleKey); err != nil || string(e.value) != first {
			t.Fatalf("stale entry should be served while refreshing: %v", err)
		}
		c.sweep()
	}
	waitFor(t, "refresh to start", func() bool { return ingest.credCall.Load() == 2 })
	close(gate)
	waitFor(t, "background refresh", func() bool {
		e, _ := c.get(context.Background(), consoleKey)
		return string(e.value) != first
	})
	time.Sleep(20 * time.Millisecond)
	if n := ingest.credCall.Load(); n != 2 {
		t.Fatalf("want exactly one refresh, got %d Ingest calls", n)
	}
}

func TestCredentialHonoursRefreshAfter(t *testing.T) {
	clock := newFakeClock()
	ingest := &fakeIngest{creds: func(*devboxv1.GetInstanceCredentialsRequest) (*devboxv1.GetInstanceCredentialsResponse, error) {
		return &devboxv1.GetInstanceCredentialsResponse{Credentials: []*devboxv1.InstanceCredential{{
			Kind:         devboxv1.CredentialKind_CREDENTIAL_KIND_CONSOLE,
			Token:        "t",
			ExpiresAt:    timestamppb.New(clock.Now().Add(time.Hour)),
			RefreshAfter: timestamppb.New(clock.Now().Add(20 * time.Minute)),
		}}}, nil
	}}
	e, err := newClockedCache(ingest, clock).get(context.Background(), consoleKey)
	if err != nil {
		t.Fatal(err)
	}
	if want := clock.Now().Add(20 * time.Minute); !e.refreshAfter.Equal(want) {
		t.Fatalf("refreshAfter = %v, want %v", e.refreshAfter, want)
	}
}

func TestCredentialSingleflight(t *testing.T) {
	gate := make(chan struct{})
	ingest := &fakeIngest{creds: tokenCreds(time.Now, time.Hour), credGate: gate}
	c := newCredentialCache(ingest, logr.Discard())

	const callers = 25
	var wg sync.WaitGroup
	values := make([]string, callers)
	errs := make([]error, callers)
	for i := range callers {
		wg.Add(1)
		go func() {
			defer wg.Done()
			e, err := c.get(context.Background(), consoleKey)
			errs[i] = err
			if err == nil {
				values[i] = string(e.value)
			}
		}()
	}
	waitFor(t, "first Ingest call", func() bool { return ingest.credCall.Load() >= 1 })
	time.Sleep(50 * time.Millisecond) // let the other callers pile up behind it
	close(gate)
	wg.Wait()

	if n := ingest.credCall.Load(); n != 1 {
		t.Fatalf("concurrent misses should share one Ingest call, got %d", n)
	}
	for i := range callers {
		if errs[i] != nil || values[i] != values[0] {
			t.Fatalf("caller %d got %q, %v; want %q", i, values[i], errs[i], values[0])
		}
	}
}

func TestCredentialCallerCancellationDoesNotFailOthers(t *testing.T) {
	gate := make(chan struct{})
	ingest := &fakeIngest{creds: tokenCreds(time.Now, time.Hour), credGate: gate}
	c := newCredentialCache(ingest, logr.Discard())

	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() { _, err := c.get(ctx, consoleKey); done <- err }()
	waitFor(t, "Ingest call", func() bool { return ingest.credCall.Load() == 1 })
	other := make(chan error, 1)
	go func() { _, err := c.get(context.Background(), consoleKey); other <- err }()
	cancel()
	if err := <-done; status.Code(err) != codes.Canceled {
		t.Fatalf("cancelled caller: want Canceled, got %v", err)
	}
	close(gate)
	if err := <-other; err != nil {
		t.Fatalf("other caller: %v", err)
	}
}

func TestCredentialUnavailableAfterExpiryWhenConsoleIsDown(t *testing.T) {
	clock := newFakeClock()
	ingest := &fakeIngest{creds: tokenCreds(clock.Now, time.Hour)}
	c := newClockedCache(ingest, clock)
	e, err := c.get(context.Background(), consoleKey)
	if err != nil {
		t.Fatal(err)
	}
	cached := string(e.value)

	ingest.setCreds(func(*devboxv1.GetInstanceCredentialsRequest) (*devboxv1.GetInstanceCredentialsResponse, error) {
		return nil, status.Error(codes.Unavailable, "console is down")
	})

	clock.Advance(55 * time.Minute)
	e, err = c.get(context.Background(), consoleKey)
	if err != nil || string(e.value) != cached {
		t.Fatalf("cached credential should be served until expiry: %v", err)
	}
	waitFor(t, "failed background refresh", func() bool {
		c.mu.Lock()
		defer c.mu.Unlock()
		return !c.entries[consoleKey].retryAt.IsZero()
	})
	calls := ingest.credCall.Load()
	if _, err := c.get(context.Background(), consoleKey); err != nil {
		t.Fatal(err)
	}
	if ingest.credCall.Load() != calls {
		t.Fatal("a failed refresh should back off instead of retrying on every request")
	}

	clock.Advance(6 * time.Minute) // expired
	_, err = c.get(context.Background(), consoleKey)
	if status.Code(err) != codes.Unavailable {
		t.Fatalf("want Unavailable after expiry, got %v", err)
	}
}

func TestCredentialConsoleRejectionIsNotFound(t *testing.T) {
	ingest := &fakeIngest{creds: func(*devboxv1.GetInstanceCredentialsRequest) (*devboxv1.GetInstanceCredentialsResponse, error) {
		return nil, status.Error(codes.PermissionDenied, "instance ended")
	}}
	_, err := newCredentialCache(ingest, logr.Discard()).get(context.Background(), consoleKey)
	if status.Code(err) != codes.NotFound {
		t.Fatalf("want NotFound, got %v", err)
	}
}

func TestInvalidate(t *testing.T) {
	ingest := &fakeIngest{creds: tokenCreds(time.Now, time.Hour)}
	resolver := &fakeResolver{actors: map[string]*InstanceInfo{"devboxes/box-1-i1": credInstance()}}
	svc, err := New(Config{}, Deps{Ingest: ingest, Actors: resolver})
	if err != nil {
		t.Fatal(err)
	}
	register(svc)
	t.Cleanup(func() { unregister(svc) })

	fetch := func() error {
		_, err := svc.provider.FetchSecret(context.Background(), &credproviderv1.FetchSecretRequest{
			Uri: "ate-secret://plural.sh/instances/i1/console", ActorSpiffeId: devboxActor,
		})
		return err
	}
	for range 3 {
		if err := fetch(); err != nil {
			t.Fatal(err)
		}
	}
	if ingest.credCall.Load() != 1 || resolver.calls.Load() != 1 {
		t.Fatalf("expected cached credential and actor, got %d Ingest and %d resolver calls", ingest.credCall.Load(), resolver.calls.Load())
	}

	// The box's SCM connection is removed; Invalidate must drop the cached actor info too.
	resolver.mu.Lock()
	resolver.actors["devboxes/box-1-i1"].SCMHosts = nil
	resolver.mu.Unlock()
	Invalidate("i1")

	if err := fetch(); err != nil {
		t.Fatal(err)
	}
	if ingest.credCall.Load() != 2 || resolver.calls.Load() != 2 {
		t.Fatalf("Invalidate should drop the instance's cache, got %d Ingest and %d resolver calls", ingest.credCall.Load(), resolver.calls.Load())
	}
	_, err = svc.provider.FetchSecret(context.Background(), &credproviderv1.FetchSecretRequest{
		Uri: "ate-secret://plural.sh/instances/i1/scm/github.com", ActorSpiffeId: devboxActor,
	})
	if status.Code(err) != codes.PermissionDenied {
		t.Fatalf("SCM credential after the connection was removed: want PermissionDenied, got %v", err)
	}
}

func TestInvalidateFencesInFlightFetch(t *testing.T) {
	gate := make(chan struct{})
	ingest := &fakeIngest{creds: tokenCreds(time.Now, time.Hour), credGate: gate}
	c := newCredentialCache(ingest, logr.Discard())
	done := make(chan error, 1)
	go func() { _, err := c.get(context.Background(), consoleKey); done <- err }()
	waitFor(t, "Ingest call", func() bool { return ingest.credCall.Load() == 1 })
	c.invalidate("i1")
	close(gate)
	if err := <-done; status.Code(err) != codes.NotFound {
		t.Fatalf("fetch racing Invalidate: want NotFound, got %v", err)
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	if _, ok := c.entries[consoleKey]; ok {
		t.Fatal("a fetch racing Invalidate must not repopulate the cache")
	}
}

// mTLS ------------------------------------------------------------------------------------------------------------

type testCA struct {
	cert *x509.Certificate
	key  *ecdsa.PrivateKey
	pem  []byte
}

func newTestCA(t *testing.T, name string) *testCA {
	t.Helper()
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	tmpl := &x509.Certificate{
		SerialNumber:          big.NewInt(1),
		Subject:               pkix.Name{CommonName: name},
		NotBefore:             time.Now().Add(-time.Hour),
		NotAfter:              time.Now().Add(time.Hour),
		IsCA:                  true,
		BasicConstraintsValid: true,
		KeyUsage:              x509.KeyUsageCertSign,
	}
	der, err := x509.CreateCertificate(rand.Reader, tmpl, tmpl, &key.PublicKey, key)
	if err != nil {
		t.Fatal(err)
	}
	cert, _ := x509.ParseCertificate(der)
	return &testCA{cert: cert, key: key, pem: pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der})}
}

// issue returns a PEM cert and key for the given SANs.
func (ca *testCA) issue(t *testing.T, dns []string, uris []string, usage x509.ExtKeyUsage) (certPEM, keyPEM []byte) {
	t.Helper()
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	tmpl := &x509.Certificate{
		SerialNumber: big.NewInt(time.Now().UnixNano()),
		NotBefore:    time.Now().Add(-time.Hour),
		NotAfter:     time.Now().Add(time.Hour),
		KeyUsage:     x509.KeyUsageDigitalSignature,
		ExtKeyUsage:  []x509.ExtKeyUsage{usage},
		DNSNames:     dns,
		IPAddresses:  []net.IP{net.ParseIP("127.0.0.1")},
	}
	for _, u := range uris {
		parsed, err := url.Parse(u)
		if err != nil {
			t.Fatal(err)
		}
		tmpl.URIs = append(tmpl.URIs, parsed)
	}
	der, err := x509.CreateCertificate(rand.Reader, tmpl, ca.cert, &key.PublicKey, ca.key)
	if err != nil {
		t.Fatal(err)
	}
	keyDER, err := x509.MarshalECPrivateKey(key)
	if err != nil {
		t.Fatal(err)
	}
	return pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der}), pem.EncodeToMemory(&pem.Block{Type: "EC PRIVATE KEY", Bytes: keyDER})
}

func writeFile(t *testing.T, dir, name string, data ...[]byte) string {
	t.Helper()
	path := filepath.Join(dir, name)
	var all []byte
	for _, d := range data {
		all = append(all, d...)
	}
	if err := os.WriteFile(path, all, 0o600); err != nil {
		t.Fatal(err)
	}
	return path
}

func TestCredentialProviderMTLS(t *testing.T) {
	dir := t.TempDir()
	podCA := newTestCA(t, "pod identity")
	otherCA := newTestCA(t, "someone else")

	serverCert, serverKey := podCA.issue(t, []string{"devbox-gateway.plrl.svc"}, nil, x509.ExtKeyUsageServerAuth)
	cfg := Config{
		// the bundle form: key and chain in one file
		ServerBundleFile: writeFile(t, dir, "server.pem", serverKey, serverCert),
		ClientCAFile:     writeFile(t, dir, "ca.pem", podCA.pem),
	}
	serverTLS, err := egressServerTLS(cfg)
	if err != nil {
		t.Fatal(err)
	}

	ingest := &fakeIngest{creds: tokenCreds(time.Now, time.Hour)}
	srv := grpc.NewServer(grpc.Creds(credentials.NewTLS(serverTLS)))
	credproviderv1.RegisterCredentialProviderServer(srv, newTestProvider(t, ingest, credInstance()))
	lis, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	go func() { _ = srv.Serve(lis) }()
	t.Cleanup(srv.Stop)

	roots := x509.NewCertPool()
	roots.AddCert(podCA.cert)
	call := func(certPEM, keyPEM []byte) error {
		clientTLS := &tls.Config{RootCAs: roots, ServerName: "devbox-gateway.plrl.svc", MinVersion: tls.VersionTLS13}
		if certPEM != nil {
			pair, err := tls.X509KeyPair(certPEM, keyPEM)
			if err != nil {
				t.Fatal(err)
			}
			clientTLS.Certificates = []tls.Certificate{pair}
		}
		conn, err := grpc.NewClient(lis.Addr().String(), grpc.WithTransportCredentials(credentials.NewTLS(clientTLS)))
		if err != nil {
			t.Fatal(err)
		}
		defer func() { _ = conn.Close() }()
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_, err = credproviderv1.NewCredentialProviderClient(conn).FetchSecret(ctx, &credproviderv1.FetchSecretRequest{
			Uri: "ate-secret://plural.sh/instances/i1/console", ActorSpiffeId: devboxActor,
		})
		return err
	}

	egressCert, egressKey := podCA.issue(t, nil, []string{DefaultEgressSPIFFEID}, x509.ExtKeyUsageClientAuth)
	if err := call(egressCert, egressKey); err != nil {
		t.Fatalf("atenet-egress should be accepted: %v", err)
	}

	sandboxCert, sandboxKey := podCA.issue(t, nil, []string{"spiffe://cluster.local/ns/devboxes/sa/sandbox"}, x509.ExtKeyUsageClientAuth)
	if err := call(sandboxCert, sandboxKey); err == nil {
		t.Fatal("a pod identity other than atenet-egress must be rejected")
	}

	forgedCert, forgedKey := otherCA.issue(t, nil, []string{DefaultEgressSPIFFEID}, x509.ExtKeyUsageClientAuth)
	if err := call(forgedCert, forgedKey); err == nil {
		t.Fatal("a certificate from another CA must be rejected")
	}

	if err := call(nil, nil); err == nil {
		t.Fatal("a caller without a client certificate must be rejected")
	}
}

func TestEgressServerTLSRequiresFiles(t *testing.T) {
	if _, err := egressServerTLS(Config{ServerCertFile: "a", ServerKeyFile: "b"}); err == nil {
		t.Fatal("missing ClientCAFile should fail")
	}
	if _, err := egressServerTLS(Config{ClientCAFile: "a"}); err == nil {
		t.Fatal("missing server certificate should fail")
	}
}
