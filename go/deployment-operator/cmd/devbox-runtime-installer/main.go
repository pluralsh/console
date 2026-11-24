// Command devbox-runtime-installer is the entrypoint of ghcr.io/pluralsh/devbox-runtime-core, the plural-runtime
// sidecar of every devbox actor. It installs the image's payload (devbox-daemon) into the home volume it shares
// with the devbox container, publishes a marker naming the installed runtime, and then stays alive.
//
// The devbox container runs the customer's environment image and waits for the marker before it execs the
// daemon from the home volume, so the daemon is always the one the deployment operator ships, whatever the
// environment image contains.
//
// It stays alive because gVisor can't restore a memory snapshot of an actor with an exited container.
package main

import (
	"context"
	"flag"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"
)

// version is set with -ldflags "-X main.version=...".
var version = "dev"

func main() {
	src := flag.String("src", "/payload", "the runtime payload in this image")
	dst := flag.String("dst", "/mnt/home/.plural-runtime", "install root on the shared home volume")
	digest := flag.String("digest", os.Getenv("DEVBOX_RUNTIME_DIGEST"), "the runtime image digest, which names the install directory and the ready marker")
	stay := flag.Bool("stay", true, "block after installing until SIGTERM or SIGINT")
	flag.Parse()

	log := slog.New(slog.NewJSONHandler(os.Stderr, nil)).With("service", "devbox-runtime-installer", "version", version)
	start := time.Now()
	res, err := install(*src, *dst, *digest)
	if err != nil {
		log.Error("installing the runtime failed", "digest", *digest, "err", err)
		os.Exit(1)
	}
	log.Info("runtime "+res.Action, "digest", *digest, "dir", res.Dir, "bytes", res.Bytes, "removed", res.Removed, "took_ms", time.Since(start).Milliseconds())

	if !*stay {
		return
	}
	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGTERM, syscall.SIGINT)
	defer cancel()
	<-ctx.Done()
}
