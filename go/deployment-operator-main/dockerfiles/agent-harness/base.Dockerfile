FROM golang:1.26.2-alpine AS builder

ARG TARGETARCH
ARG TARGETOS  
ARG VERSION

WORKDIR /workspace

# Retrieve application dependencies
COPY go.* ./
RUN go mod download

COPY cmd/ ./cmd
COPY pkg ./pkg
COPY internal ./internal
COPY api ./api

# Build agent-harness binary
RUN CGO_ENABLED=0 \
    GOOS=${TARGETOS} \
    GOARCH=${TARGETARCH} \
    go build \
    -trimpath \
    -ldflags="-s -w -X github.com/pluralsh/deployment-operator/pkg/agentrun-harness/environment.Version=${VERSION}" \
    -o /agent-harness \
    cmd/agent-harness/main.go

# Build the MCP server binary
RUN CGO_ENABLED=0 \
    GOOS=${TARGETOS} \
    GOARCH=${TARGETARCH} \
    go build \
    -trimpath \
    -ldflags="-s -w -X github.com/pluralsh/deployment-operator/cmd/mcpserver/agent.Version=${VERSION}" \
    -o /mcpserver \
    cmd/mcpserver/agent/main.go

FROM debian:13-slim

RUN apt update && apt install -y \
    ca-certificates \
    curl \
    gnupg \
    git \
    jq \
    tar

# Install Docker CLI + Compose (no daemon)
RUN install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/debian/gpg | \
      gpg --dearmor -o /etc/apt/keyrings/docker.gpg && \
    chmod a+r /etc/apt/keyrings/docker.gpg && \
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
      https://download.docker.com/linux/debian bookworm stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null && \
    apt update && \
    apt install -y docker-ce-cli docker-compose-plugin && \
    ln -s /usr/libexec/docker/cli-plugins/docker-compose /usr/bin/docker-compose && \
    rm -rf /var/lib/apt/lists/*

    # Ensure system paths are explicitly set
    ENV PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH}"

    # Copy binaries before switching user to ensure proper permissions
COPY --from=builder /agent-harness /agent-harness
COPY --from=builder /mcpserver /usr/local/bin/mcpserver

# Create the nonroot user with UID 65532
RUN groupadd -g 65532 nonroot && \
    useradd -u 65532 -g 65532 -m -s /bin/bash nonroot

WORKDIR /plural

COPY dockerfiles/agent-harness/system /plural/system

RUN mkdir -p /plural/.opencode && \
    mkdir -p /plural/.claude && \
    mkdir -p /plural/.gemini && \
    mkdir -p /plural/.codex

RUN printf "#!/bin/sh\necho \${GIT_ACCESS_TOKEN}" > /plural/.git-askpass && \
    chmod +x /plural/.git-askpass && \
    git config --global core.askPass /plural/.git-askpass && \
    chown -R 65532:65532 /plural

# Switch to the nonroot user
USER 65532:65532

WORKDIR /plural

ENTRYPOINT ["/bin/sh", "-c", "GIT_ASKPASS=/plural/.git-askpass /agent-harness --working-dir=/plural \"$@\"", "--"]