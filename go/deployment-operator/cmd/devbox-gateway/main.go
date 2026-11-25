// devbox-gateway is the per-cluster DevBoxes gateway (sections 4.6 to 4.11 of the DevBoxes plan). It dials KAS
// with the cluster deploy token and serves devbox.v1.Gateway through reverse tunnels, drives devbox instances on
// Substrate, keeps instance records in ConfigMaps, and serves the egress credential provider, ext_proc authz, devbox MCP and
// SandboxCredentials. The operator deploys it (internal/controller/devboxrunner_gateway.go).
//
// Every flag defaults to the environment variable named in its usage text.
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"

	"github.com/go-logr/logr"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"golang.org/x/sync/errgroup"
	"google.golang.org/grpc"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/pluralsh/console/go/deployment-operator/api/v1alpha1"
	devboxv1 "github.com/pluralsh/console/go/deployment-operator/pkg/devbox/api/v1"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/actors"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/core"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/egress"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/prober"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/router"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/gateway/tunnel"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/juicefs"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/podcert"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/substrate"
)

// version is set with -ldflags "-X main.version=...".
var version = "dev"

const (
	shutdownGrace = 20 * time.Second
)

type options struct {
	consoleURL     string
	kasURL         string
	clusterID      string
	deployToken    string
	operatorVer    string
	podName        string
	podNamespace   string
	ateAddress     string
	ateTokenFile   string
	ateCAFile      string
	podIdentityDir string
	serviceDNSDir  string
	serviceDNSCA   string
	routerAddress  string
	juicefsAddress string
	credProvider   string
	extProc        string
	mcpAddr        string
	mcpTLS         bool
	substrateNS    string
	egressIDs      string
	authzHost      string
	metricsAddr    string
	probeNamespace string
	actorIssuer    string
	actorIssuerCA  string
	gatewayHost    string
	gatewayURL     string
	jwksFile       string
	aiProxyURL     string
	workbenchMCP   string
	minIdle        int
	logLevel       string
	insecureEgress bool
	showVersion    bool
}

func env(k, def string) string {
	if v, ok := os.LookupEnv(k); ok && v != "" {
		return v
	}
	return def
}

func envBool(k string) bool {
	v, _ := strconv.ParseBool(os.Getenv(k))
	return v
}

func envInt(k string, def int) int {
	if v, err := strconv.Atoi(os.Getenv(k)); err == nil {
		return v
	}
	return def
}

func register(fs *flag.FlagSet) *options {
	o := &options{}
	host, _ := os.Hostname()
	fs.StringVar(&o.consoleURL, "console-url", env("CONSOLE_URL", ""), "console URL (CONSOLE_URL)")
	fs.StringVar(&o.kasURL, "kas-url", env("DEVBOX_KAS_URL", ""), "KAS devbox listener, wss://<console host>/ext/devbox (DEVBOX_KAS_URL; default derived from CONSOLE_URL)")
	fs.StringVar(&o.clusterID, "cluster-id", env("CLUSTER_ID", ""), "console cluster ID (CLUSTER_ID)")
	fs.StringVar(&o.deployToken, "deploy-token", env("DEPLOY_TOKEN", ""), "cluster deploy token (DEPLOY_TOKEN)")
	fs.StringVar(&o.operatorVer, "operator-version", env("DEVBOX_OPERATOR_VERSION", version), "operator version (DEVBOX_OPERATOR_VERSION)")
	fs.StringVar(&o.podName, "gateway-id", env("POD_NAME", host), "replica ID reported to console (POD_NAME, default hostname)")
	fs.StringVar(&o.podNamespace, "namespace", env("POD_NAMESPACE", "plrl-deploy-operator"), "gateway namespace (POD_NAMESPACE)")
	fs.StringVar(&o.ateAddress, "ate-api-address", env("ATE_API_ADDRESS", substrate.DefaultAddress), "ate-api-server address (ATE_API_ADDRESS)")
	fs.StringVar(&o.ateTokenFile, "ate-api-token-file", env("ATE_API_TOKEN_FILE", "/var/run/secrets/ate.dev/api/token"), "ate-api token file (ATE_API_TOKEN_FILE)")
	fs.StringVar(&o.ateCAFile, "ate-api-ca-file", env("ATE_API_CA_FILE", "/var/run/secrets/ate.dev/api/ca.crt"), "ate-api CA (ATE_API_CA_FILE)")
	fs.StringVar(&o.podIdentityDir, "pod-identity-dir", env("DEVBOX_POD_IDENTITY_DIR", "/run/podidentity.podcert.ate.dev"), "pod identity credential and trust bundles (DEVBOX_POD_IDENTITY_DIR)")
	fs.StringVar(&o.serviceDNSDir, "service-dns-dir", env("DEVBOX_SERVICE_DNS_DIR", "/run/servicedns.podcert.ate.dev"), "servicedns serving credential bundle (DEVBOX_SERVICE_DNS_DIR)")
	fs.StringVar(&o.serviceDNSCA, "service-dns-ca-dir", env("DEVBOX_SERVICE_DNS_CA_DIR", "/run/servicedns-ca.podcert.ate.dev"), "servicedns trust bundle (DEVBOX_SERVICE_DNS_CA_DIR)")
	fs.StringVar(&o.routerAddress, "router-address", env("DEVBOX_ROUTER_ADDRESS", router.DefaultAddress), "atenet-router address (DEVBOX_ROUTER_ADDRESS)")
	fs.StringVar(&o.juicefsAddress, "juicefs-address", env("DEVBOX_JUICEFS_ADDRESS", ""), "JuiceFS CSI controller address, <service>.<namespace>.svc:<port>, for saving the homes of snapshots (DEVBOX_JUICEFS_ADDRESS; empty disables)")
	fs.StringVar(&o.credProvider, "credential-provider-addr", env("DEVBOX_CREDENTIAL_PROVIDER_ADDR", egress.DefaultCredentialProviderAddr), "credential provider listen address (DEVBOX_CREDENTIAL_PROVIDER_ADDR)")
	fs.StringVar(&o.extProc, "extproc-addr", env("DEVBOX_EXTPROC_ADDR", egress.DefaultAuthzAddr), "egress ext_proc listen address (DEVBOX_EXTPROC_ADDR)")
	fs.StringVar(&o.mcpAddr, "mcp-addr", env("DEVBOX_MCP_ADDR", egress.DefaultMCPAddr), "devbox MCP and SandboxCredentials listen address (DEVBOX_MCP_ADDR)")
	fs.BoolVar(&o.mcpTLS, "mcp-tls", envBool("DEVBOX_MCP_TLS"), "serve the MCP port over TLS with the servicedns certificate (DEVBOX_MCP_TLS); breaks the egress path, see run")
	fs.StringVar(&o.substrateNS, "substrate-namespace", env("DEVBOX_SUBSTRATE_NAMESPACE", "ate-system"), "Substrate install namespace (DEVBOX_SUBSTRATE_NAMESPACE)")
	fs.StringVar(&o.egressIDs, "egress-spiffe-ids", env("DEVBOX_EGRESS_SPIFFE_IDS", ""), "comma-separated SPIFFE IDs allowed to call the credential provider and ext_proc (DEVBOX_EGRESS_SPIFFE_IDS; default atenet-egress in the Substrate namespace)")
	fs.StringVar(&o.authzHost, "egress-authz-host", env("DEVBOX_EGRESS_AUTHZ_HOST", ""), "Service host atenet-egress dials the ext_proc at (DEVBOX_EGRESS_AUTHZ_HOST; default devbox-egress-authz.<namespace>.svc)")
	fs.StringVar(&o.metricsAddr, "metrics-addr", env("DEVBOX_METRICS_ADDR", ":9090"), "metrics and health listen address (DEVBOX_METRICS_ADDR)")
	fs.StringVar(&o.probeNamespace, "probe-namespace", env("DEVBOX_PROBE_NAMESPACE", ""), "namespace of probe request ConfigMaps (DEVBOX_PROBE_NAMESPACE)")
	fs.StringVar(&o.actorIssuer, "actor-jwt-issuer", env("DEVBOX_ACTOR_JWT_ISSUER", ""), "Substrate actor JWT issuer (DEVBOX_ACTOR_JWT_ISSUER; default https://idp.<substrate-namespace>.svc)")
	fs.StringVar(&o.actorIssuerCA, "actor-jwt-issuer-ca", env("DEVBOX_ACTOR_JWT_ISSUER_CA_FILE", ""), "issuer TLS CA (DEVBOX_ACTOR_JWT_ISSUER_CA_FILE; default the servicedns trust bundle)")
	fs.StringVar(&o.gatewayHost, "gateway-host", env("DEVBOX_GATEWAY_HOST", ""), "Service host sandboxes reach the gateway at (DEVBOX_GATEWAY_HOST; default devbox-gateway.<namespace>.svc)")
	fs.StringVar(&o.gatewayURL, "gateway-url", env("DEVBOX_GATEWAY_URL", ""), "override the MCP/SandboxCredentials URL handed to daemons (DEVBOX_GATEWAY_URL)")
	fs.StringVar(&o.jwksFile, "request-token-jwks-file", env("DEVBOX_REQUEST_TOKEN_JWKS_FILE", ""), "JWKS daemons validate devbox-request-token with (DEVBOX_REQUEST_TOKEN_JWKS_FILE; empty disables)")
	fs.StringVar(&o.aiProxyURL, "ai-proxy-url", env("DEVBOX_AI_PROXY_URL", ""), "AI proxy base URL (DEVBOX_AI_PROXY_URL; default <console>/ext/ai)")
	fs.StringVar(&o.workbenchMCP, "workbench-mcp-url", env("DEVBOX_WORKBENCH_MCP_URL", ""), "workbench MCP base URL, each instance gets <base>/<workbench-id> (DEVBOX_WORKBENCH_MCP_URL; default <console>/mcp/workbench)")
	fs.IntVar(&o.minIdle, "min-idle-tunnels", envInt("DEVBOX_MIN_IDLE_TUNNELS", tunnel.DefaultMinIdle), "idle KAS tunnels to keep open (DEVBOX_MIN_IDLE_TUNNELS)")
	fs.StringVar(&o.logLevel, "log-level", env("DEVBOX_LOG_LEVEL", "info"), "debug, info, warn or error (DEVBOX_LOG_LEVEL)")
	fs.BoolVar(&o.insecureEgress, "insecure-egress-listeners", envBool("DEVBOX_INSECURE_EGRESS_LISTENERS"), "serve the credential provider and ext_proc without mTLS; local development only")
	fs.BoolVar(&o.showVersion, "version", false, "print the version and exit")
	return o
}

func main() {
	fs := flag.NewFlagSet("devbox-gateway", flag.ExitOnError)
	o := register(fs)
	_ = fs.Parse(os.Args[1:])
	if o.showVersion {
		fmt.Println(version)
		return
	}
	var level slog.Level
	_ = level.UnmarshalText([]byte(o.logLevel))
	handler := slog.NewJSONHandler(os.Stderr, &slog.HandlerOptions{Level: level})
	log := logr.FromSlogHandler(handler)

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	err := run(ctx, o, log)
	stop()
	if err != nil {
		log.Error(err, "devbox-gateway failed")
		os.Exit(1)
	}
}

func (o *options) resolve() error {
	// The operator hands out its GraphQL endpoint (…/ext/gql); everything derived here hangs off the console base.
	o.consoleURL = strings.TrimSuffix(o.consoleURL, "/")
	o.consoleURL = strings.TrimSuffix(o.consoleURL, "/ext/gql")
	o.consoleURL = strings.TrimSuffix(o.consoleURL, "/gql")
	if o.kasURL == "" && o.consoleURL != "" {
		// The console chart routes KAS's devbox listener on the console host, as it does agentk's.
		if u, err := url.Parse(o.consoleURL); err == nil && u.Host != "" {
			scheme := "wss"
			if u.Scheme == "http" {
				scheme = "ws"
			}
			o.kasURL = scheme + "://" + u.Host + tunnel.DefaultPath
		}
	}
	var missing []string
	for name, v := range map[string]string{"DEVBOX_KAS_URL or CONSOLE_URL": o.kasURL, "DEPLOY_TOKEN": o.deployToken} {
		if v == "" {
			missing = append(missing, name)
		}
	}
	if len(missing) > 0 {
		return fmt.Errorf("missing required configuration: %s", strings.Join(missing, ", "))
	}
	if o.aiProxyURL == "" && o.consoleURL != "" {
		o.aiProxyURL = o.consoleURL + "/ext/ai"
	}
	if o.workbenchMCP == "" && o.consoleURL != "" {
		o.workbenchMCP = o.consoleURL + "/mcp/workbench"
	}
	if o.gatewayHost == "" {
		o.gatewayHost = "devbox-gateway." + o.podNamespace + ".svc"
	}
	if o.authzHost == "" {
		o.authzHost = "devbox-egress-authz." + o.podNamespace + ".svc"
	}
	if o.actorIssuer == "" {
		o.actorIssuer = "https://idp." + o.substrateNS + ".svc"
	}
	if o.egressIDs == "" {
		o.egressIDs = "spiffe://cluster.local/ns/" + o.substrateNS + "/sa/atenet-egress"
	}
	if o.actorIssuerCA == "" {
		o.actorIssuerCA = filepath.Join(o.serviceDNSCA, "trust-bundle.pem")
	}
	return nil
}

func run(ctx context.Context, o *options, log logr.Logger) error {
	if err := o.resolve(); err != nil {
		return err
	}
	ate, err := actors.Dial(substrate.Config{Address: o.ateAddress, TokenFile: o.ateTokenFile, CAFile: o.ateCAFile})
	if err != nil {
		return fmt.Errorf("dialing ate-api-server: %w", err)
	}
	defer ate.Close() // nolint: errcheck

	rt, err := router.Dial(router.Config{
		Address:          o.routerAddress,
		CredentialBundle: filepath.Join(o.podIdentityDir, "credential-bundle.pem"),
		TrustBundle:      filepath.Join(o.serviceDNSCA, "trust-bundle.pem"),
	})
	if err != nil {
		return fmt.Errorf("dialing atenet-router: %w", err)
	}
	defer rt.Close() // nolint: errcheck

	var seeds core.Seeds
	if o.juicefsAddress != "" {
		host, _, err := net.SplitHostPort(o.juicefsAddress)
		if err != nil {
			return fmt.Errorf("parsing DEVBOX_JUICEFS_ADDRESS: %w", err)
		}
		tlsCfg, err := podcert.ClientTLS(filepath.Join(o.podIdentityDir, "credential-bundle.pem"), filepath.Join(o.serviceDNSCA, "trust-bundle.pem"), host)
		if err != nil {
			return fmt.Errorf("configuring the JuiceFS controller client: %w", err)
		}
		jfs, err := juicefs.Dial(o.juicefsAddress, tlsCfg)
		if err != nil {
			return err
		}
		defer jfs.Close() // nolint: errcheck
		seeds = jfs
	}

	token := o.deployToken
	kas, err := tunnel.Dial(tunnel.DialConfig{
		URL:       o.kasURL,
		Token:     func() (string, error) { return token, nil },
		UserAgent: "devbox-gateway/" + version,
	})
	if err != nil {
		return fmt.Errorf("dialing KAS: %w", err)
	}
	defer kas.Close() // nolint: errcheck
	ingest := devboxv1.NewIngestClient(kas)

	kube, err := kubeClient()
	if err != nil {
		return err
	}

	if o.mcpTLS {
		// atenet-egress re-originates https rules with TLS verified against public CAs, which the servicedns
		// certificate isn't signed by; the cleartext http rule (h2c for SandboxCredentials) is the supported path.
		log.Info("WARNING: DEVBOX_MCP_TLS is set; sandboxes reach the devbox MCP through an https egress rule, which atenet-egress can't verify")
	}
	serving := filepath.Join(o.serviceDNSDir, "credential-bundle.pem")
	if !o.insecureEgress {
		go checkServingNames(ctx, serving, []string{o.gatewayHost, o.authzHost}, log)
	}

	gatewayEP := egress.GatewayEndpoint{Host: o.gatewayHost, Port: portOf(o.mcpAddr, 8080), TLS: o.mcpTLS}
	gatewayURL := o.gatewayURL
	if gatewayURL == "" {
		gatewayURL = gatewayEP.URL()
	}
	var jwks []byte
	if o.jwksFile != "" {
		if jwks, err = os.ReadFile(o.jwksFile); err != nil {
			return fmt.Errorf("reading request token JWKS: %w", err)
		}
	}

	gw, err := core.New(core.Config{
		GatewayID:                    o.podName,
		Version:                      version,
		ClusterID:                    o.clusterID,
		CredentialProviderRegistered: o.credProvider != "",
		EgressAuthzRegistered:        o.extProc != "",
		ConsoleURL:                   o.consoleURL,
		AIProxyURL:                   o.aiProxyURL,
		WorkbenchMCPURL:              o.workbenchMCP,
		GatewayURL:                   gatewayURL,
		RequestTokenJWKS:             jwks,
	}, core.Deps{
		Ingest:  ingest,
		Actors:  ate,
		Router:  rt,
		Records: &core.KubeRecords{Client: kube, Namespace: o.podNamespace},
		Runners: &core.KubeRunners{Client: kube, Namespace: o.podNamespace},
		Seeds:   seeds,
		Log:     log.WithName("core"),
	})
	if err != nil {
		return err
	}

	var prb *prober.Prober
	var resolver egress.ActorResolver = gw
	if o.probeNamespace != "" {
		prb, err = prober.New(prober.Config{
			Namespace:  o.probeNamespace,
			Holder:     o.podName,
			ConsoleURL: o.consoleURL,
			AIProxyURL: o.aiProxyURL,
		}, prober.Deps{Client: kube, Actors: ate, Daemons: rt, Log: log.WithName("prober")})
		if err != nil {
			return err
		}
		resolver = prober.Chain(prb, gw)
	} else {
		log.Info("WARNING: DEVBOX_PROBE_NAMESPACE is not set; agent probes requested by the operator won't run")
	}

	// The credential provider and ext_proc serve the servicedns pod certificate, which atenet-egress verifies
	// against the servicedns trust bundle as devbox-gateway.<ns>.svc and devbox-egress-authz.<ns>.svc, and require
	// atenet-egress's pod-identity client certificate.
	egressCfg := egress.Config{
		CredentialProviderAddr: o.credProvider,
		AuthzAddr:              o.extProc,
		ServerBundleFile:       serving,
		ClientCAFile:           filepath.Join(o.podIdentityDir, "trust-bundle.pem"),
		AllowedClientSANs:      splitList(o.egressIDs),
		InsecureSkipClientAuth: o.insecureEgress,
		Gateway:                gatewayEP,
		ActorJWTIssuer:         o.actorIssuer,
		ActorJWTIssuerCAFile:   o.actorIssuerCA,
	}
	egressSvc, err := egress.New(egressCfg, egress.Deps{Ingest: ingest, Actors: resolver, Diffs: gw, Logger: log.WithName("egress")})
	if err != nil {
		return fmt.Errorf("configuring egress: %w", err)
	}
	mcpHandler := egressSvc.MCPHandler()
	if mcpHandler == nil {
		return errors.New("the devbox MCP needs DEVBOX_ACTOR_JWT_ISSUER")
	}
	gw.UseEgress(egressSvc, egressSvc)
	if prb != nil {
		prb.UseCredentials(egressSvc)
	}

	inproc, err := tunnel.NewInProcess(gw.Register)
	if err != nil {
		return err
	}
	defer inproc.Stop()

	registerMetrics(gw)

	g, gctx := errgroup.WithContext(ctx)
	g.Go(func() error { return gw.Run(gctx) })
	g.Go(func() error { return egressSvc.Run(gctx) })
	g.Go(func() error {
		tunnel.Run(gctx, tunnel.Config{
			Client:     devboxv1.NewTunnelClient(kas),
			Internal:   inproc.Conn(),
			Descriptor: tunnel.Descriptor(&devboxv1.Gateway_ServiceDesc),
			MinIdle:    int32(o.minIdle),
			Log:        log.WithName("tunnel"),
		})
		return nil
	})
	g.Go(func() error { return serveMCPPort(gctx, o, gw, mcpHandler, log) })
	if prb != nil {
		g.Go(func() error { return prb.Run(gctx) })
	}
	g.Go(func() error { return serveMetrics(gctx, o.metricsAddr) })
	log.Info("devbox-gateway started", "version", version, "kas", o.kasURL, "gateway", gatewayURL)
	err = g.Wait()
	if ctx.Err() != nil {
		return nil
	}
	return err
}

// kubeClient reads DevboxRunners, writes instance record ConfigMaps and, in the probe namespace, reads the probe
// request ConfigMaps and token Secret.
func kubeClient() (client.WithWatch, error) {
	cfg, err := ctrl.GetConfig()
	if err != nil {
		return nil, fmt.Errorf("loading kubeconfig: %w", err)
	}
	scheme := runtime.NewScheme()
	if err := v1alpha1.AddToScheme(scheme); err != nil {
		return nil, err
	}
	if err := corev1.AddToScheme(scheme); err != nil {
		return nil, err
	}
	c, err := client.NewWithWatch(cfg, client.Options{Scheme: scheme})
	if err != nil {
		return nil, fmt.Errorf("building kubernetes client: %w", err)
	}
	return c, nil
}

func splitList(s string) []string {
	var out []string
	for _, v := range strings.Split(s, ",") {
		if v = strings.TrimSpace(v); v != "" {
			out = append(out, v)
		}
	}
	return out
}

// serveMCPPort serves the devbox MCP (HTTP) and SandboxCredentials (gRPC) on one port, which is what the
// actor-JWT egress rule targets. gRPC uses cleartext HTTP/2 unless DEVBOX_MCP_TLS is set.
func serveMCPPort(ctx context.Context, o *options, gw *core.Gateway, mcp http.Handler, log logr.Logger) error {
	grpcSrv := grpc.NewServer()
	gw.RegisterSandboxCredentials(grpcSrv)
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.ProtoMajor == 2 && strings.HasPrefix(r.Header.Get("Content-Type"), "application/grpc") {
			grpcSrv.ServeHTTP(w, r)
			return
		}
		if mcp == nil {
			http.NotFound(w, r)
			return
		}
		mcp.ServeHTTP(w, r)
	})
	var protocols http.Protocols
	protocols.SetHTTP1(true)
	protocols.SetHTTP2(true)
	protocols.SetUnencryptedHTTP2(true)
	srv := &http.Server{Addr: o.mcpAddr, Handler: handler, Protocols: &protocols, ReadHeaderTimeout: 10 * time.Second}
	lis, err := (&net.ListenConfig{}).Listen(ctx, "tcp", o.mcpAddr)
	if err != nil {
		return err
	}
	go func() {
		<-ctx.Done()
		sctx, cancel := context.WithTimeout(context.Background(), shutdownGrace)
		defer cancel()
		_ = srv.Shutdown(sctx)
		grpcSrv.Stop()
	}()
	log.Info("listening", "listener", "mcp+sandbox-credentials", "address", lis.Addr().String(), "tls", o.mcpTLS)
	if o.mcpTLS {
		bundle := filepath.Join(o.serviceDNSDir, "credential-bundle.pem")
		srv.TLSConfig = serviceDNSTLS(bundle)
		err = srv.ServeTLS(lis, "", "")
	} else {
		err = srv.Serve(lis)
	}
	if errors.Is(err, http.ErrServerClosed) {
		return nil
	}
	return err
}

func serveMetrics(ctx context.Context, addr string) error {
	mux := http.NewServeMux()
	mux.Handle("/metrics", promhttp.Handler())
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) { _, _ = w.Write([]byte("ok")) })
	mux.HandleFunc("/readyz", func(w http.ResponseWriter, _ *http.Request) {
		if !core.Registered() {
			http.Error(w, "not registered with console yet", http.StatusServiceUnavailable)
			return
		}
		_, _ = w.Write([]byte("ok"))
	})
	srv := &http.Server{Addr: addr, Handler: mux, ReadHeaderTimeout: 10 * time.Second}
	go func() {
		<-ctx.Done()
		sctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = srv.Shutdown(sctx)
	}()
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}

func registerMetrics(gw *core.Gateway) {
	for _, st := range []devboxv1.InstanceStatus{
		devboxv1.InstanceStatus_INSTANCE_STATUS_PROVISIONING, devboxv1.InstanceStatus_INSTANCE_STATUS_RUNNING,
		devboxv1.InstanceStatus_INSTANCE_STATUS_SUSPENDED, devboxv1.InstanceStatus_INSTANCE_STATUS_SNAPSHOTTING,
	} {
		prometheus.MustRegister(prometheus.NewGaugeFunc(prometheus.GaugeOpts{
			Name:        "devbox_gateway_instances",
			Help:        "Instances managed by this gateway replica, by status.",
			ConstLabels: prometheus.Labels{"status": strings.TrimPrefix(st.String(), "INSTANCE_STATUS_")},
		}, func() float64 { return float64(gw.CountByStatus(st)) }))
	}
	prometheus.MustRegister(prometheus.NewGaugeFunc(prometheus.GaugeOpts{
		Name: "devbox_gateway_registered",
		Help: "1 once the gateway registered with console.",
	}, func() float64 {
		if core.Registered() {
			return 1
		}
		return 0
	}))
}

func hostOf(raw string) string {
	raw = strings.TrimPrefix(strings.TrimPrefix(raw, "https://"), "http://")
	if i := strings.IndexAny(raw, "/?#"); i >= 0 {
		raw = raw[:i]
	}
	if h, _, err := net.SplitHostPort(raw); err == nil {
		return h
	}
	return raw
}

func portOf(addr string, def int32) int32 {
	_, p, err := net.SplitHostPort(addr)
	if err != nil {
		return def
	}
	n, err := strconv.Atoi(p)
	if err != nil || n <= 0 {
		return def
	}
	return int32(n)
}
