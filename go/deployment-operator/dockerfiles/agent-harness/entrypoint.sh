#!/bin/bash
set -e

# When Podman-based DinD is requested, start `podman system service` as a background
# process before handing off to the harness. The Docker CLI in the harness (and any
# tool the agent invokes) connects via DOCKER_HOST=unix:///run/user/65532/podman/podman.sock.
if [ "${PLRL_DIND_ENABLED}" = "true" ]; then
    # When running as root (UID 0) use rootful Podman — no user-namespace/newuidmap
    # required, and the socket lives at the system path.  When running as a non-root
    # user fall back to the rootless XDG_RUNTIME_DIR socket.
    if [ "$(id -u)" = "0" ]; then
        PODMAN_SOCK="/run/podman/podman.sock"
        mkdir -p /run/podman
    else
        export XDG_RUNTIME_DIR=/run/user/$(id -u)
        mkdir -p "${XDG_RUNTIME_DIR}/podman"
        PODMAN_SOCK="${XDG_RUNTIME_DIR}/podman/podman.sock"
    fi

    podman system service --time=0 "unix://${PODMAN_SOCK}" &

    echo "Waiting for podman socket at ${PODMAN_SOCK} ..."
    for i in $(seq 1 60); do
        if [ -S "${PODMAN_SOCK}" ]; then
            echo "Podman socket ready."
            break
        fi
        sleep 1
    done

    if [ ! -S "${PODMAN_SOCK}" ]; then
        echo "ERROR: podman socket did not appear after 60 s" >&2
        exit 1
    fi

    # Ensure DOCKER_HOST points at the Podman socket for all child processes.
    export DOCKER_HOST="unix://${PODMAN_SOCK}"
fi

exec "$@"
