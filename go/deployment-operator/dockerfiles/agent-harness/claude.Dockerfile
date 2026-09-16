ARG AGENT_VERSION=2.1.236
ARG ACP_VERSION=0.75.1

ARG AGENT_HARNESS_BASE_IMAGE_TAG=latest
ARG AGENT_HARNESS_BASE_IMAGE_REPO=ghcr.io/pluralsh/agent-harness-base
ARG AGENT_HARNESS_BASE_IMAGE=$AGENT_HARNESS_BASE_IMAGE_REPO:$AGENT_HARNESS_BASE_IMAGE_TAG

# Stage 1: Install Claude Code and its ACP adapter together.
FROM node:26-bookworm-slim AS claude-install

ARG AGENT_VERSION
ARG ACP_VERSION

RUN npm install --global \
      "@anthropic-ai/claude-code@${AGENT_VERSION}" \
      "@agentclientprotocol/claude-agent-acp@${ACP_VERSION}" && \
    claude --version && \
    claude-agent-acp --version

# Stage 2: Copy Claude and its ACP adapter into agent-harness base.
FROM $AGENT_HARNESS_BASE_IMAGE AS final

COPY --from=claude-install /usr/local/lib/node_modules /usr/local/lib/node_modules
COPY --from=claude-install /usr/local/bin/node /usr/local/bin/node

USER root
# The Node runtime from the install stage links libatomic dynamically, while
# the minimal harness base does not include it.
RUN apt-get update && apt-get install -y --no-install-recommends libatomic1 && \
    rm -rf /var/lib/apt/lists/*

# Recreate npm launcher symlinks after copying their packages.
RUN ln -s ../lib/node_modules/@anthropic-ai/claude-code/bin/claude.exe /usr/local/bin/claude && \
    ln -s ../lib/node_modules/@agentclientprotocol/claude-agent-acp/dist/index.js /usr/local/bin/claude-agent-acp && \
    chown -R 65532:65532 /usr/local/bin/claude /usr/local/bin/claude-agent-acp /usr/local/bin/node /usr/local/lib/node_modules

USER 65532:65532

# Verify the binary runs in the final image (same user and PATH as runtime)
RUN claude --version
RUN claude-agent-acp --version

# The entrypoint remains the agent-harness binary
# The agent-harness launches claude-agent-acp, which uses the pinned Claude CLI.
