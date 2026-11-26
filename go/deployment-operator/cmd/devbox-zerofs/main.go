// Command devbox-zerofs is the CSI driver behind ZeroFS devbox homes (pkg/devbox/zerofs). The agent-substrate
// chart runs it twice: `controller` as a Deployment Substrate reaches over mTLS, and `node` as a privileged
// DaemonSet on the devbox nodes, which atelet reaches through the plugin socket on its own node.
//
// The node plugin's encryption password comes from ZEROFS_PASSWORD, never a flag. Object storage credentials and
// endpoints come from the cloud SDKs' usual environment.
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
	"os/exec"
	"os/signal"
	"strconv"
	"strings"
	"sync/atomic"
	"syscall"
	"time"

	"github.com/container-storage-interface/spec/lib/go/csi"
	"github.com/go-logr/logr"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"gocloud.dev/blob"
	_ "gocloud.dev/blob/azureblob"
	_ "gocloud.dev/blob/gcsblob"
	_ "gocloud.dev/blob/s3blob"
	"golang.org/x/sync/errgroup"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"

	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/podcert"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/zerofs"
)

// version is set with -ldflags "-X main.version=...".
var version = "dev"

type stringList []string

func (s *stringList) String() string     { return strings.Join(*s, " ") }
func (s *stringList) Set(v string) error { *s = append(*s, v); return nil }

type options struct {
	mode       string
	storageURL string
	health     string
	mountinfo  string

	// controller
	listen          string
	bucketURL       string
	defaultCapacity int64
	servingBundle   string
	clientCA        string
	allowedClients  string

	// node
	endpoint       string
	nodeID         string
	targetRoot     string
	stateRoot      string
	socketDir      string
	binary         string
	nbdClient      string
	nbdClientFlags stringList
	storeOptions   stringList
	nbdsMax        int
	cacheDiskGB    float64
	cacheMemoryGB  float64
	parkedCacheGB  float64
	mountOptions   string
}

func main() {
	o := &options{}
	flag.StringVar(&o.mode, "mode", "", "controller or node")
	flag.StringVar(&o.storageURL, "storage-url", os.Getenv("ZEROFS_STORAGE_URL"), "where volumes live: s3://, gs:// or azure://<bucket>/<path> (ZEROFS_STORAGE_URL)")
	flag.StringVar(&o.health, "health-address", ":9821", "where /healthz answers once the plugin can serve, and the node plugin serves /metrics")
	flag.StringVar(&o.mountinfo, "mountinfo", "/proc/self/mountinfo", "the mount table to watch")

	flag.StringVar(&o.listen, "listen", ":9820", "controller: the mTLS gRPC address")
	flag.StringVar(&o.bucketURL, "bucket-url", "", "controller: the gocloud.dev bucket URL to delete volumes through; derived from --storage-url when empty")
	flag.Int64Var(&o.defaultCapacity, "default-capacity", 100<<30, "controller: the size of a volume created without one, in bytes")
	flag.StringVar(&o.servingBundle, "serving-bundle", "/run/servicedns.podcert.ate.dev/credential-bundle.pem", "controller: the serving credential bundle")
	flag.StringVar(&o.clientCA, "client-ca", "/run/podidentity.podcert.ate.dev/trust-bundle.pem", "controller: the trust bundle callers must chain to")
	flag.StringVar(&o.allowedClients, "allowed-clients", "", "controller: comma-separated SPIFFE IDs allowed to call")

	flag.StringVar(&o.endpoint, "endpoint", "/csi/csi.sock", "node: the CSI socket path")
	flag.StringVar(&o.nodeID, "node-id", os.Getenv("NODE_NAME"), "node: this node's name (NODE_NAME)")
	flag.StringVar(&o.targetRoot, "target-root", "/var/lib/ate", "node: the directory staging and publish paths must be under")
	flag.StringVar(&o.stateRoot, "state-root", "/var/lib/ate/zerofs", "node: where each volume's config and cache live")
	flag.StringVar(&o.socketDir, "socket-dir", "/run/zerofs", "node: where each writer's sockets live, inside the container")
	flag.StringVar(&o.binary, "zerofs", "/usr/local/bin/zerofs", "node: the zerofs binary")
	flag.StringVar(&o.nbdClient, "nbd-client", "nbd-client", "node: the nbd-client binary")
	flag.Var(&o.nbdClientFlags, "nbd-client-flag", "node: an extra nbd-client flag when attaching a device, repeatable")
	flag.Var(&o.storeOptions, "object-store-option", "node: an object_store `key=value` for every writer, such as allow_http=true, repeatable")
	flag.IntVar(&o.nbdsMax, "nbds-max", 128, "node: the NBD devices to ask for when loading the nbd module, 0 to leave it alone")
	flag.Float64Var(&o.cacheDiskGB, "cache-disk-gb", 10, "node: each writer's disk cache")
	flag.Float64Var(&o.cacheMemoryGB, "cache-memory-gb", 0.25, "node: each writer's memory cache")
	flag.Float64Var(&o.parkedCacheGB, "parked-cache-gb", 20, "node: the disk the caches of volumes no longer staged here may hold in all, so a home staged here again starts warm; 0 keeps none")
	flag.StringVar(&o.mountOptions, "mount-options", "", "node: the ext4 mount's data options")
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
	storage, err := zerofs.ParseStorage(o.storageURL)
	if err != nil {
		return err
	}
	switch o.mode {
	case "controller":
		return runController(ctx, o, storage, log)
	case "node":
		return runNode(ctx, o, storage, log)
	default:
		return fmt.Errorf("--mode must be controller or node, not %q", o.mode)
	}
}

func runController(ctx context.Context, o *options, storage zerofs.Storage, log logr.Logger) error {
	if o.allowedClients == "" {
		return errors.New("--allowed-clients is required")
	}
	tlsConfig, err := podcert.ServerTLS(podcert.ServerConfig{
		Bundle:         o.servingBundle,
		ClientCA:       o.clientCA,
		AllowedURISANs: strings.Split(o.allowedClients, ","),
	})
	if err != nil {
		return err
	}
	bucketURL := o.bucketURL
	if bucketURL == "" {
		pathStyle, _ := strconv.ParseBool(os.Getenv("AWS_S3_USE_PATH_STYLE"))
		bucketURL = storage.BucketURL(pathStyle)
	}
	bucket, err := blob.OpenBucket(ctx, bucketURL)
	if err != nil {
		return fmt.Errorf("opening %s: %w", bucketURL, err)
	}
	defer bucket.Close()

	var ready atomic.Bool
	srv := grpc.NewServer(grpc.Creds(credentials.NewTLS(tlsConfig)))
	csi.RegisterIdentityServer(srv, &zerofs.Identity{Version: version, Controller: true, Ready: readiness(&ready)})
	csi.RegisterControllerServer(srv, &zerofs.Controller{
		Storage:         storage,
		Store:           zerofs.BlobStore{Bucket: bucket},
		DefaultCapacity: o.defaultCapacity,
		Log:             log,
	})
	lis, err := net.Listen("tcp", o.listen)
	if err != nil {
		return err
	}
	ready.Store(true)
	log.Info("serving the zerofs controller", "address", o.listen, "storage", o.storageURL)

	g, ctx := errgroup.WithContext(ctx)
	g.Go(func() error { return serveHealth(ctx, o.health, &ready) })
	g.Go(func() error { return serve(ctx, srv, lis) })
	return g.Wait()
}

func runNode(ctx context.Context, o *options, storage zerofs.Storage, log logr.Logger) error {
	switch {
	case o.nodeID == "":
		return errors.New("--node-id or NODE_NAME is required")
	case os.Getenv(zerofs.PasswordEnv) == "":
		return fmt.Errorf("%s is required", zerofs.PasswordEnv)
	}
	storeOptions := map[string]string{}
	for _, kv := range o.storeOptions {
		k, v, ok := strings.Cut(kv, "=")
		if !ok || k == "" {
			return fmt.Errorf("--object-store-option %q isn't key=value", kv)
		}
		storeOptions[k] = v
	}
	if o.nbdsMax > 0 {
		// Best effort: a node whose kernel has nbd built in, or loaded already, needs nothing.
		if out, err := exec.CommandContext(ctx, "modprobe", "nbd", "nbds_max="+strconv.Itoa(o.nbdsMax)).CombinedOutput(); err != nil {
			log.Info("couldn't load the nbd module", "error", err.Error(), "output", strings.TrimSpace(string(out)))
		}
	}
	for _, dir := range []string{o.stateRoot, o.socketDir} {
		if err := os.MkdirAll(dir, 0o700); err != nil {
			return err
		}
	}
	manager := &zerofs.Manager{
		Binary:             o.binary,
		NBDClient:          o.nbdClient,
		Blkid:              "blkid",
		Mkfs:               "mkfs.ext4",
		Resize:             "resize2fs",
		NBDClientFlags:     o.nbdClientFlags,
		Storage:            storage,
		ObjectStoreOptions: storeOptions,
		StateRoot:          o.stateRoot,
		SocketDir:          o.socketDir,
		Cache:              zerofs.CacheConfig{DiskGB: o.cacheDiskGB, MemoryGB: o.cacheMemoryGB},
		ParkedCacheBytes:   int64(o.parkedCacheGB * (1 << 30)),
		MountOptions:       o.mountOptions,
		Mountinfo:          o.mountinfo,
		SysBlock:           "/sys/block",
		Log:                log,
	}
	if err := manager.DetachStale(ctx, o.targetRoot); err != nil {
		log.Error(err, "detaching stale volumes")
	}
	if err := os.Remove(o.endpoint); err != nil && !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("removing a stale socket: %w", err)
	}
	lis, err := net.Listen("unix", o.endpoint)
	if err != nil {
		return err
	}
	var ready atomic.Bool
	isReady := func() error {
		if err := readiness(&ready)(); err != nil {
			return err
		}
		return manager.Ready()
	}
	srv := grpc.NewServer()
	csi.RegisterIdentityServer(srv, &zerofs.Identity{Version: version, Ready: isReady})
	csi.RegisterNodeServer(srv, &zerofs.Node{
		NodeID:     o.nodeID,
		TargetRoot: o.targetRoot,
		Stager:     manager,
		Binder:     zerofs.HostBinder{Mountinfo: o.mountinfo},
		Log:        log,
	})
	ready.Store(true)
	log.Info("serving the zerofs node plugin", "endpoint", o.endpoint, "node", o.nodeID)

	reg := prometheus.NewRegistry()
	reg.MustRegister(manager.Collectors()...)
	metrics := promhttp.HandlerFor(reg, promhttp.HandlerOpts{})

	g, ctx := errgroup.WithContext(ctx)
	g.Go(func() error { return serveHealthFunc(ctx, o.health, isReady, metrics) })
	g.Go(func() error { return serve(ctx, srv, lis) })
	err = g.Wait()
	manager.Shutdown()
	return err
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

func readiness(ready *atomic.Bool) func() error {
	return func() error {
		if !ready.Load() {
			return errors.New("starting")
		}
		return nil
	}
}

func serveHealth(ctx context.Context, address string, ready *atomic.Bool) error {
	return serveHealthFunc(ctx, address, readiness(ready), nil)
}

// serveHealthFunc serves /healthz, and /metrics when metrics isn't nil.
func serveHealthFunc(ctx context.Context, address string, ready func() error, metrics http.Handler) error {
	mux := http.NewServeMux()
	if metrics != nil {
		mux.Handle("/metrics", metrics)
	}
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		if err := ready(); err != nil {
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
