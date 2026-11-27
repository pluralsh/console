// Command devbox-block is the CSI driver behind block storage devbox homes (pkg/devbox/block). Its disks come
// from the CSI driver for disks the cluster already runs, which it drives through Kubernetes. The agent-substrate
// chart runs it as `controller` in a Deployment Substrate reaches over mTLS, and as `node` in a DaemonSet on the
// devbox nodes, which atelet reaches through the plugin socket on its own node. The controller runs it as `anchor`
// in the pods that keep each disk attached to its node.
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/container-storage-interface/spec/lib/go/csi"
	"github.com/go-logr/logr"
	"golang.org/x/sync/errgroup"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	corev1 "k8s.io/api/core/v1"
	storagev1 "k8s.io/api/storage/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"

	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/block"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/podcert"
)

// version is set with -ldflags "-X main.version=...".
var version = "dev"

type options struct {
	mode   string
	health string

	// controller
	provider          string
	namespace         string
	preflightInterval time.Duration
	listen            string
	storageClass      string
	defaultCapacity   int64
	seedGCInterval    time.Duration
	servingBundle     string
	clientCA          string
	allowedClients    string
	anchorImage       string
	anchorTemplate    string
	diskWait          time.Duration

	// node
	endpoint    string
	nodeID      string
	targetRoot  string
	kubeletRoot string
}

func main() {
	o := &options{}
	flag.StringVar(&o.mode, "mode", "", "controller, node or anchor")
	flag.StringVar(&o.health, "health-address", ":9831", "where /healthz answers once the plugin can serve")

	flag.StringVar(&o.provider, "provider", "", "controller: the CSI driver name of the provider; empty: the default StorageClass's")
	flag.StringVar(&o.namespace, "namespace", os.Getenv("POD_NAMESPACE"), "controller: where records, disk claims, anchors and snapshots live (POD_NAMESPACE)")
	flag.DurationVar(&o.preflightInterval, "preflight-interval", 5*time.Minute, "controller: how often the provider is checked again")
	flag.StringVar(&o.listen, "listen", ":9830", "controller: the mTLS gRPC address")
	flag.StringVar(&o.storageClass, "storage-class", "", "controller: the StorageClass to report the provider's preflight on")
	flag.Int64Var(&o.defaultCapacity, "default-capacity", 20<<30, "controller: the size of a volume created without one, in bytes")
	flag.DurationVar(&o.seedGCInterval, "seed-gc-interval", 10*time.Minute, "controller: how often seeds no StorageClass names, and what disk moves left behind, are deleted; 0 disables it")
	flag.StringVar(&o.servingBundle, "serving-bundle", "/run/servicedns.podcert.ate.dev/credential-bundle.pem", "controller: the serving credential bundle")
	flag.StringVar(&o.clientCA, "client-ca", "/run/podidentity.podcert.ate.dev/trust-bundle.pem", "controller: the trust bundle callers must chain to")
	flag.StringVar(&o.allowedClients, "allowed-clients", "", "controller: comma-separated SPIFFE IDs allowed to call")
	flag.StringVar(&o.anchorImage, "anchor-image", "", "controller: the image of anchor pods, this one")
	flag.StringVar(&o.anchorTemplate, "anchor-template", "", "controller: a file holding a partial Pod, merged over anchor pods' defaults: labels, annotations, priority class, resources...")
	flag.DurationVar(&o.diskWait, "disk-wait", 2*time.Minute, "how long a call waits on the provider (controller) or the kubelet's mount (node) before asking Substrate to retry")

	flag.StringVar(&o.endpoint, "endpoint", "/csi/csi.sock", "node: the CSI socket path")
	flag.StringVar(&o.nodeID, "node-id", os.Getenv("NODE_NAME"), "node: this node's name (NODE_NAME)")
	flag.StringVar(&o.targetRoot, "target-root", "/var/lib/ate", "node: the directory staging and publish paths must be under")
	flag.StringVar(&o.kubeletRoot, "kubelet-root", "/var/lib/kubelet", "node: the kubelet's root directory, where it mounts pods' volumes")
	showVersion := flag.Bool("version", false, "print the version and exit")
	flag.Parse()
	if *showVersion {
		fmt.Println(version)
		return
	}

	log := logr.FromSlogHandler(slog.NewJSONHandler(os.Stderr, nil))
	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	err := run(ctx, o, log)
	cancel()
	if err != nil && !errors.Is(err, context.Canceled) {
		log.Error(err, "exiting")
		os.Exit(1)
	}
}

func run(ctx context.Context, o *options, log logr.Logger) error {
	switch o.mode {
	case "controller":
		return runController(ctx, o, log)
	case "node":
		return runNode(ctx, o, log)
	case "anchor":
		<-ctx.Done()
		return nil
	default:
		return fmt.Errorf("--mode must be controller, node or anchor, not %q", o.mode)
	}
}

func kubeClient() (client.Client, error) {
	scheme := runtime.NewScheme()
	if err := corev1.AddToScheme(scheme); err != nil {
		return nil, err
	}
	if err := storagev1.AddToScheme(scheme); err != nil {
		return nil, err
	}
	cfg, err := ctrl.GetConfig()
	if err != nil {
		return nil, err
	}
	return client.New(cfg, client.Options{Scheme: scheme})
}

func runController(ctx context.Context, o *options, log logr.Logger) error {
	switch {
	case o.namespace == "":
		return errors.New("--namespace or POD_NAMESPACE is required")
	case o.allowedClients == "":
		return errors.New("--allowed-clients is required")
	case o.anchorImage == "":
		return errors.New("--anchor-image is required")
	}
	kube, err := kubeClient()
	if err != nil {
		return err
	}
	tlsConfig, err := podcert.ServerTLS(podcert.ServerConfig{
		Bundle:         o.servingBundle,
		ClientCA:       o.clientCA,
		AllowedURISANs: strings.Split(o.allowedClients, ","),
	})
	if err != nil {
		return err
	}

	disks := &block.KubeDisks{
		Client:      kube,
		Namespace:   o.namespace,
		AnchorImage: o.anchorImage,
		Wait:        o.diskWait,
		Log:         log,
	}
	if o.anchorTemplate != "" {
		data, err := os.ReadFile(o.anchorTemplate)
		if err != nil {
			return fmt.Errorf("reading --anchor-template: %w", err)
		}
		if disks.AnchorTemplate, err = block.ParseAnchorTemplate(data); err != nil {
			return err
		}
	}
	controller := &block.Controller{
		Disks:           disks,
		Store:           &block.KubeStore{Client: kube, Namespace: o.namespace},
		GroupSize:       block.KubeGroupSize(kube),
		DefaultCapacity: o.defaultCapacity,
		Log:             log,
	}
	identity := &block.Identity{Version: version, Controller: true, Preflight: controller.Ready}
	var last string
	preflight := func(ctx context.Context) error {
		p, err := disks.Check(ctx, o.provider)
		if err != nil {
			log.Error(err, "checking the provider")
			return err
		}
		controller.SetProvider(p)
		if summary := fmt.Sprint(p.Name, p.SnapshotClass, p.Problems, p.Warnings); summary != last {
			last = summary
			log.Info("checked the provider", "provider", p.Name, "snapshotClass", p.SnapshotClass, "problems", p.Problems, "warnings", p.Warnings)
		}
		if o.storageClass != "" {
			if err := block.AnnotateStorageClass(ctx, kube, o.storageClass, p); err != nil {
				log.Error(err, "reporting the provider's preflight")
				return err
			}
		}
		return nil
	}
	srv := grpc.NewServer(grpc.Creds(credentials.NewTLS(tlsConfig)))
	csi.RegisterIdentityServer(srv, identity)
	csi.RegisterControllerServer(srv, controller)
	lis, err := net.Listen("tcp", o.listen)
	if err != nil {
		return err
	}
	log.Info("serving the block controller", "address", o.listen, "provider", o.provider)

	g, ctx := errgroup.WithContext(ctx)
	g.Go(func() error { return serveHealth(ctx, o.health, identity) })
	g.Go(func() error { return serve(ctx, srv, lis) })
	g.Go(func() error { return block.RunPreflight(ctx, preflight, preflightRetry, o.preflightInterval) })
	if o.seedGCInterval > 0 {
		g.Go(func() error { return controller.RunCollection(ctx, block.KubeLiveSeeds(kube), o.seedGCInterval) })
	}
	return g.Wait()
}

const preflightRetry = 5 * time.Second

func runNode(ctx context.Context, o *options, log logr.Logger) error {
	if o.nodeID == "" {
		return errors.New("--node-id or NODE_NAME is required")
	}
	if err := os.Remove(o.endpoint); err != nil && !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("removing a stale socket: %w", err)
	}
	lis, err := net.Listen("unix", o.endpoint)
	if err != nil {
		return err
	}
	node := &block.Node{
		NodeID:      o.nodeID,
		TargetRoot:  o.targetRoot,
		KubeletRoot: o.kubeletRoot,
		Mounter:     block.BindMounter{},
		MountWait:   o.diskWait,
		Log:         log,
	}
	identity := &block.Identity{Version: version}
	srv := grpc.NewServer()
	csi.RegisterIdentityServer(srv, identity)
	csi.RegisterNodeServer(srv, node)
	log.Info("serving the block node plugin", "endpoint", o.endpoint, "node", o.nodeID)

	g, ctx := errgroup.WithContext(ctx)
	g.Go(func() error { return serveHealth(ctx, o.health, identity) })
	g.Go(func() error { return serve(ctx, srv, lis) })
	return g.Wait()
}

func serve(ctx context.Context, srv *grpc.Server, lis net.Listener) error {
	errs := make(chan error, 1)
	go func() { errs <- srv.Serve(lis) }()
	select {
	case <-ctx.Done():
		srv.GracefulStop()
		return ctx.Err()
	case err := <-errs:
		return err
	}
}

// serveHealth answers /healthz once the plugin can serve, and /livez while the process does.
func serveHealth(ctx context.Context, address string, identity *block.Identity) error {
	mux := http.NewServeMux()
	mux.HandleFunc("/livez", func(w http.ResponseWriter, _ *http.Request) { _, _ = w.Write([]byte("ok")) })
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		if err := identity.Ready(); err != nil {
			http.Error(w, err.Error(), http.StatusServiceUnavailable)
			return
		}
		_, _ = w.Write([]byte("ok"))
	})
	srv := &http.Server{Addr: address, Handler: mux, ReadHeaderTimeout: 5 * time.Second}
	go func() {
		<-ctx.Done()
		_ = srv.Close()
	}()
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return ctx.Err()
}
