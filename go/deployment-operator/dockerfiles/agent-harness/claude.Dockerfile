ARG AGENT_VERSION=latest

ARG AGENT_HARNESS_BASE_IMAGE_TAG=latest
ARG AGENT_HARNESS_BASE_IMAGE_REPO=ghcr.io/pluralsh/agent-harness-base
ARG AGENT_HARNESS_BASE_IMAGE=$AGENT_HARNESS_BASE_IMAGE_REPO:$AGENT_HARNESS_BASE_IMAGE_TAG

# Stage 1: Install Claude Code native binary (no npm — postinstall is unreliable in CI)
FROM debian:13-slim AS claude-install

ARG AGENT_VERSION

RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates \
      curl \
    && arch="$(dpkg --print-architecture)" \
    && case "$arch" in \
      amd64) platform=linux-x64 ;; \
      arm64) platform=linux-arm64 ;; \
      *) echo "unsupported architecture: $arch" >&2; exit 1 ;; \
    esac \
    && if [ "$AGENT_VERSION" = "latest" ]; then \
      version="$(curl -fsSL https://downloads.claude.ai/claude-code-releases/latest)"; \
    else \
      version="$AGENT_VERSION"; \
    fi \
    && curl -fsSL \
      "https://downloads.claude.ai/claude-code-releases/${version}/${platform}/claude" \
      -o /usr/local/bin/claude \
    && chmod +x /usr/local/bin/claude \
    && /usr/local/bin/claude --version \
    && apt-get purge -y curl \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

# Stage 2: Copy claude binary into agent-harness base
FROM $AGENT_HARNESS_BASE_IMAGE AS final

COPY --from=claude-install /usr/local/bin/claude /usr/local/bin/claude

USER root
RUN chown 65532:65532 /usr/local/bin/claude

USER 65532:65532

# Verify the binary runs in the final image (same user and PATH as runtime)
RUN claude --version

# The entrypoint remains the agent-harness binary
# The agent-harness will call the claude CLI as needed
