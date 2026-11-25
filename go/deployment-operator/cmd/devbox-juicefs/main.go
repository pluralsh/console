// Command devbox-juicefs is the CSI driver behind JuiceFS devbox homes (pkg/devbox/juicefs). The agent-substrate
// chart runs it twice: `controller` as a Deployment Substrate reaches over mTLS, and `node` as a privileged
// DaemonSet atelet reaches through the kubelet plugin socket.
//
// The metadata password comes from META_PASSWORD or META_PASSWORD_FILE, never a flag.
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
	"strings"
	"sync/atomic"
	"syscall"
	"time"

	"github.com/container-storage-interface/spec/lib/go/csi"
	"github.com/go-logr/logr"
	"golang.org/x/sync/errgroup"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"

	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/juicefs"
	"github.com/pluralsh/console/go/deployment-operator/pkg/devbox/podcert"
)

// version is set with -ldflags "-X main.version=...".
var version = "dev"

const (
	formatRetry  = 10 * time.Second
	mountTimeout = 2 * time.Minute
	pollInterval = 200 * time.Millisecond
)

type stringList []string

func (s *stringList) String() string     { return strings.Join(*s, " ") }
func (s *stringList) Set(v string) error { *s = append(*s, v); return nil }

type options struct {
	mode       string
	binary     string
	metaURL    string
	mountinfo  string
	health     string
	mountFlags stringList

	// controller
	listen         string
	root           string
	rootCache      string
	name           string
	storage        string
	bucket         string
	accessKey      string
	formatFlags    stringList
	servingBundle  string
	clientCA       string
	allowedClients string

	// node
	endpoint   string
	nodeID     string
	targetRoot string
	cacheRoot  string
}

func main() {
	o := &options{}
	flag.StringVar(&o.mode, "mode", "", "controller or node")
	flag.StringVar(&o.binary, "juicefs", "/usr/local/bin/juicefs", "the juicefs binary")
	flag.StringVar(&o.metaURL, "meta-url", os.Getenv("JUICEFS_META_URL"), "the metadata store URL, without its password (JUICEFS_META_URL)")
	flag.StringVar(&o.mountinfo, "mountinfo", "/proc/self/mountinfo", "the mount table to watch")
	flag.StringVar(&o.health, "health-address", ":9821", "where /healthz answers once the plugin can serve")
	flag.Var(&o.mountFlags, "mount-flag", "an extra `juicefs mount` flag, repeatable")

	flag.StringVar(&o.listen, "listen", ":9820", "controller: the mTLS gRPC address")
	flag.StringVar(&o.root, "root", "/var/lib/juicefs/root", "controller: where the whole filesystem is mounted")
	flag.StringVar(&o.rootCache, "root-cache-dir", "/var/lib/juicefs/cache", "controller: the root mount's cache")
	flag.StringVar(&o.name, "name", "devbox-homes", "controller: the filesystem name, also its object prefix in the bucket")
	flag.StringVar(&o.storage, "storage", "s3", "controller: the object storage type (s3, gs or wasb)")
	flag.StringVar(&o.bucket, "bucket", "", "controller: the bucket URL")
	flag.StringVar(&o.accessKey, "access-key", "", "controller: the access key, or the account name for wasb; empty uses the cloud's default credentials")
	flag.Var(&o.formatFlags, "format-flag", "controller: an extra `juicefs format` flag, repeatable")
	flag.StringVar(&o.servingBundle, "serving-bundle", "/run/servicedns.podcert.ate.dev/credential-bundle.pem", "controller: the serving credential bundle")
	flag.StringVar(&o.clientCA, "client-ca", "/run/podidentity.podcert.ate.dev/trust-bundle.pem", "controller: the trust bundle callers must chain to")
	flag.StringVar(&o.allowedClients, "allowed-clients", "", "controller: comma-separated SPIFFE IDs allowed to call")

	flag.StringVar(&o.endpoint, "endpoint", "/csi/csi.sock", "node: the CSI socket path")
	flag.StringVar(&o.nodeID, "node-id", os.Getenv("NODE_NAME"), "node: this node's name (NODE_NAME)")
	flag.StringVar(&o.targetRoot, "target-root", "/var/lib/ate", "node: the directory publish targets must be under")
	flag.StringVar(&o.cacheRoot, "cache-root", "/var/lib/ate/juicefs/cache", "node: where each mount's cache lives")
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
	switch {
	case o.metaURL == "":
		return errors.New("--meta-url or JUICEFS_META_URL is required")
	case o.mode == "controller":
		return runController(ctx, o, log)
	case o.mode == "node":
		return runNode(ctx, o, log)
	default:
		return fmt.Errorf("--mode must be controller or node, not %q", o.mode)
	}
}

func runController(ctx context.Context, o *options, log logr.Logger) error {
	if o.bucket == "" || o.allowedClients == "" {
		return errors.New("--bucket and --allowed-clients are required")
	}
	tlsConfig, err := podcert.ServerTLS(podcert.ServerConfig{
		Bundle:         o.servingBundle,
		ClientCA:       o.clientCA,
		AllowedURISANs: strings.Split(o.allowedClients, ","),
	})
	if err != nil {
		return err
	}
	cli := juicefs.Exec{Binary: o.binary, MetaURL: o.metaURL}
	var ready atomic.Bool

	g, ctx := errgroup.WithContext(ctx)
	g.Go(func() error { return serveHealth(ctx, o.health, &ready) })
	g.Go(func() error {
		if err := format(ctx, cli, o, log); err != nil {
			return err
		}
		mount, err := mountRoot(ctx, o, log)
		if err != nil {
			return err
		}

		srv := grpc.NewServer(grpc.Creds(credentials.NewTLS(tlsConfig)))
		csi.RegisterIdentityServer(srv, &juicefs.Identity{Version: version, Controller: true, Ready: readiness(&ready)})
		csi.RegisterControllerServer(srv, &juicefs.Controller{Root: o.root, CLI: cli, Log: log})
		lis, err := net.Listen("tcp", o.listen)
		if err != nil {
			return err
		}
		ready.Store(true)
		log.Info("serving the juicefs controller", "address", o.listen, "root", o.root)
		return serve(ctx, srv, lis, mount)
	})
	return g.Wait()
}

// format retries because the metadata database and its role are created alongside this Deployment.
func format(ctx context.Context, cli juicefs.Exec, o *options, log logr.Logger) error {
	args := []string{"--storage", o.storage, "--bucket", o.bucket}
	if o.accessKey != "" {
		args = append(args, "--access-key", o.accessKey)
	}
	args = append(args, o.formatFlags...)
	for {
		err := cli.Format(ctx, o.name, args)
		if err == nil {
			return nil
		}
		log.Error(err, "formatting the filesystem, retrying", "after", formatRetry)
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(formatRetry):
		}
	}
}

// mountRoot mounts the whole filesystem for the controller's clones. It keeps JuiceFS's background jobs, which
// reclaim the objects of deleted homes and seeds. The returned channel closes when the mount process exits.
func mountRoot(ctx context.Context, o *options, log logr.Logger) (<-chan error, error) {
	if err := os.MkdirAll(o.root, 0o755); err != nil {
		return nil, err
	}
	args := append([]string{"mount", o.metaURL, o.root, "--cache-dir", o.rootCache, "--no-usage-report", "--no-syslog"}, o.mountFlags...)
	cmd := exec.Command(o.binary, args...)
	cmd.Stdout, cmd.Stderr = os.Stderr, os.Stderr
	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("starting the root mount: %w", err)
	}
	exited := make(chan error, 1)
	go func() {
		err := cmd.Wait()
		exited <- fmt.Errorf("the root mount exited: %w", err)
		close(exited)
	}()
	go func() {
		<-ctx.Done()
		_ = cmd.Process.Signal(syscall.SIGTERM)
	}()

	deadline := time.After(mountTimeout)
	for {
		if ok, err := juicefs.MountedAt(o.mountinfo, o.root); err != nil {
			return nil, err
		} else if ok {
			log.Info("mounted the filesystem", "root", o.root)
			return exited, nil
		}
		select {
		case err := <-exited:
			return nil, err
		case <-deadline:
			return nil, fmt.Errorf("the root mount didn't appear within %s", mountTimeout)
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(pollInterval):
		}
	}
}

func runNode(ctx context.Context, o *options, log logr.Logger) error {
	if o.nodeID == "" {
		return errors.New("--node-id or NODE_NAME is required")
	}
	mounter := &juicefs.ProcessMounter{
		Binary:    o.binary,
		MetaURL:   o.metaURL,
		CacheRoot: o.cacheRoot,
		Options:   o.mountFlags,
		Mountinfo: o.mountinfo,
		Log:       log,
	}
	if err := mounter.DetachStale(o.targetRoot); err != nil {
		log.Error(err, "detaching stale mounts")
	}
	if err := os.Remove(o.endpoint); err != nil && !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("removing a stale socket: %w", err)
	}
	lis, err := net.Listen("unix", o.endpoint)
	if err != nil {
		return err
	}
	var ready atomic.Bool
	srv := grpc.NewServer()
	csi.RegisterIdentityServer(srv, &juicefs.Identity{Version: version, Ready: readiness(&ready)})
	csi.RegisterNodeServer(srv, &juicefs.Node{NodeID: o.nodeID, TargetRoot: o.targetRoot, Mounter: mounter, Log: log})
	ready.Store(true)
	log.Info("serving the juicefs node plugin", "endpoint", o.endpoint, "node", o.nodeID)

	g, ctx := errgroup.WithContext(ctx)
	g.Go(func() error { return serveHealth(ctx, o.health, &ready) })
	g.Go(func() error { return serve(ctx, srv, lis, nil) })
	return g.Wait()
}

func serve(ctx context.Context, srv *grpc.Server, lis net.Listener, fatal <-chan error) error {
	errs := make(chan error, 1)
	go func() { errs <- srv.Serve(lis) }()
	select {
	case <-ctx.Done():
		srv.GracefulStop()
		return ctx.Err()
	case err := <-fatal:
		srv.Stop()
		return err
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
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		if !ready.Load() {
			http.Error(w, "starting", http.StatusServiceUnavailable)
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
