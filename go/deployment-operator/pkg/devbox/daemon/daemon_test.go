package daemon

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"io"
	"log/slog"
	"math/big"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/credentials/insecure"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"

	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/fakeacp"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/harness"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/daemon/internal/gittest"
)

func TestMain(m *testing.M) {
	if fakeacp.Enabled() {
		fakeacp.Main()
		os.Exit(0)
	}
	os.Exit(m.Run())
}

const claude = devboxv1.AgentType_AGENT_TYPE_CLAUDE

func freePort(t *testing.T) int {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer ln.Close()
	return ln.Addr().(*net.TCPAddr).Port
}

func testConfig(t *testing.T, root string) Config {
	t.Helper()
	home := filepath.Join(root, "home")
	_ = os.MkdirAll(home, 0o755)
	sysCA := filepath.Join(root, "system.pem")
	_ = os.WriteFile(sysCA, testCA(t), 0o644)
	return Config{
		Home: home, StateDir: filepath.Join(home, ".plural"), TrustDir: filepath.Join(root, "trust"),
		SystemCABundle: sysCA, IdentityDir: filepath.Join(root, "identity"), AgentAuthDir: filepath.Join(root, "agent-auth"),
		ImageInfo: filepath.Join(root, "image.json"), Chromium: filepath.Join(root, "no-chromium"),
		CDPPort: freePort(t), VNCPort: freePort(t), Shell: "/bin/sh", Version: "test",
		AgentOverrides: map[devboxv1.AgentType]harness.Command{claude: {Path: os.Args[0], Args: []string{"-test.run=^$"},
			Env: []string{fakeacp.EnvVar + "=1", fakeacp.LogEnv + "=" + filepath.Join(root, "agent.log")}}},
		Log: slog.New(slog.NewTextHandler(io.Discard, nil)),
	}
}

type running struct {
	d      *Daemon
	addr   string
	client devboxv1.DaemonClient
	stop   func()
}

func start(t *testing.T, cfg Config) *running {
	t.Helper()
	d, err := New(cfg)
	if err != nil {
		t.Fatal(err)
	}
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() { done <- d.Serve(ctx, ln) }()
	conn, err := grpc.NewClient("passthrough:///"+ln.Addr().String(), grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		t.Fatal(err)
	}
	var once sync.Once
	stop := func() {
		once.Do(func() {
			conn.Close()
			cancel()
			select {
			case err := <-done:
				if err != nil {
					t.Errorf("serve: %v", err)
				}
			case <-time.After(20 * time.Second):
				t.Error("daemon did not shut down")
			}
		})
	}
	t.Cleanup(stop)
	return &running{d: d, addr: ln.Addr().String(), client: devboxv1.NewDaemonClient(conn), stop: stop}
}

func eventually(t *testing.T, what string, cond func() bool) {
	t.Helper()
	deadline := time.Now().Add(20 * time.Second)
	for time.Now().Before(deadline) {
		if cond() {
			return
		}
		time.Sleep(25 * time.Millisecond)
	}
	t.Fatalf("timed out waiting for %s", what)
}

func ctxT(t *testing.T) context.Context {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	t.Cleanup(cancel)
	return ctx
}

// subscriber collects the event stream.
type subscriber struct {
	mu     sync.Mutex
	events []*devboxv1.DaemonEvent
	cancel context.CancelFunc
}

func subscribe(t *testing.T, c devboxv1.DaemonClient, from uint64) *subscriber {
	ctx, cancel := context.WithCancel(context.Background())
	s := &subscriber{cancel: cancel}
	t.Cleanup(cancel)
	stream, err := c.SubscribeEvents(ctx, &devboxv1.SubscribeEventsRequest{FromOffset: from})
	if err != nil {
		t.Fatal(err)
	}
	go func() {
		for {
			ev, err := stream.Recv()
			if err != nil {
				return
			}
			s.mu.Lock()
			s.events = append(s.events, ev)
			s.mu.Unlock()
		}
	}()
	return s
}

func (s *subscriber) find(pred func(*devboxv1.DaemonEvent) bool) *devboxv1.DaemonEvent {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, ev := range s.events {
		if pred(ev) {
			return ev
		}
	}
	return nil
}

func (s *subscriber) offsets() []uint64 {
	s.mu.Lock()
	defer s.mu.Unlock()
	var out []uint64
	for _, ev := range s.events {
		if ev.GetHeartbeat() == nil {
			out = append(out, ev.GetOffset())
		}
	}
	return out
}

func entityText(e *devboxv1.AcpEntity) string {
	var b strings.Builder
	for _, c := range e.GetMessage().GetContent() {
		b.WriteString(c.GetText().GetText())
	}
	return b.String()
}

// timelineHas reports whether a session's timeline holds a settled message with the text.
func timelineHas(ctx context.Context, c devboxv1.DaemonClient, sessionID, text string) bool {
	page, err := c.GetTimeline(ctx, &devboxv1.GetTimelineRequest{InstanceId: "inst-1", SessionId: sessionID})
	if err != nil {
		return false
	}
	for _, e := range page.GetEntities() {
		if e.GetSettled() && entityText(e) == text {
			return true
		}
	}
	return false
}

func TestDaemonEndToEnd(t *testing.T) {
	t.Setenv("GIT_CONFIG_GLOBAL", "/dev/null")
	root := t.TempDir()
	cfg := testConfig(t, root)
	src := gittest.Repo(t, filepath.Join(root, "src", "acme", "api"), map[string]string{"main.go": "package main\n"})
	r := start(t, cfg)
	ctx := ctxT(t)

	h, err := r.client.Health(ctx, &devboxv1.HealthRequest{})
	if err != nil || h.GetReady() || h.GetStatus() != StatusBooting || h.GetVersion() != "test" {
		t.Fatalf("health before Initialize: %v %v", h, err)
	}
	resp, err := http.Get("http://" + r.addr + "/readyz")
	if err != nil || resp.StatusCode != http.StatusOK {
		t.Fatalf("/readyz: %v %v", resp, err)
	}
	resp.Body.Close()
	if b, _ := os.ReadFile(cfg.TrustBundle()); !strings.Contains(string(b), "BEGIN CERTIFICATE") {
		t.Fatal("CA bundle not written")
	}

	init := &devboxv1.InitializeRequest{InstanceId: "inst-1", Agent: claude,
		Agents:       []*devboxv1.AgentLaunch{{Agent: claude, Billing: devboxv1.BillingMode_BILLING_MODE_PROXY}},
		Repositories: []*devboxv1.RepositorySpec{{Url: src}}, FirstThreadId: "th1", FirstThreadTitle: "First"}
	ir, err := r.client.Initialize(ctx, init)
	if err != nil || ir.GetAlreadyInitialized() || ir.GetInfo().GetInstanceId() != "inst-1" {
		t.Fatalf("initialize: %v %v", ir, err)
	}
	eventually(t, "ready", func() bool {
		h, err := r.client.Health(ctx, &devboxv1.HealthRequest{})
		return err == nil && h.GetReady()
	})
	if h, _ := r.client.Health(ctx, &devboxv1.HealthRequest{}); h.GetStatus() != StatusReady || !h.GetWorkspaceHydrated() {
		t.Fatalf("health after hydration: %v", h)
	}

	repos, err := r.client.ListRepositories(ctx, &devboxv1.ListRepositoriesRequest{})
	if err != nil || len(repos.GetCheckouts()) != 1 || repos.GetCheckouts()[0].GetName() != "api" {
		t.Fatalf("repositories: %v %v", repos, err)
	}
	threads, err := r.client.ListThreads(ctx, &devboxv1.ListThreadsRequest{})
	if err != nil || len(threads.GetThreads()) != 1 || threads.GetThreads()[0].GetThreadId() != "th1" {
		t.Fatalf("threads: %v %v", threads, err)
	}
	sessionID := threads.GetThreads()[0].GetSessionId()

	sub := subscribe(t, r.client, 0)
	pr, err := r.client.Prompt(ctx, &devboxv1.PromptRequest{Thread: &devboxv1.ThreadRef{InstanceId: "inst-1", ThreadId: "th1"},
		PromptId: "p1", Content: []*devboxv1.ContentBlock{{Block: &devboxv1.ContentBlock_Text{Text: &devboxv1.TextContent{Text: "hello"}}}}})
	if err != nil || pr.GetDisposition() != devboxv1.PromptDisposition_PROMPT_DISPOSITION_SENT {
		t.Fatalf("prompt: %v %v", pr, err)
	}
	eventually(t, "agent message settled on the stream", func() bool {
		return sub.find(func(ev *devboxv1.DaemonEvent) bool {
			d := ev.GetDelta()
			return d.GetOp() == devboxv1.DeltaOp_DELTA_OP_SETTLE && d.GetSessionId() == sessionID && entityText(d.GetEntity()) == "echo:hello"
		}) != nil
	})
	eventually(t, "agent message in the timeline", func() bool { return timelineHas(ctx, r.client, sessionID, "echo:hello") })
	if sub.find(func(ev *devboxv1.DaemonEvent) bool { return ev.GetSession().GetThreadId() == "th1" }) == nil {
		t.Fatal("no session index event for the first thread")
	}
	offs := sub.offsets()
	for i := 1; i < len(offs); i++ {
		if offs[i] <= offs[i-1] {
			t.Fatalf("offsets not increasing: %v", offs)
		}
	}

	// Wrong instance.
	_, err = r.client.Prompt(ctx, &devboxv1.PromptRequest{Thread: &devboxv1.ThreadRef{InstanceId: "other", ThreadId: "th1"}, PromptId: "p2"})
	if status.Code(err) != codes.FailedPrecondition {
		t.Fatalf("prompt for another instance: %v", err)
	}

	// The model switch goes over ACP.
	opts, err := r.client.SetThreadConfigOption(ctx, &devboxv1.SetThreadConfigOptionRequest{
		Thread: &devboxv1.ThreadRef{ThreadId: "th1"}, Option: &devboxv1.ConfigOptionSetting{ConfigId: "model", Value: "smart"}})
	if err != nil || len(opts.GetConfigOptions()) == 0 || opts.GetConfigOptions()[0].GetCurrentValue() != "smart" {
		t.Fatalf("set model: %v %v", opts, err)
	}

	// Snapshot preparation scrubs credentials and reports the settled offset.
	secrets := []string{filepath.Join(cfg.AgentAuthDir, "codex", "auth.json"), filepath.Join(cfg.IdentityDir, "aws", "token"),
		filepath.Join(cfg.Home, ".aws", "sso", "cache", "x.json")}
	for _, p := range secrets {
		_ = os.MkdirAll(filepath.Dir(p), 0o700)
		_ = os.WriteFile(p, []byte("secret"), 0o600)
	}
	ps, err := r.client.PrepareSuspend(ctx, &devboxv1.PrepareSuspendRequest{Reason: devboxv1.SuspendReason_SUSPEND_REASON_SNAPSHOT, SharedSnapshot: true})
	if err != nil {
		t.Fatal(err)
	}
	for _, p := range secrets {
		if _, err := os.Stat(p); err == nil {
			t.Errorf("%s survived PrepareSuspend", p)
		}
	}
	info, _ := r.client.GetInfo(ctx, &devboxv1.GetInfoRequest{})
	if ps.GetSettledOffset() == 0 || ps.GetSettledOffset() > info.GetHeadOffset() {
		t.Fatalf("settled offset %d, head %d", ps.GetSettledOffset(), info.GetHeadOffset())
	}
	if ack, err := r.client.AckEvents(ctx, &devboxv1.AckEventsRequest{Offset: ps.GetSettledOffset()}); err != nil || ack.GetAckedOffset() != ps.GetSettledOffset() {
		t.Fatalf("ack: %v %v", ack, err)
	}

	// Idempotent Initialize.
	again, err := r.client.Initialize(ctx, init)
	if err != nil || !again.GetAlreadyInitialized() {
		t.Fatalf("second initialize: %v %v", again, err)
	}

	// Restart: the daemon resumes the persisted instance, threads and log.
	head := info.GetHeadOffset()
	r.stop()
	r2 := start(t, cfg)
	info2, err := r2.client.GetInfo(ctx, &devboxv1.GetInfoRequest{})
	if err != nil || info2.GetInstanceId() != "inst-1" || info2.GetHeadOffset() < head || info2.GetBootId() == info.GetBootId() {
		t.Fatalf("after restart: %v %v", info2, err)
	}
	threads, _ = r2.client.ListThreads(ctx, &devboxv1.ListThreadsRequest{})
	if len(threads.GetThreads()) != 1 {
		t.Fatalf("threads after restart: %v", threads)
	}
	if !timelineHas(ctx, r2.client, sessionID, "echo:hello") {
		t.Fatal("transcript lost across the restart")
	}
	if ss, err := r2.client.GetSessions(ctx, &devboxv1.GetSessionsRequest{InstanceId: "inst-1"}); err != nil || len(ss.GetSessions()) != 1 {
		t.Fatalf("sessions after restart: %v %v", ss, err)
	}
	if ir, err := r2.client.Initialize(ctx, init); err != nil || !ir.GetAlreadyInitialized() {
		t.Fatalf("initialize after restart: %v %v", ir, err)
	}

	// The same workspace initialized as a new instance (restored snapshot): no old threads or events.
	ni := &devboxv1.InitializeRequest{InstanceId: "inst-2", Agent: claude, RestoredFromSnapshot: true,
		Agents: []*devboxv1.AgentLaunch{{Agent: claude, Billing: devboxv1.BillingMode_BILLING_MODE_PROXY}}}
	if ir, err := r2.client.Initialize(ctx, ni); err != nil || ir.GetAlreadyInitialized() {
		t.Fatalf("new instance initialize: %v %v", ir, err)
	}
	threads, _ = r2.client.ListThreads(ctx, &devboxv1.ListThreadsRequest{})
	if len(threads.GetThreads()) != 0 {
		t.Fatalf("old instance's threads visible: %v", threads)
	}
	if page, err := r2.client.GetTimeline(ctx, &devboxv1.GetTimelineRequest{InstanceId: "inst-2", SessionId: sessionID}); err != nil || len(page.GetEntities()) != 0 {
		t.Fatalf("old instance's transcript visible: %v %v", page, err)
	}
	info3, _ := r2.client.GetInfo(ctx, &devboxv1.GetInfoRequest{})
	sub2 := subscribe(t, r2.client, 0)
	time.Sleep(300 * time.Millisecond)
	for _, off := range sub2.offsets() {
		if off <= info3.GetAckedOffset() {
			t.Fatalf("old instance's event %d replayed (acked %d)", off, info3.GetAckedOffset())
		}
	}
	if b, _ := os.ReadFile(filepath.Join(cfg.Home, "api", "main.go")); string(b) != "package main\n" {
		t.Fatal("workspace lost")
	}
}

func TestRequestTokenValidation(t *testing.T) {
	r := start(t, testConfig(t, t.TempDir()))
	ctx := ctxT(t)
	key, _ := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	pub, _ := key.PublicKey.ECDH()
	raw := pub.Bytes()
	enc := base64.RawURLEncoding
	jwks, _ := json.Marshal(map[string]any{"keys": []any{map[string]any{"kty": "EC", "kid": "k1", "crv": "P-256",
		"x": enc.EncodeToString(raw[1:33]), "y": enc.EncodeToString(raw[33:])}}})
	token := func(instance string) string {
		h, _ := json.Marshal(map[string]any{"alg": "ES256", "kid": "k1"})
		p, _ := json.Marshal(map[string]any{"exp": time.Now().Add(time.Minute).Unix(), "instance": instance})
		in := enc.EncodeToString(h) + "." + enc.EncodeToString(p)
		d := sha256.Sum256([]byte(in))
		rr, ss, _ := ecdsa.Sign(rand.Reader, key, d[:])
		return in + "." + enc.EncodeToString(append(rr.FillBytes(make([]byte, 32)), ss.FillBytes(make([]byte, 32))...))
	}

	// The first Initialize is trusted and installs the keys.
	if _, err := r.client.Initialize(ctx, &devboxv1.InitializeRequest{InstanceId: "inst-1", RequestTokenJwks: jwks}); err != nil {
		t.Fatal(err)
	}
	if _, err := r.client.GetInfo(ctx, &devboxv1.GetInfoRequest{}); status.Code(err) != codes.Unauthenticated {
		t.Fatalf("call without a token: %v", err)
	}
	if _, err := r.client.Health(ctx, &devboxv1.HealthRequest{}); err != nil {
		t.Fatalf("health needs no token: %v", err)
	}
	with := func(tok string) context.Context {
		return metadata.AppendToOutgoingContext(ctx, devboxv1.RequestTokenMetadataKey, tok)
	}
	if _, err := r.client.GetInfo(with(token("inst-1")), &devboxv1.GetInfoRequest{}); err != nil {
		t.Fatalf("valid token rejected: %v", err)
	}
	if _, err := r.client.GetInfo(with(token("inst-9")), &devboxv1.GetInfoRequest{}); status.Code(err) != codes.Unauthenticated {
		t.Fatalf("token for another instance accepted: %v", err)
	}
	if _, err := r.client.Initialize(ctx, &devboxv1.InitializeRequest{InstanceId: "inst-1"}); status.Code(err) != codes.Unauthenticated {
		t.Fatalf("unauthenticated re-Initialize accepted: %v", err)
	}
	if _, err := r.client.Initialize(with(token("inst-1")), &devboxv1.InitializeRequest{InstanceId: "inst-1"}); err != nil {
		t.Fatalf("authenticated re-Initialize: %v", err)
	}
	req, _ := http.NewRequest(http.MethodPut, "http://"+r.addr+BundlePath+"api", strings.NewReader("x"))
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("bundle upload without a token: %d", resp.StatusCode)
	}
}

func testCA(t *testing.T) []byte {
	t.Helper()
	k, _ := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	tmpl := &x509.Certificate{SerialNumber: big.NewInt(1), Subject: pkix.Name{CommonName: "system root"},
		NotBefore: time.Now(), NotAfter: time.Now().Add(time.Hour), IsCA: true, BasicConstraintsValid: true}
	der, err := x509.CreateCertificate(rand.Reader, tmpl, tmpl, &k.PublicKey, k)
	if err != nil {
		t.Fatal(err)
	}
	return pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: der})
}

func TestSecretEnvStaysInMemory(t *testing.T) {
	cfg := testConfig(t, t.TempDir())
	r := start(t, cfg)
	ctx := ctxT(t)
	envOf := func(d *Daemon) map[string]string {
		out := map[string]string{}
		for _, kv := range d.baseEnv() {
			k, v, _ := strings.Cut(kv, "=")
			out[k] = v
		}
		return out
	}

	init := &devboxv1.InitializeRequest{InstanceId: "inst-1", Env: map[string]string{"API_KEY": "s3cret", "HOME": "/elsewhere"}}
	if _, err := r.client.Initialize(ctx, init); err != nil {
		t.Fatal(err)
	}
	env := envOf(r.d)
	if env["API_KEY"] != "s3cret" || env["HOME"] != cfg.Home {
		t.Fatalf("child env API_KEY=%q HOME=%q, want s3cret and the daemon's home", env["API_KEY"], env["HOME"])
	}
	if b, _ := os.ReadFile(filepath.Join(cfg.StateDir, "instance.json")); len(b) == 0 || strings.Contains(string(b), "s3cret") {
		t.Fatalf("instance.json missing or holds secret env: %s", b)
	}

	init.Env = map[string]string{"API_KEY": "rotated"}
	if _, err := r.client.Initialize(ctx, init); err != nil {
		t.Fatal(err)
	}
	if got := envOf(r.d)["API_KEY"]; got != "rotated" {
		t.Fatalf("API_KEY after re-Initialize = %q, want rotated", got)
	}

	// A restarted daemon has no secret env until the gateway initializes it again.
	r.stop()
	r2 := start(t, cfg)
	if _, ok := envOf(r2.d)["API_KEY"]; ok {
		t.Fatal("secret env survived a restart")
	}
	if _, err := r2.client.Initialize(ctx, init); err != nil {
		t.Fatal(err)
	}
	if got := envOf(r2.d)["API_KEY"]; got != "rotated" {
		t.Fatalf("API_KEY after reinitialize = %q, want rotated", got)
	}
}
