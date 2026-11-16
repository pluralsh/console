// Command stub is a stand-in for devbox-daemon and devbox-gateway, built when the
// image is built with DAEMON_SOURCE=stub or GATEWAY_SOURCE=stub. It lets the rest of
// an image be built and tested before the real binary compiles. Never publish it.
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"
)

var version = "stub"

func main() {
	listen := flag.String("listen", envOr("DEVBOX_LISTEN_ADDR", ":80"), "address to serve health endpoints on")
	printVersion := flag.Bool("version", false, "print the version and exit")
	flag.Parse()

	name := filepath.Base(os.Args[0])
	if *printVersion {
		fmt.Printf("%s %s\n", name, version)
		return
	}

	if os.Getpid() == 1 {
		go reap()
	}

	mux := http.NewServeMux()
	for _, path := range []string{"/healthz", "/readyz"} {
		mux.HandleFunc(path, func(w http.ResponseWriter, _ *http.Request) {
			_, _ = fmt.Fprintln(w, "ok")
		})
	}
	mux.HandleFunc("/version", func(w http.ResponseWriter, _ *http.Request) {
		_, _ = fmt.Fprintf(w, "%s %s\n", name, version)
	})

	srv := &http.Server{Addr: *listen, Handler: mux, ReadHeaderTimeout: 5 * time.Second}
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, syscall.SIGINT)
	defer stop()

	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = srv.Shutdown(shutdownCtx)
	}()

	log.Printf("%s %s (placeholder) listening on %s", name, version, *listen)
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
}

// reap collects orphaned children, which PID 1 inherits.
func reap() {
	sigs := make(chan os.Signal, 1)
	signal.Notify(sigs, syscall.SIGCHLD)
	for range sigs {
		for {
			var status syscall.WaitStatus
			pid, err := syscall.Wait4(-1, &status, syscall.WNOHANG, nil)
			if pid <= 0 || err != nil {
				break
			}
		}
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
