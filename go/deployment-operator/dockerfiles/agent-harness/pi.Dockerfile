ARG NODE_IMAGE_TAG=24
ARG NODE_IMAGE=node:${NODE_IMAGE_TAG}-slim
ARG AGENT_VERSION=0.84.1
ARG MCP_ADAPTER_VERSION=2.21.2

ARG AGENT_HARNESS_BASE_IMAGE_TAG=latest
ARG AGENT_HARNESS_BASE_IMAGE_REPO=ghcr.io/pluralsh/agent-harness-base
ARG AGENT_HARNESS_BASE_IMAGE=$AGENT_HARNESS_BASE_IMAGE_REPO:$AGENT_HARNESS_BASE_IMAGE_TAG

FROM $NODE_IMAGE AS node

ARG AGENT_VERSION
ARG MCP_ADAPTER_VERSION

USER root
RUN npm install -g --ignore-scripts @earendil-works/pi-coding-agent@${AGENT_VERSION} && \
    npm install --ignore-scripts --prefix /opt/pi-mcp-adapter pi-mcp-adapter@${MCP_ADAPTER_VERSION} && \
    pi --version

FROM $AGENT_HARNESS_BASE_IMAGE AS final

COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
COPY --from=node /opt/pi-mcp-adapter /opt/pi-mcp-adapter

ENV NODE_PATH=/usr/local/lib/node_modules

USER root
RUN ln -s ../lib/node_modules/@earendil-works/pi-coding-agent/dist/cli.js /usr/local/bin/pi && \
    chown -R 65532:65532 /usr/local/bin/node /usr/local/lib/node_modules /opt/pi-mcp-adapter
USER 65532:65532

# The base entrypoint execs /agent-harness as PID 1; verify that the active harness process remains alive.
HEALTHCHECK --interval=60s --timeout=10s --start-period=30s --retries=5 \
  CMD kill -0 1 || exit 1
