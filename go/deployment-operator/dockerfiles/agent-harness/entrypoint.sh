#!/bin/bash
set -e

# When Podman-based DinD is requested, start `podman system service` as a background
# process before handing off to the harness. The Docker CLI in the harness (and any
# tool the agent invokes) connects via DOCKER_HOST=unix:///run/user/65532/podman/podman.sock.
if [ "${PLRL_DIND_ENABLED}" = "true" ]; then
    export XDG_RUNTIME_DIR=/run/user/65532
    mkdir -p "${XDG_RUNTIME_DIR}/podman"

    podman system service --time=0 "unix://${XDG_RUNTIME_DIR}/podman/podman.sock" &

    echo "Waiting for podman socket at ${XDG_RUNTIME_DIR}/podman/podman.sock ..."
    for i in $(seq 1 60); do
        if [ -S "${XDG_RUNTIME_DIR}/podman/podman.sock" ]; then
            echo "Podman socket ready."
            break
        fi
        sleep 1
    done

    if [ ! -S "${XDG_RUNTIME_DIR}/podman/podman.sock" ]; then
        echo "ERROR: podman socket did not appear after 60 s" >&2
        exit 1
    fi

    # Ensure DOCKER_HOST points at the Podman socket for all child processes.
    export DOCKER_HOST="unix://${XDG_RUNTIME_DIR}/podman/podman.sock"
fi

exec "$@"
