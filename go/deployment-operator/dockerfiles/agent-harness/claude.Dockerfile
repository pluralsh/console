ARG NODE_IMAGE_TAG=24
ARG NODE_IMAGE=node:${NODE_IMAGE_TAG}-slim
ARG AGENT_VERSION=latest

ARG AGENT_HARNESS_BASE_IMAGE_TAG=latest
ARG AGENT_HARNESS_BASE_IMAGE_REPO=ghcr.io/pluralsh/agent-harness-base
ARG AGENT_HARNESS_BASE_IMAGE=$AGENT_HARNESS_BASE_IMAGE_REPO:$AGENT_HARNESS_BASE_IMAGE_TAG

# Stage 1: Install Claude CLI from npm in Chainguard Node image
FROM $NODE_IMAGE AS node

# Switch to root temporarily to install global packages
USER root

# Install claude CLI globally using npm
RUN npm install -g @anthropic-ai/claude-code@$AGENT_VERSION

# Verify installation
RUN claude --version

# Stage 2: Copy claude CLI into agent-harness base
FROM $AGENT_HARNESS_BASE_IMAGE AS final

# Copy the claude CLI from the Node.js image
COPY --from=node /usr/local/bin/claude /usr/local/bin/claude
COPY --from=node /usr/local/lib/node_modules/@anthropic-ai/claude-code /usr/local/lib/node_modules/@anthropic-ai/claude-code

# Copy Node.js runtime (needed to run the CLI)
COPY --from=node /usr/local/bin/node /usr/local/bin/node

# Ensure proper ownership for nonroot user
USER root
RUN chown -R 65532:65532 /usr/local/bin/claude /usr/local/lib/node_modules/@anthropic-ai/claude-code /usr/local/bin/node

# Switch back to nonroot user
USER 65532:65532

# The entrypoint remains the agent-harness binary
# The agent-harness will call the claude CLI as needed
