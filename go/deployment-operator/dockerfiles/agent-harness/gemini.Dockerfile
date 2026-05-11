ARG NODE_IMAGE_TAG=24
ARG NODE_IMAGE=node:${NODE_IMAGE_TAG}-slim
ARG AGENT_VERSION=0.36.0

ARG AGENT_HARNESS_BASE_IMAGE_TAG=latest
ARG AGENT_HARNESS_BASE_IMAGE_REPO=ghcr.io/pluralsh/agent-harness-base
ARG AGENT_HARNESS_BASE_IMAGE=$AGENT_HARNESS_BASE_IMAGE_REPO:$AGENT_HARNESS_BASE_IMAGE_TAG

# Stage 1: Install Gemini CLI from npm in Node image
FROM $NODE_IMAGE AS node

# Re-declare ARGs after FROM so they are available in this stage
ARG AGENT_VERSION

USER root

# Install Gemini CLI globally using npm
RUN npm install -g @google/gemini-cli@$AGENT_VERSION

# Copy to a fixed, predictable path
RUN cp -r $(npm root -g)/@google/gemini-cli /opt/gemini-cli

# Resolve the actual bin entry point from package.json and save it
RUN node -e "\
  const pkg = require('/opt/gemini-cli/package.json'); \
  const bin = pkg.bin; \
  const rel = typeof bin === 'string' ? bin : (bin.gemini || bin['gemini-cli'] || Object.values(bin)[0]); \
  const abs = require('path').resolve('/opt/gemini-cli', rel); \
  process.stdout.write(abs);" > /opt/gemini-entry.txt && \
  echo "Gemini entry point: $(cat /opt/gemini-entry.txt)"

# Verify
RUN node $(cat /opt/gemini-entry.txt) --version

# Stage 2: Copy Gemini CLI into agent-harness base
FROM $AGENT_HARNESS_BASE_IMAGE AS final

# Copy the Gemini CLI module and resolved entry point from the Node.js image
COPY --from=node /opt/gemini-cli /opt/gemini-cli
COPY --from=node /opt/gemini-entry.txt /opt/gemini-entry.txt

# Copy Node.js runtime (needed to run the CLI)
COPY --from=node /usr/local/bin/node /usr/local/bin/node

# Create wrapper script using the resolved entry point and set ownership
USER root
RUN ENTRY=$(cat /opt/gemini-entry.txt) && \
    printf '#!/bin/sh\nexec /usr/local/bin/node %s "$@"\n' "$ENTRY" > /usr/local/bin/gemini && \
    chmod +x /usr/local/bin/gemini && \
    chown -R 65532:65532 /opt/gemini-cli /usr/local/bin/gemini /usr/local/bin/node

# Switch back to nonroot user
USER 65532:65532

# The entrypoint remains the agent-harness binary
# The agent-harness will call the gemini CLI as needed
