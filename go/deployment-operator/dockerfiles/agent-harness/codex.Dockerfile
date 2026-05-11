ARG NODE_IMAGE_TAG=24
ARG NODE_IMAGE=node:${NODE_IMAGE_TAG}-slim
ARG AGENT_VERSION=0.104.0

ARG AGENT_HARNESS_BASE_IMAGE_TAG=latest
ARG AGENT_HARNESS_BASE_IMAGE_REPO=ghcr.io/pluralsh/agent-harness-base
ARG AGENT_HARNESS_BASE_IMAGE=$AGENT_HARNESS_BASE_IMAGE_REPO:$AGENT_HARNESS_BASE_IMAGE_TAG

# Stage 1: Install Codex CLI from npm in the Node image and flatten dependencies
FROM $NODE_IMAGE AS node

USER root

# Install codex CLI globally using npm
RUN npm install -g @openai/codex@0.104.0

# The codex script uses createRequire(import.meta.url) anchored at /usr/local/bin/codex.
# Node's module resolution walks up from /usr/local/bin/ and won't find node_modules
# until it reaches a NODE_PATH entry. The native package (@openai/codex-linux-x64)
# is installed nested inside @openai/codex/node_modules/ — hard-copy it up to the
# top-level @openai scope so NODE_PATH=/usr/local/lib/node_modules can find it.
RUN NESTED="/usr/local/lib/node_modules/@openai/codex/node_modules/@openai" && \
    if [ -d "$NESTED" ]; then \
      for pkg in "$NESTED"/codex-*; do \
        pkgname=$(basename "$pkg"); \
        cp -rL "$pkg" "/usr/local/lib/node_modules/@openai/$pkgname"; \
      done; \
    fi

# Verify installation
RUN codex --version

# Stage 2: Copy codex CLI into agent-harness base
FROM $AGENT_HARNESS_BASE_IMAGE AS final

# Copy the codex CLI from the Node.js image
COPY --from=node /usr/local/bin/codex /usr/local/bin/codex
# Copy the entire @openai scope — now contains both @openai/codex (with its
# nested node_modules) and the promoted top-level @openai/codex-linux-x64 copy
COPY --from=node /usr/local/lib/node_modules/@openai /usr/local/lib/node_modules/@openai

# Copy Node.js runtime (needed to run the CLI)
COPY --from=node /usr/local/bin/node /usr/local/bin/node

# NODE_PATH lets require.resolve() in the codex ESM script find
# /usr/local/lib/node_modules/@openai/codex-linux-x64 at runtime
ENV NODE_PATH=/usr/local/lib/node_modules

# Ensure proper ownership for nonroot user
USER root
RUN chown -R 65532:65532 /usr/local/bin/codex /usr/local/lib/node_modules/@openai /usr/local/bin/node

# Switch back to nonroot user
USER 65532:65532

# The entrypoint remains the agent-harness binary
# The agent-harness will call the codex CLI as needed
