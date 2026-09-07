ARG NODE_IMAGE_TAG=24
ARG NODE_IMAGE=node:${NODE_IMAGE_TAG}-slim
ARG AGENT_VERSION=1.10.0
ARG CODEX_VERSION=0.153.4

ARG AGENT_HARNESS_BASE_IMAGE_TAG=latest
ARG AGENT_HARNESS_BASE_IMAGE_REPO=ghcr.io/pluralsh/agent-harness-base
ARG AGENT_HARNESS_BASE_IMAGE=$AGENT_HARNESS_BASE_IMAGE_REPO:$AGENT_HARNESS_BASE_IMAGE_TAG

# Stage 1: Install pinned Codex ACP adapter and native Codex binaries.
FROM $NODE_IMAGE AS node

USER root

ARG AGENT_VERSION
ARG CODEX_VERSION
RUN npm install -g "@agentclientprotocol/codex-acp@$AGENT_VERSION" "@openai/codex@$CODEX_VERSION"

# Verify installation
RUN codex-acp --version

# Stage 2: Copy Codex ACP adapter and native Codex into agent-harness base
FROM $AGENT_HARNESS_BASE_IMAGE AS final

COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules

# Copy the Node.js runtime needed by the adapter.
COPY --from=node /usr/local/bin/node /usr/local/bin/node

# Ensure proper ownership for nonroot user
USER root
# COPY dereferences npm launcher symlinks, so recreate them in the final image.
RUN ln -s ../lib/node_modules/@agentclientprotocol/codex-acp/dist/index.js /usr/local/bin/codex-acp && \
    ln -s ../lib/node_modules/@openai/codex/bin/codex.js /usr/local/bin/codex && \
    chown -R 65532:65532 /usr/local/bin/codex-acp /usr/local/bin/codex /usr/local/lib/node_modules /usr/local/bin/node

ENV CODEX_PATH=/usr/local/bin/codex

# Switch back to nonroot user
USER 65532:65532

# The entrypoint remains the agent-harness binary
# The agent-harness launches codex-acp directly.
