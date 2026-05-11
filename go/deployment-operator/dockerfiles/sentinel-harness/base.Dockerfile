FROM golang:1.26.2-alpine AS builder

ARG TARGETARCH
ARG TARGETOS  
ARG VERSION

WORKDIR /workspace

# Retrieve application dependencies
COPY go.* ./
RUN go mod download

COPY cmd/sentinel-harness ./cmd/sentinel-harness
COPY pkg ./pkg
COPY internal ./internal
COPY api ./api

# Build agent-harness binary
RUN CGO_ENABLED=0 \
    GOOS=${TARGETOS} \
    GOARCH=${TARGETARCH} \
    go build \
    -trimpath \
    -ldflags="-s -w -X github.com/pluralsh/deployment-operator/pkg/sentinel-harness/environment.Version=${VERSION}" \
    -o /sentinel-harness \
    cmd/sentinel-harness/main.go

FROM golang:1.26.2-alpine AS final

ARG TARGETARCH
ARG TARGETOS

# Install runtime dependencies + kubectl
RUN apk add --no-cache curl ca-certificates && \
    KUBECTL_VERSION=$(curl -L -s https://dl.k8s.io/release/stable.txt) && \
    curl -L -o /usr/local/bin/kubectl \
      "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/${TARGETOS}/${TARGETARCH}/kubectl" && \
    chmod +x /usr/local/bin/kubectl

# Set up the environment
# - copy the harness binary
COPY --from=builder /sentinel-harness /usr/local/bin/sentinel-harness
RUN chmod +x /usr/local/bin/sentinel-harness

RUN mkdir -p /plural && chown -R 65532:65532 /plural

WORKDIR /plural