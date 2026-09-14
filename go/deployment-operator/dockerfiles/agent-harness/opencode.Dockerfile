ARG NODE_IMAGE_TAG=24
ARG NODE_IMAGE=node:${NODE_IMAGE_TAG}-slim
ARG AGENT_VERSION=1.17.3

ARG AGENT_HARNESS_BASE_IMAGE_TAG=latest
ARG AGENT_HARNESS_BASE_IMAGE_REPO=ghcr.io/pluralsh/agent-harness-base
ARG AGENT_HARNESS_BASE_IMAGE=$AGENT_HARNESS_BASE_IMAGE_REPO:$AGENT_HARNESS_BASE_IMAGE_TAG

# Stage 1: Install OpenCode CLI from npm in Chainguard Node image
FROM $NODE_IMAGE AS node

ARG AGENT_VERSION

# Switch to root temporarily to install global packages
USER root

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl unzip && \
    rm -rf /var/lib/apt/lists/*

# Install OpenCode CLI
RUN curl -fsSL https://opencode.ai/install -o /tmp/opencode-install.sh && \
    VERSION=$AGENT_VERSION bash /tmp/opencode-install.sh --version "$AGENT_VERSION" --no-modify-path && \
    rm /tmp/opencode-install.sh

# Verify installation
RUN /root/.opencode/bin/opencode --version

# Stage 2: Copy OpenCode CLI into agent-harness base
FROM $AGENT_HARNESS_BASE_IMAGE AS final

# Copy the OpenCode CLI from the Node.js image
COPY --from=node /root/.opencode/bin/opencode /usr/bin/opencode

# Ensure proper ownership for nonroot user
USER root
RUN mkdir -p /.local /.config /.cache
RUN chown -R 65532:65532 /usr/bin/opencode /.local /.config /.cache

# Switch back to nonroot user
USER 65532:65532

# The entrypoint remains the agent-harness binary
# The agent-harness will call the opencode CLI as needed
