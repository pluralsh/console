package main

import (
	"context"
	"errors"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/pluralsh/console/go/observability-proxy/cmd/proxy/args"
	"github.com/pluralsh/console/go/observability-proxy/internal/console"
	"github.com/pluralsh/console/go/observability-proxy/internal/logging"
	"github.com/pluralsh/console/go/observability-proxy/internal/proxy"
	"github.com/pluralsh/console/go/observability-proxy/internal/ratelimit"
	"k8s.io/klog/v2"
)

func main() {
	args.Init()
	defer klog.Flush()

	klog.V(logging.LevelMinimal).Infof("starting observability-proxy listen=%s grpc_endpoint=%s", args.ListenAddr(), args.ConsoleGRPCEndpoint())
	klog.V(logging.LevelDebug).Infof(
		"runtime options configTTL=%s grpcTimeout=%s upstreamTimeout=%s queryRPS=%d queryBurst=%d",
		args.ConfigTTL(),
		args.GRPCTimeout(),
		args.UpstreamTimeout(),
		args.QueryRPS(),
		args.QueryBurst(),
	)

	grpcClient, err := console.NewGRPCClient(args.ConsoleGRPCEndpoint(), args.GRPCTimeout())
	if err != nil {
		klog.Errorf("failed to create grpc client: %v", err)
		os.Exit(1)
	}
	defer func() {
		if closeErr := grpcClient.Close(); closeErr != nil {
			klog.Errorf("failed to close grpc client: %v", closeErr)
		}
	}()

	provider := console.NewCachingProvider(grpcClient, args.ConfigTTL())

	// Prime config eagerly so readiness transitions quickly.
	_, err = provider.GetConfig(context.Background())
	if err != nil {
		klog.Warningf("initial config fetch failed, service will remain unready until successful refresh: %v", err)
	} else {
		klog.V(logging.LevelInfo).Infof("initial observability config loaded successfully")
	}

	h := proxy.NewHandler(provider, args.UpstreamTimeout())

	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})
	mux.HandleFunc("/ready", func(w http.ResponseWriter, _ *http.Request) {
		if !provider.Ready() {
			http.Error(w, "config not loaded", http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ready"))
	})
	h.Register(mux)

	srv := &http.Server{
		Addr:              args.ListenAddr(),
		Handler:           mux,
		ReadTimeout:       15 * time.Second,
		ReadHeaderTimeout: 5 * time.Second,
		WriteTimeout:      0,
		IdleTimeout:       120 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		klog.V(logging.LevelMinimal).Infof("http server listening on %s", args.ListenAddr())
		errCh <- srv.ListenAndServe()
	}()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	select {
	case sig := <-sigCh:
		klog.V(logging.LevelMinimal).Infof("received signal %s, shutting down", sig)
	case err = <-errCh:
		if !errors.Is(err, http.ErrServerClosed) {
			klog.Errorf("server failed: %v", err)
			os.Exit(1)
		}
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		klog.Errorf("shutdown failed: %v", err)
		os.Exit(1)
	}
}
