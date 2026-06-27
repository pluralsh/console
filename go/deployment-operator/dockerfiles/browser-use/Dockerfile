# browser-use sidecar for agent runtimes
#
# Runs `browser-use --mcp` inside the agent pod, connecting over CDP to the
# browser sidecar (chrome/chromium/puppeteer via browserless) on
# localhost:3000 and exposing the typed browser-use MCP tool surface
# (open, state, click, type, screenshot, keys, eval, ...) on localhost:8082.
#
# Provisioned by the deployment-operator's AgentRun controller as an init
# container with restartPolicy: Always when AgentRuntime.spec.browser.enabled
# is true. See go/deployment-operator/internal/controller/agentrun_pod.go.

FROM python:3.12-slim AS base

ARG BROWSER_USE_VERSION=0.1.0

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        tini \
    && rm -rf /var/lib/apt/lists/*

# Install browser-use into an isolated location so the runtime user can
# write to its own caches without escalating.
RUN pip install --no-cache-dir "browser-use==${BROWSER_USE_VERSION}"

# Match the rest of the agent-harness pods: run as UID 65532 (nonroot)
# so the pod-level securityContext (RunAsNonRoot, FSGroup) lines up.
RUN groupadd -g 65532 nonroot \
    && useradd  -u 65532 -g 65532 -m -s /bin/bash nonroot \
    && mkdir -p /home/nonroot/.browser-use \
    && chown -R 65532:65532 /home/nonroot

USER 65532:65532
WORKDIR /home/nonroot

ENV BROWSER_USE_HOME=/home/nonroot/.browser-use

# Bind to all interfaces inside the pod's loopback shared netns is what the
# agent CLIs reach; --port is the MCP HTTP listener.
EXPOSE 8082

ENTRYPOINT ["/usr/bin/tini", "--", "browser-use"]
CMD ["--mcp", "--cdp-url", "http://127.0.0.1:3000", "--port", "8082"]
