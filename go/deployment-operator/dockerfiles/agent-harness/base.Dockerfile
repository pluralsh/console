FROM golang:1.26.6-alpine AS builder

ARG TARGETARCH
ARG TARGETOS
ARG VERSION

WORKDIR /workspace

# Copy required local modules referenced by go.mod replace directives
COPY /client /workspace/client
COPY /polly /workspace/polly

WORKDIR /workspace/deployment-operator

# Retrieve application dependencies
COPY deployment-operator/go.* ./
RUN go mod download

COPY deployment-operator/cmd/ ./cmd
COPY deployment-operator/pkg ./pkg
COPY deployment-operator/internal ./internal
COPY deployment-operator/api ./api

# Build agent-harness binary
RUN CGO_ENABLED=0 \
    GOOS=${TARGETOS} \
    GOARCH=${TARGETARCH} \
    go build \
    -tags musl \
    -trimpath \
    -ldflags="-s -w -X github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/environment.Version=${VERSION}" \
    -o /agent-harness \
    cmd/agent-harness/main.go

# Build agent MCP server binary
RUN CGO_ENABLED=0 \
    GOOS=${TARGETOS} \
    GOARCH=${TARGETARCH} \
    go build \
    -tags musl \
    -trimpath \
    -ldflags="-s -w -X github.com/pluralsh/console/go/deployment-operator/cmd/mcpserver/agent.Version=${VERSION}" \
    -o /agent-mcpserver \
    ./cmd/mcpserver/agent

# Build agent bootstrap binary
RUN CGO_ENABLED=0 \
    GOOS=${TARGETOS} \
    GOARCH=${TARGETARCH} \
    go build \
    -tags musl \
    -trimpath \
    -ldflags="-s -w" \
    -o /agent-bootstrap \
    cmd/agent-bootstrap/main.go

FROM nixos/nix:latest@sha256:7a007c766426c1877758ddc5cb87a965ac131fc78c582ce0083d922d51ae945c AS podman

ARG NIXPKGS_REVISION=afe3d8ac4395617bdcdac9f188ac8717a062e014
ARG PODMAN_VERSION=5.8.6

RUN set -eux; \
    outputs="$(nix --extra-experimental-features 'nix-command flakes' \
      build --no-link --print-out-paths \
      "github:NixOS/nixpkgs/${NIXPKGS_REVISION}#podman")"; \
    podman_output=""; \
    for output in ${outputs}; do \
      if [ -x "${output}/bin/podman" ]; then podman_output="${output}"; break; fi; \
    done; \
    test -n "${podman_output}"; \
    test "$("${podman_output}/bin/podman" --version)" = "podman version ${PODMAN_VERSION}"; \
    mkdir -p /podman /closure; \
    cp -a "${podman_output}/." /podman/; \
    nix-store -qR "${podman_output}" | \
      while read -r path; do cp -a --parents "${path}" /closure; done

FROM dhi.io/debian-base:trixie-dev

ARG TARGETARCH
ARG TARGETOS
ARG CODEBASE_MEMORY_MCP_VERSION=0.8.1
ARG DOCKER_COMPOSE_VERSION=5.5.0-1~debian.13~trixie
ARG PODMAN_STATIC_CONFIG_REVISION=a14f4b3ee9751ea232ef10b72e4923869ea8c3d7

# DHI's apt index is occasionally truncated (a few KB instead of several MB).
# Apt then selects Debian git, which cannot install against DHI's rebuilt perl-base.
RUN set -eux; \
    export DEBIAN_FRONTEND=noninteractive; \
    for attempt in 1 2 3 4 5; do \
      rm -rf /var/lib/apt/lists/*; \
      if apt-get update && apt-get install -y --no-install-recommends \
           ca-certificates \
           curl \
           gnupg \
           git \
           jq \
           make \
           tar; then \
        break; \
      fi; \
      if [ "${attempt}" -eq 5 ]; then \
        echo "apt-get install failed after ${attempt} attempts" >&2; \
        exit 1; \
      fi; \
      sleep "${attempt}"; \
    done; \
    command -v git >/dev/null; \
    rm -rf /var/lib/apt/lists/*

RUN set -eux; \
    portable=""; \
    if [ "${TARGETOS}" = "linux" ]; then portable="-portable"; fi; \
    archive="codebase-memory-mcp-${TARGETOS}-${TARGETARCH}${portable}.tar.gz"; \
    base_url="https://github.com/DeusData/codebase-memory-mcp/releases/download/v${CODEBASE_MEMORY_MCP_VERSION}"; \
    curl -fsSL "${base_url}/${archive}" -o "/tmp/${archive}"; \
    curl -fsSL "${base_url}/checksums.txt" -o /tmp/codebase-memory-mcp-checksums.txt; \
    expected="$(awk -v archive="${archive}" '$2 == archive {print $1}' /tmp/codebase-memory-mcp-checksums.txt)"; \
    test -n "${expected}"; \
    echo "${expected}  /tmp/${archive}" | sha256sum -c -; \
    mkdir -p /tmp/codebase-memory-mcp; \
    tar xzf "/tmp/${archive}" -C /tmp/codebase-memory-mcp; \
    mkdir -p /usr/local/bin; \
    install -m 0755 /tmp/codebase-memory-mcp/codebase-memory-mcp /usr/local/bin/codebase-memory-mcp && \
    rm -rf /tmp/codebase-memory-mcp "/tmp/${archive}" /tmp/codebase-memory-mcp-checksums.txt

# Install Docker CLI + Compose (no daemon)
RUN install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/debian/gpg | \
      gpg --dearmor -o /etc/apt/keyrings/docker.gpg && \
    chmod a+r /etc/apt/keyrings/docker.gpg && \
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
      https://download.docker.com/linux/debian trixie stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null && \
    for attempt in 1 2 3 4 5; do \
      if apt-get update && apt-get install -y --no-install-recommends \
           docker-ce-cli "docker-compose-plugin=${DOCKER_COMPOSE_VERSION}" ripgrep; then \
        break; \
      fi; \
      if [ "${attempt}" -eq 5 ]; then \
        echo "apt-get install docker-ce-cli failed after ${attempt} attempts" >&2; \
        exit 1; \
      fi; \
      rm -rf /var/lib/apt/lists/*; \
      sleep "${attempt}"; \
    done; \
    ln -s /usr/libexec/docker/cli-plugins/docker-compose /usr/bin/docker-compose && \
    rm -rf /var/lib/apt/lists/*

# Install the Nix binary-cache Podman engine and rootless user mapping helpers
RUN set -eux; \
    for attempt in 1 2 3 4 5; do \
      if apt-get update && apt-get install -y --no-install-recommends uidmap; then \
        break; \
      fi; \
      rm -rf /var/lib/apt/lists/*; \
      sleep "${attempt}"; \
    done; \
    dpkg -s uidmap > /dev/null; \
    rm -rf /var/lib/apt/lists/*
COPY --from=podman /closure/nix/store /nix/store
COPY --from=podman /podman /opt/podman
RUN set -eux; \
    ln -s /opt/podman/bin/podman /usr/local/bin/podman; \
    set -- /nix/store/*-fuse-overlayfs-*/bin/fuse-overlayfs; \
    test "$#" -eq 1; \
    ln -s "$1" /usr/local/bin/fuse-overlayfs; \
    podman --version; \
    mkdir -p /etc/containers; \
    config_root="https://raw.githubusercontent.com/mgoltzsche/podman-static/${PODMAN_STATIC_CONFIG_REVISION}/conf"; \
    config_url="${config_root}/containers"; \
    curl -fsSL "${config_url}/containers.conf" -o /etc/containers/containers.conf; \
    echo "6d3e5933429693a8b1a2769721bac87947b441962cbeb085ee06678d30c1e30c  /etc/containers/containers.conf" | sha256sum -c -; \
    curl -fsSL "${config_url}/policy.json" -o /etc/containers/policy.json; \
    echo "cddfaa8e6a7e5497b67cc0dd8e8517058d0c97de91bf46fff867528415f2d946  /etc/containers/policy.json" | sha256sum -c -; \
    curl -fsSL "${config_url}/registries.conf" -o /etc/containers/registries.conf; \
    echo "f35c4c47091ed86eff074ee6c5c69dc4acbb0a35d1f53f551752b923cbabaaef  /etc/containers/registries.conf" | sha256sum -c -; \
    curl -fsSL "${config_url}/storage.conf" -o /etc/containers/storage.conf; \
    echo "878b8dab9955c7cdd2d23de58e6834aa48bb21576ba5d09aba8ad4e979a4dd02  /etc/containers/storage.conf" | sha256sum -c -

# Ensure system paths are explicitly set
ENV PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH}"

    # Copy binaries before switching user to ensure proper permissions
COPY --from=builder /agent-harness /agent-harness
COPY --from=builder /agent-mcpserver /agent-mcpserver
COPY --from=builder /agent-bootstrap /agent-bootstrap

# Copy the entrypoint wrapper that starts `podman system service` when DIND_ENABLED=true
COPY deployment-operator/dockerfiles/agent-harness/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Configure the DHI-provided nonroot user for rootless Podman
RUN echo "nonroot:100000:65536" >> /etc/subuid && \
    echo "nonroot:100000:65536" >> /etc/subgid

WORKDIR /plural

COPY deployment-operator/dockerfiles/agent-harness/system /plural/system

RUN mkdir -p /plural/.opencode && \
    mkdir -p /plural/.claude && \
    mkdir -p /plural/.gemini && \
    mkdir -p /plural/.codex && \
    mkdir -p /plural/.cache/codebase-memory-mcp

RUN chown -R 65532:65532 /plural && \
    mkdir -p /run/user/65532 && \
    chown 65532:65532 /run/user/65532

# Avoid user-mode networking under cross-architecture emulation.
RUN mkdir -p /home/nonroot/.config/containers && \
    printf '[containers]\nnetns = "host"\n' \
      > /home/nonroot/.config/containers/containers.conf && \
    chown -R 65532:65532 /home/nonroot/.config

# Switch to the nonroot user
USER 65532:65532

WORKDIR /plural

HEALTHCHECK --interval=60s --timeout=10s --start-period=30s --retries=5 \
  CMD kill -0 1 || exit 1

ENTRYPOINT ["/entrypoint.sh", "/agent-harness", "--working-dir=/plural"]