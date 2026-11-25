# syntax=docker/dockerfile:1.10
#
# ghcr.io/pluralsh/devbox-minimal: the devbox sandbox image (DBX-49) and the
# recommended base for custom runner images. Build context: ./go
#
#   docker build -f deployment-operator/dockerfiles/devbox/minimal.Dockerfile go
#
# DAEMON_SOURCE=stub swaps devbox-daemon for a placeholder health server, so the
# rest of the image can be built and tested without cmd/devbox-daemon. Never
# publish a stub build.

ARG DEBIAN_IMAGE=debian:trixie-20261104-slim
ARG GO_IMAGE=golang:1.27.2-trixie
# renovate: datasource=docker depName=node
ARG NODE_VERSION=24.11.1
ARG DAEMON_SOURCE=build

# Harness versions are the agent-run images' pins (dockerfiles/agent-harness/*);
# test.sh fails if they drift.
# renovate: datasource=npm depName=@anthropic-ai/claude-code
ARG CLAUDE_VERSION=2.1.332
# renovate: datasource=npm depName=@agentclientprotocol/claude-agent-acp
ARG CLAUDE_ACP_VERSION=0.112.0
# renovate: datasource=npm depName=@openai/codex
ARG CODEX_VERSION=0.172.0
# renovate: datasource=npm depName=@agentclientprotocol/codex-acp
ARG CODEX_ACP_VERSION=2.12.0
# renovate: datasource=npm depName=opencode-ai
ARG OPENCODE_VERSION=1.19.6
# renovate: datasource=npm depName=@google/gemini-cli
ARG GEMINI_VERSION=0.71.1
# renovate: datasource=npm depName=@earendil-works/pi-coding-agent
ARG PI_VERSION=1.6.1
# renovate: datasource=npm depName=pi-acp
ARG PI_ACP_VERSION=0.0.35
# renovate: datasource=npm depName=pi-mcp-adapter
ARG PI_MCP_ADAPTER_VERSION=7.0.1
# renovate: datasource=npm depName=@playwright/mcp
ARG PLAYWRIGHT_MCP_VERSION=0.0.86

# ---------------------------------------------------------------------------
# devbox-daemon
# ---------------------------------------------------------------------------
FROM ${GO_IMAGE} AS daemon-build

ARG TARGETARCH
ARG TARGETOS
ARG VERSION=dev

WORKDIR /workspace
COPY client /workspace/client
COPY polly /workspace/polly

WORKDIR /workspace/deployment-operator
COPY deployment-operator/go.* ./
RUN go mod download

COPY deployment-operator/cmd/ ./cmd
COPY deployment-operator/pkg ./pkg
COPY deployment-operator/internal ./internal
COPY deployment-operator/api ./api

# The build cache stays out of the layer, which the registry cache would otherwise export.
RUN --mount=type=cache,target=/root/.cache/go-build,id=devbox-daemon-${TARGETARCH} \
    GOCACHE=/root/.cache/go-build CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} \
    go build -trimpath \
      -ldflags="-s -w -X main.version=${VERSION}" \
      -o /out/devbox-daemon \
      ./cmd/devbox-daemon

FROM ${GO_IMAGE} AS daemon-stub

ARG TARGETARCH
ARG TARGETOS
ARG VERSION=dev

WORKDIR /src
COPY deployment-operator/dockerfiles/devbox/stub/ ./
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} GOWORK=off \
    go build -trimpath -ldflags="-s -w -X main.version=${VERSION}-stub" -o /out/devbox-daemon .

# hadolint ignore=DL3006
FROM daemon-${DAEMON_SOURCE} AS daemon

# ---------------------------------------------------------------------------
# Harnesses, ACP adapters, Playwright MCP and the Node runtime they share
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-trixie-slim AS harnesses

ARG CLAUDE_VERSION
ARG CLAUDE_ACP_VERSION
ARG CODEX_VERSION
ARG CODEX_ACP_VERSION
ARG OPENCODE_VERSION
ARG GEMINI_VERSION
ARG PI_VERSION
ARG PI_ACP_VERSION
ARG PI_MCP_ADAPTER_VERSION
ARG PLAYWRIGHT_MCP_VERSION

ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

RUN npm install --global \
      "@anthropic-ai/claude-code@${CLAUDE_VERSION}" \
      "@agentclientprotocol/claude-agent-acp@${CLAUDE_ACP_VERSION}" \
      "@openai/codex@${CODEX_VERSION}" \
      "@agentclientprotocol/codex-acp@${CODEX_ACP_VERSION}" \
      "opencode-ai@${OPENCODE_VERSION}" \
      "@google/gemini-cli@${GEMINI_VERSION}" \
      "@playwright/mcp@${PLAYWRIGHT_MCP_VERSION}" && \
    npm install --global --ignore-scripts \
      "@earendil-works/pi-coding-agent@${PI_VERSION}" \
      "pi-acp@${PI_ACP_VERSION}" && \
    npm install --ignore-scripts --prefix /opt/pi-mcp-adapter "pi-mcp-adapter@${PI_MCP_ADAPTER_VERSION}" && \
    npm cache clean --force && \
    rm -rf /root/.npm /tmp/*

COPY deployment-operator/dockerfiles/devbox/patches/ /tmp/patches/
RUN node /tmp/patches/codex-acp-unsandboxed.mjs "$(npm root --global)/@agentclientprotocol/codex-acp/dist/index.js" && \
    rm -rf /tmp/patches

# Pin node-based launchers to this Node, so a repository's mise-managed Node
# (first on PATH) never runs the harnesses.
RUN cd /usr/local/bin && \
    for bin in claude claude-agent-acp codex codex-acp opencode gemini pi pi-acp playwright-mcp; do \
      target="$(readlink -f "${bin}")"; \
      if head -c 64 "${target}" | grep -q '^#!/usr/bin/env node'; then \
        rm "${bin}"; \
        printf '#!/bin/sh\nexec /usr/local/bin/node %s "$@"\n' "${target}" > "${bin}"; \
        chmod 0755 "${bin}"; \
      fi; \
    done && \
    find /usr/local/bin -xtype l -delete

RUN claude --version && claude-agent-acp --version && \
    codex --version && codex-acp --version && \
    opencode --version && gemini --version && \
    pi --version && pi-acp --version && \
    playwright-mcp --version

# ---------------------------------------------------------------------------
# devbox-minimal
# ---------------------------------------------------------------------------
FROM ${DEBIAN_IMAGE} AS minimal

ARG TARGETARCH
ARG VERSION=dev
ARG CLAUDE_VERSION
ARG CLAUDE_ACP_VERSION
ARG CODEX_VERSION
ARG CODEX_ACP_VERSION
ARG OPENCODE_VERSION
ARG GEMINI_VERSION
ARG PI_VERSION
ARG PI_ACP_VERSION
ARG PLAYWRIGHT_MCP_VERSION
ARG NODE_VERSION

# renovate: datasource=github-releases depName=cli/cli
ARG GH_VERSION=2.104.0
# renovate: datasource=gitlab-releases depName=gitlab-org/cli
ARG GLAB_VERSION=1.130.0
# renovate: datasource=github-releases depName=jdx/mise
ARG MISE_VERSION=2026.11.8
# oh-my-zsh has no releases; pinned by hand to a master commit of github.com/ohmyzsh/ohmyzsh.
ARG OH_MY_ZSH_COMMIT=c0140703a53eb0d22be44f7bac318d0baacc927c

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# hadolint ignore=DL3008
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      bash zsh tmux vim nano less sudo procps psmisc file \
      ca-certificates curl gnupg openssh-client \
      git git-lfs ripgrep fd-find jq \
      build-essential pkg-config \
      unzip zip xz-utils bzip2 tzdata \
      libatomic1 \
      chromium xvfb xauth x11vnc \
      fonts-liberation fonts-dejavu-core fonts-noto-color-emoji && \
    ln -s /usr/bin/fdfind /usr/local/bin/fd && \
    git lfs install --system && \
    rm -rf /var/lib/apt/lists/*

# gh, glab and mise from their releases, checksum-verified.
RUN set -eux; \
    tmp="$(mktemp -d)"; cd "${tmp}"; \
    gh="gh_${GH_VERSION}_linux_${TARGETARCH}"; \
    curl -fsSLO "https://github.com/cli/cli/releases/download/v${GH_VERSION}/${gh}.tar.gz"; \
    curl -fsSL "https://github.com/cli/cli/releases/download/v${GH_VERSION}/gh_${GH_VERSION}_checksums.txt" | grep " ${gh}.tar.gz\$" | sha256sum -c -; \
    tar -xzf "${gh}.tar.gz"; install -m 0755 "${gh}/bin/gh" /usr/local/bin/gh; \
    glab="glab_${GLAB_VERSION}_linux_${TARGETARCH}.tar.gz"; \
    curl -fsSLO "https://gitlab.com/gitlab-org/cli/-/releases/v${GLAB_VERSION}/downloads/${glab}"; \
    curl -fsSL "https://gitlab.com/gitlab-org/cli/-/releases/v${GLAB_VERSION}/downloads/checksums.txt" | grep " ${glab}\$" | sha256sum -c -; \
    mkdir glab; tar -xzf "${glab}" -C glab; install -m 0755 glab/bin/glab /usr/local/bin/glab; \
    case "${TARGETARCH}" in amd64) mise_arch=x64 ;; arm64) mise_arch=arm64 ;; *) exit 1 ;; esac; \
    mise="mise-v${MISE_VERSION}-linux-${mise_arch}"; \
    curl -fsSLO "https://github.com/jdx/mise/releases/download/v${MISE_VERSION}/${mise}"; \
    curl -fsSL "https://github.com/jdx/mise/releases/download/v${MISE_VERSION}/SHASUMS256.txt" | grep " ./${mise}\$\| ${mise}\$" | sed 's# \./# #' | sha256sum -c -; \
    install -m 0755 "${mise}" /usr/local/bin/mise; \
    cd /; rm -rf "${tmp}"; \
    gh --version; glab --version; mise --version

# oh-my-zsh for the terminals, system-wide since the home is the workspace volume. Fetching by commit makes git
# verify the content; the skel .zshrc loads it with updates off and its cache under the home.
RUN set -eux; \
    git init --quiet /usr/share/oh-my-zsh; \
    git -C /usr/share/oh-my-zsh fetch --quiet --depth 1 https://github.com/ohmyzsh/ohmyzsh.git "${OH_MY_ZSH_COMMIT}"; \
    git -C /usr/share/oh-my-zsh checkout --quiet FETCH_HEAD; \
    rm -rf /usr/share/oh-my-zsh/.git; \
    chmod -R a+rX,go-w /usr/share/oh-my-zsh

COPY --from=harnesses /usr/local/ /usr/local/
COPY --from=harnesses /opt/pi-mcp-adapter /opt/pi-mcp-adapter
COPY --from=daemon /out/devbox-daemon /usr/local/bin/devbox-daemon
COPY deployment-operator/dockerfiles/devbox/rootfs/minimal/ /

# The dev user's home is the workspace volume, so nothing is written under it
# here; the daemon seeds it from /etc/devbox/skel on first boot.
RUN groupadd --gid 1000 dev && \
    useradd --uid 1000 --gid 1000 --no-create-home --home-dir /home/dev --shell /bin/bash dev && \
    install -d -o 1000 -g 1000 -m 0755 /home/dev && \
    chmod 0440 /etc/sudoers.d/dev && visudo -cf /etc/sudoers.d/dev && \
    chmod -R a+rX /etc/devbox /usr/local/lib/devbox && \
    install -d -o 1000 -g 1000 -m 0755 /var/lib/devbox /var/lib/devbox/trust && \
    ln -s /etc/ssl/certs/ca-certificates.crt /var/lib/devbox/trust/ca-bundle.pem && \
    chown -h 1000:1000 /var/lib/devbox/trust/ca-bundle.pem && \
    install -d -o 1000 -g 1000 -m 0755 /run/plural /run/plural/identity && \
    install -d -o 1000 -g 1000 -m 0700 /run/plural/agent-auth && \
    install -d -m 1777 /tmp/.X11-unix && \
    jq -n \
      --arg contract v1 --arg flavor minimal --arg daemon "${VERSION}" --arg node "${NODE_VERSION}" \
      --arg claude "${CLAUDE_VERSION}" --arg claudeAcp "${CLAUDE_ACP_VERSION}" \
      --arg codex "${CODEX_VERSION}" --arg codexAcp "${CODEX_ACP_VERSION}" \
      --arg opencode "${OPENCODE_VERSION}" --arg gemini "${GEMINI_VERSION}" \
      --arg pi "${PI_VERSION}" --arg piAcp "${PI_ACP_VERSION}" --arg playwrightMcp "${PLAYWRIGHT_MCP_VERSION}" \
      '{contract: $contract, flavor: $flavor, daemonVersion: $daemon, node: $node, \
        playwrightMcp: "playwright-mcp", playwrightMcpVersion: $playwrightMcp, \
        agents: { \
          claude:   {command: "claude",   version: $claude,   acp: {command: "claude-agent-acp", version: $claudeAcp}}, \
          codex:    {command: "codex",    version: $codex,    acp: {command: "codex-acp", version: $codexAcp}}, \
          opencode: {command: "opencode", version: $opencode, acp: {command: "opencode", args: ["acp"]}}, \
          gemini:   {command: "gemini",   version: $gemini,   acp: {command: "gemini", args: ["--acp"]}}, \
          pi:       {command: "pi",       version: $pi,       acp: {command: "pi-acp", version: $piAcp}} \
        }}' > /etc/devbox/image.json

LABEL sh.plural.devbox/contract="v1" \
      sh.plural.devbox/daemon-version="${VERSION}" \
      sh.plural.devbox/flavor="minimal"

ENV HOME=/home/dev \
    USER=dev \
    SHELL=/bin/bash \
    DEVBOX_SHELL=/bin/zsh \
    LANG=C.UTF-8 \
    LC_ALL=C.UTF-8 \
    PATH=/home/dev/.local/share/mise/shims:/home/dev/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
    DEVBOX_CONTRACT=v1 \
    DEVBOX_SKEL_DIR=/etc/devbox/skel \
    DEVBOX_TRUST_DIR=/var/lib/devbox/trust \
    DEVBOX_IDENTITY_DIR=/run/plural/identity \
    DEVBOX_CHROMIUM=/usr/bin/chromium \
    DISPLAY=:99 \
    NODE_PATH=/usr/local/lib/node_modules \
    NPM_CONFIG_PREFIX=/home/dev/.local \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    CODEX_PATH=/usr/local/bin/codex \
    PI_MCP_ADAPTER_DIR=/opt/pi-mcp-adapter \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    MISE_TRUSTED_CONFIG_PATHS=/home/dev \
    MISE_YES=1 \
    SSL_CERT_FILE=/var/lib/devbox/trust/ca-bundle.pem \
    NODE_EXTRA_CA_CERTS=/var/lib/devbox/trust/ca-bundle.pem \
    REQUESTS_CA_BUNDLE=/var/lib/devbox/trust/ca-bundle.pem \
    CURL_CA_BUNDLE=/var/lib/devbox/trust/ca-bundle.pem \
    GIT_SSL_CAINFO=/var/lib/devbox/trust/ca-bundle.pem \
    PIP_CERT=/var/lib/devbox/trust/ca-bundle.pem \
    AWS_CA_BUNDLE=/var/lib/devbox/trust/ca-bundle.pem \
    CARGO_HTTP_CAINFO=/var/lib/devbox/trust/ca-bundle.pem \
    CLOUDSDK_CORE_CUSTOM_CA_CERTS_FILE=/var/lib/devbox/trust/ca-bundle.pem

USER 1000:1000
WORKDIR /home/dev
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -fsS http://127.0.0.1:80/readyz || exit 1

# Custom images must not override ENTRYPOINT (image contract v1).
ENTRYPOINT ["/usr/local/bin/devbox-daemon"]
