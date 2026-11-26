# syntax=docker/dockerfile:1.10
#
# ghcr.io/pluralsh/devbox-runtime-core: the plural-runtime sidecar of every devbox actor. It holds devbox-daemon,
# the coding agents with their ACP adapters, Playwright MCP and the Node they run on, and the installer that
# copies the ones a runner uses into the home volume, where the devbox container (the environment image) runs
# them from. The deployment operator pins this image by digest, so daemon and agent updates reach every runner
# with an operator release, whatever environment image the runner uses. Build context: ./go
#
#   docker build -f deployment-operator/dockerfiles/devbox/runtime-core.Dockerfile go
#
# The build is reproducible: the same sources give the same digest, so a release that doesn't change the runtime
# doesn't roll a new template revision and cold-boot every instance. Keep it that way:
#   - nothing here may depend on the build time, the commit or the release (VERSION is only set the first time
#     a source hash is built, see runtime-src-hash.sh and the CD workflow)
#   - build with SOURCE_DATE_EPOCH=0 and the image output's rewrite-timestamp=true
#   - GO_IMAGE and NODE_IMAGE are pinned by digest, the agents by version below, and their dependencies to
#     what existed a day after each version's release (runtime/assemble.sh, which explains the limits)
#
# The payload is one directory per component (runtime/components.json) plus the manifest that lists them. The
# agents are the upstream binaries and packages, unmodified, so the environment image must have glibc 2.28 or
# newer (https://docs.plural.sh/plural-features/devboxes/environment-images). Everything a runner installs lands
# in each of its instances' home volume and snapshots, so the components stay trimmed to what runs.

ARG GO_IMAGE=golang:1.27.2-trixie@sha256:47667934874913a449b96faa7ef4777fa285d9ec29126ee80ed61c45b7cccf0e
# renovate: datasource=docker depName=node
ARG NODE_VERSION=24.11.1
ARG NODE_IMAGE=node:${NODE_VERSION}-trixie-slim@sha256:4623e8ac1eb5f35b0a91b85424283c1b97a416a77375dfa6a2e9bfb0b2c351c9

# The agents, their ACP adapters and Playwright MCP: the agent-run images' pins (dockerfiles/agent-harness/*);
# test.sh fails if they drift.
# renovate: datasource=npm depName=@anthropic-ai/claude-code
ARG CLAUDE_VERSION=2.1.236
# renovate: datasource=npm depName=@agentclientprotocol/claude-agent-acp
ARG CLAUDE_ACP_VERSION=0.75.1
# renovate: datasource=npm depName=@openai/codex
ARG CODEX_VERSION=0.153.4
# renovate: datasource=npm depName=@agentclientprotocol/codex-acp
ARG CODEX_ACP_VERSION=1.10.0
# renovate: datasource=npm depName=opencode-ai
ARG OPENCODE_VERSION=1.18.23
# renovate: datasource=npm depName=@google/gemini-cli
ARG GEMINI_VERSION=0.44.1
# renovate: datasource=npm depName=@earendil-works/pi-coding-agent
ARG PI_VERSION=0.84.1
# renovate: datasource=npm depName=pi-acp
ARG PI_ACP_VERSION=0.0.33
# renovate: datasource=npm depName=pi-mcp-adapter
ARG PI_MCP_ADAPTER_VERSION=2.21.2
# renovate: datasource=npm depName=@playwright/mcp
ARG PLAYWRIGHT_MCP_VERSION=0.0.85
# Bundles the ACP adapters; not shipped.
# renovate: datasource=npm depName=esbuild
ARG ESBUILD_VERSION=0.28.2

FROM --platform=${BUILDPLATFORM} ${GO_IMAGE} AS build

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

# -buildid= and -trimpath keep the build host out of the binaries. devbox-runtime-manifest only runs here, on
# the build platform.
RUN --mount=type=cache,target=/root/.cache/go-build,id=devbox-runtime-${TARGETARCH} \
    GOCACHE=/root/.cache/go-build CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} GOFLAGS=-buildvcs=false \
    go build -trimpath \
      -ldflags="-s -w -buildid= -X main.version=${VERSION}" \
      -o /out/ \
      ./cmd/devbox-daemon ./cmd/devbox-runtime-installer && \
    CGO_ENABLED=0 GOFLAGS=-buildvcs=false go build -trimpath -o /out/host/ ./cmd/devbox-runtime-manifest

# The agents, installed for the target platform by the build platform's npm.
FROM --platform=${BUILDPLATFORM} ${NODE_IMAGE} AS agents

ARG TARGETARCH
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
ARG ESBUILD_VERSION

ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

COPY deployment-operator/dockerfiles/devbox/runtime/assemble.sh deployment-operator/dockerfiles/devbox/runtime/components.json /src/
COPY deployment-operator/dockerfiles/devbox/patches/ /src/patches/
RUN --mount=type=cache,target=/root/.npm,id=devbox-runtime-npm \
    PATCHES=/src/patches \
    sh /src/assemble.sh /src/components.json /out/components /out/versions "${TARGETARCH}" \
      claude="${CLAUDE_VERSION}" claude-acp="${CLAUDE_ACP_VERSION}" \
      codex="${CODEX_VERSION}" codex-acp="${CODEX_ACP_VERSION}" \
      opencode="${OPENCODE_VERSION}" gemini="${GEMINI_VERSION}" \
      pi="${PI_VERSION}" pi-acp="${PI_ACP_VERSION}" pi-mcp-adapter="${PI_MCP_ADAPTER_VERSION}" \
      playwright-mcp="${PLAYWRIGHT_MCP_VERSION}"

# The target platform's Node, only copied from.
FROM ${NODE_IMAGE} AS node

FROM --platform=${BUILDPLATFORM} ${GO_IMAGE} AS payload

ARG VERSION=dev
ARG NODE_VERSION

COPY --from=agents /out/components /payload/components
COPY --from=agents /out/versions /src/versions
COPY --from=node --chmod=0755 /usr/local/bin/node /payload/components/node/bin/node
COPY --from=build --chmod=0755 /out/devbox-daemon /payload/components/daemon/bin/devbox-daemon
COPY --from=build /out/host/devbox-runtime-manifest /usr/local/bin/devbox-runtime-manifest
COPY deployment-operator/dockerfiles/devbox/runtime/components.json /src/components.json
RUN devbox-runtime-manifest --spec /src/components.json --versions /src/versions --components /payload/components \
      --daemon "${VERSION}" --node "${NODE_VERSION}" --out /payload/manifest.json

FROM scratch

ARG VERSION=dev
ARG SRC_HASH=unknown

COPY --from=build --chmod=0755 /out/devbox-runtime-installer /devbox-runtime-installer
COPY --from=payload /payload /payload

LABEL sh.plural.devbox/runtime-contract="v1" \
      sh.plural.devbox/daemon-version="${VERSION}" \
      sh.plural.devbox/src-hash="${SRC_HASH}"

# Root, to write into a home volume owned by the environment image's user. The operator grants only the
# capabilities that needs.
ENTRYPOINT ["/devbox-runtime-installer"]
