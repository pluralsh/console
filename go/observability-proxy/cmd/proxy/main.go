package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/pluralsh/console/go/observability-proxy/cmd/proxy/args"
	"github.com/pluralsh/console/go/observability-proxy/internal/console"
	"github.com/pluralsh/console/go/observability-proxy/internal/logging"
	"github.com/pluralsh/console/go/observability-proxy/internal/metering"
	"github.com/pluralsh/console/go/observability-proxy/internal/proxy"
	"k8s.io/klog/v2"
)

func main() {
	args.Init()

	if err := run(); err != nil {
		klog.Errorf("%v", err)
		klog.Flush()
		os.Exit(1)
	}

	klog.Flush()
}

func run() error {
	klog.V(logging.LevelMinimal).Infof("starting observability-proxy listen=%s grpc_endpoint=%s", args.ListenAddr(), args.ConsoleGRPCEndpoint())
	klog.V(logging.LevelDebug).Infof(
		"runtime options configTTL=%s grpcTimeout=%s upstreamTimeout=%s meterInterval=%s",
		args.ConfigTTL(),
		args.GRPCTimeout(),
		args.UpstreamTimeout(),
		args.MeterInterval(),
	)

	grpcClient, err := console.NewGRPCClient(args.ConsoleGRPCEndpoint(), args.GRPCTimeout())
	if err != nil {
		return fmt.Errorf("failed to create grpc client: %w", err)
	}
	defer closeGRPCClient(grpcClient)

	provider := console.NewCachingProvider(grpcClient, args.ConfigTTL())
	reporter := metering.NewUsageReporter(grpcClient, args.MeterInterval())
	defer startUsageReporter(reporter)()
	warmConfig(provider)

	srv := newHTTPServer(provider, reporter.AddBytes)
	errCh := startHTTPServer(srv)

	waitErr := waitForShutdownTrigger(errCh)
	shutdownErr := shutdownHTTPServer(srv)
	if waitErr != nil {
		if shutdownErr != nil {
			return errors.Join(waitErr, shutdownErr)
		}

		return waitErr
	}

	if shutdownErr != nil {
		return shutdownErr
	}

	return nil
}

func closeGRPCClient(grpcClient console.Client) {
	if closeErr := grpcClient.Close(); closeErr != nil {
		klog.Errorf("failed to close grpc client: %v", closeErr)
	}
}

func startUsageReporter(reporter *metering.UsageReporter) func() {
	runCtx, runCancel := context.WithCancel(context.Background())
	reporterDone := make(chan struct{})
	go func() {
		defer close(reporterDone)
		reporter.Start(runCtx)
	}()

	return func() {
		// Ensure the reporter processes ctx cancellation and performs its final flush
		// before other deferred cleanup (especially grpcClient.Close()) runs.
		runCancel()
		<-reporterDone
	}
}

func warmConfig(provider *console.CachingProvider) {
	// Fetch config eagerly so readiness transitions quickly.
	if _, err := provider.GetConfig(context.Background()); err != nil {
		klog.Warningf("initial config fetch failed, service will remain unready until successful refresh: %v", err)
		return
	}

	klog.V(logging.LevelInfo).Infof("initial observability config loaded successfully")
}

func newHTTPServer(provider *console.CachingProvider, recordBytes func(int64)) *http.Server {
	h := proxy.NewHandler(provider, args.UpstreamTimeout(), recordBytes)

	mux := http.NewServeMux()
	mux.HandleFunc("/health", healthHandler())
	mux.HandleFunc("/ready", readinessHandler(provider))
	h.Register(mux)

	return &http.Server{
		Addr:              args.ListenAddr(),
		Handler:           mux,
		ReadTimeout:       15 * time.Second,
		ReadHeaderTimeout: 5 * time.Second,
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       120 * time.Second,
	}
}

func startHTTPServer(srv *http.Server) <-chan error {
	errCh := make(chan error, 1)
	go func() {
		klog.V(logging.LevelMinimal).Infof("http server listening on %s", args.ListenAddr())
		errCh <- srv.ListenAndServe()
	}()

	return errCh
}

func waitForShutdownTrigger(errCh <-chan error) error {
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	defer signal.Stop(sigCh)

	select {
	case sig := <-sigCh:
		klog.V(logging.LevelMinimal).Infof("received signal %s, shutting down", sig)
		return nil
	case err := <-errCh:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return fmt.Errorf("server failed: %w", err)
	}
}

func shutdownHTTPServer(srv *http.Server) error {
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return fmt.Errorf("shutdown failed: %w", err)
	}

	return nil
}
