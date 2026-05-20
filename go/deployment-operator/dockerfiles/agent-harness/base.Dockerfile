FROM golang:1.26.3-alpine AS builder

ARG TARGETARCH
ARG TARGETOS
ARG VERSION

WORKDIR /workspace

# Copy required local modules referenced by go.mod replace directives
COPY /client /workspace/client
COPY /polly /workspace/polly

WORKDIR /workspace/deployment-operator

# Retrieve application dependencies
COPY deployment-operator/go.* ./
RUN go mod download

COPY deployment-operator/cmd/ ./cmd
COPY deployment-operator/pkg ./pkg
COPY deployment-operator/internal ./internal
COPY deployment-operator/api ./api

# Build agent-harness binary
RUN CGO_ENABLED=0 \
    GOOS=${TARGETOS} \
    GOARCH=${TARGETARCH} \
    go build \
    -trimpath \
    -ldflags="-s -w -X github.com/pluralsh/console/go/deployment-operator/pkg/agentrun-harness/environment.Version=${VERSION}" \
    -o /agent-harness \
    cmd/agent-harness/main.go

# Build agent MCP server binary
RUN CGO_ENABLED=0 \
    GOOS=${TARGETOS} \
    GOARCH=${TARGETARCH} \
    go build \
    -trimpath \
    -ldflags="-s -w -X github.com/pluralsh/console/go/deployment-operator/cmd/mcpserver/agent.Version=${VERSION}" \
    -o /agent-mcpserver \
    cmd/mcpserver/agent/main.go

# Build agent bootstrap binary
RUN CGO_ENABLED=0 \
    GOOS=${TARGETOS} \
    GOARCH=${TARGETARCH} \
    go build \
    -trimpath \
    -ldflags="-s -w" \
    -o /agent-bootstrap \
    cmd/agent-bootstrap/main.go

FROM debian:13-slim

RUN apt update && apt install -y \
    ca-certificates \
    curl \
    gnupg \
    git \
    jq \
    make \
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
    apt install -y docker-ce-cli docker-compose-plugin ripgrep && \
    ln -s /usr/libexec/docker/cli-plugins/docker-compose /usr/bin/docker-compose && \
    rm -rf /var/lib/apt/lists/*

    # Ensure system paths are explicitly set
    ENV PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH}"

    # Copy binaries before switching user to ensure proper permissions
COPY --from=builder /agent-harness /agent-harness
COPY --from=builder /agent-mcpserver /agent-mcpserver
COPY --from=builder /agent-bootstrap /agent-bootstrap

# Create the nonroot user with UID 65532
RUN groupadd -g 65532 nonroot && \
    useradd -u 65532 -g 65532 -m -s /bin/bash nonroot

WORKDIR /plural

COPY deployment-operator/dockerfiles/agent-harness/system /plural/system

RUN mkdir -p /plural/.opencode && \
    mkdir -p /plural/.claude && \
    mkdir -p /plural/.gemini && \
    mkdir -p /plural/.codex

RUN chown -R 65532:65532 /plural

# Switch to the nonroot user
USER 65532:65532

WORKDIR /plural

ENTRYPOINT ["/agent-harness", "--working-dir=/plural"]
