ARG NODE_IMAGE_TAG=24
ARG NODE_IMAGE=node:${NODE_IMAGE_TAG}-slim
ARG AGENT_VERSION=0.58.0

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

# Gemini ACP replays loaded-session history asynchronously. Make the session
# load response wait for that replay, so clients can safely begin a new turn.
# Fail the image build if the pinned upstream artifact changes this call site.
RUN node -e "\
  const fs = require('fs'); \
  const path = require('path'); \
  const root = '/opt/gemini-cli/bundle'; \
  const needle = 'session.streamHistory(sessionData.messages);'; \
  const replacement = 'await session.streamHistory(sessionData.messages);'; \
  const files = []; \
  const visit = directory => { \
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) { \
      const file = path.join(directory, entry.name); \
      if (entry.isDirectory()) visit(file); \
      else if (entry.isFile() && file.endsWith('.js')) files.push(file); \
    } \
  }; \
  visit(root); \
  const matches = files.filter(file => fs.readFileSync(file, 'utf8').includes(needle)); \
  if (matches.length !== 3) throw new Error('expected three Gemini history calls, found ' + matches.length); \
  for (const file of matches) { \
    const source = fs.readFileSync(file, 'utf8'); \
    if (source.split(needle).length - 1 !== 1) throw new Error('unexpected Gemini history call count in ' + file); \
    fs.writeFileSync(file, source.replace(needle, replacement)); \
    const patched = fs.readFileSync(file, 'utf8'); \
    if (patched.split(replacement).length - 1 !== 1 || patched.replace(replacement, '').includes(needle)) { \
      throw new Error('Gemini history patch verification failed in ' + file); \
    } \
  }"

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
