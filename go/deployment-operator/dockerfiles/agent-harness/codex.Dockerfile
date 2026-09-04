ARG NODE_IMAGE_TAG=24
ARG NODE_IMAGE=node:${NODE_IMAGE_TAG}-slim
ARG AGENT_VERSION=1.9.0

ARG AGENT_HARNESS_BASE_IMAGE_TAG=latest
ARG AGENT_HARNESS_BASE_IMAGE_REPO=ghcr.io/pluralsh/agent-harness-base
ARG AGENT_HARNESS_BASE_IMAGE=$AGENT_HARNESS_BASE_IMAGE_REPO:$AGENT_HARNESS_BASE_IMAGE_TAG

# Stage 1: Install the Codex ACP adapter and its compatible Codex dependency
FROM $NODE_IMAGE AS node

USER root

ARG AGENT_VERSION
RUN npm install -g "@agentclientprotocol/codex-acp@$AGENT_VERSION"

# Verify installation
RUN codex-acp --version

# Stage 2: Copy the Codex ACP adapter into agent-harness base
FROM $AGENT_HARNESS_BASE_IMAGE AS final

COPY --from=node /usr/local/bin/codex-acp /usr/local/bin/codex-acp
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules

# Copy the Node.js runtime needed by the adapter.
COPY --from=node /usr/local/bin/node /usr/local/bin/node

# Ensure proper ownership for nonroot user
USER root
RUN chown -R 65532:65532 /usr/local/bin/codex-acp /usr/local/lib/node_modules /usr/local/bin/node

# Switch back to nonroot user
USER 65532:65532

# The entrypoint remains the agent-harness binary
# The agent-harness launches codex-acp directly.
