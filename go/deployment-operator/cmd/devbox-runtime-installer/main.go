// Command devbox-runtime-installer is the entrypoint of ghcr.io/pluralsh/devbox-runtime-core, the plural-runtime
// sidecar of every devbox actor. It installs the components of the image's payload that the runner uses
// (devbox-daemon, and the agents and tools of spec.agents) into the home volume it shares with the devbox
// container, publishes a marker naming the installed runtime, and then stays alive.
//
// The devbox container runs the environment image and waits for the marker before it execs the daemon from the
// home volume, so the daemon and the agents are always the ones the deployment operator ships, whatever the
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
	"strings"
	"syscall"
	"time"
)

// version is set with -ldflags "-X main.version=...".
var version = "dev"

func main() {
	src := flag.String("src", "/payload", "the runtime payload in this image")
	dst := flag.String("dst", "/mnt/home/.plural-runtime", "install root on the shared home volume")
	digest := flag.String("digest", os.Getenv("DEVBOX_RUNTIME_DIGEST"), "the runtime image digest, which with the agents names the install directory and the ready marker")
	agents := flag.String("agents", "", "comma-separated agents to install (claude, codex, ...)")
	browser := flag.Bool("browser", false, "install the browser's tools (Playwright MCP)")
	stay := flag.Bool("stay", true, "block after installing until SIGTERM or SIGINT")
	flag.Parse()

	log := slog.New(slog.NewJSONHandler(os.Stderr, nil)).With("service", "devbox-runtime-installer", "version", version)
	start := time.Now()
	res, err := install(*src, *dst, *digest, splitList(*agents), *browser)
	if err != nil {
		log.Error("installing the runtime failed", "digest", *digest, "err", err)
		os.Exit(1)
	}
	if len(res.Missing) > 0 {
		// The daemon falls back to the environment image's own agents for these.
		log.Warn("the runtime doesn't carry some agents", "agents", res.Missing)
	}
	log.Info("runtime "+res.Action, "digest", *digest, "id", res.ID, "dir", res.Dir, "components", res.Components, "copied", res.Copied,
		"bytes", res.Bytes, "removed", res.Removed, "took_ms", time.Since(start).Milliseconds())

	if !*stay {
		return
	}
	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGTERM, syscall.SIGINT)
	defer cancel()
	<-ctx.Done()
}

func splitList(s string) []string {
	return strings.FieldsFunc(s, func(r rune) bool { return r == ',' })
}
