FROM golang:1.26.6-alpine AS builder

ARG TARGETARCH
ARG TARGETOS
ARG VERSION

WORKDIR /workspace

# Copy required local modules referenced by go.mod replace directives
COPY /client /workspace/client
COPY /polly /workspace/polly

WORKDIR /workspace/deployment-operator

# Retrieve application dependencies.
# This allows the container build to reuse cached dependencies.
# Expecting to copy go.mod and if present go.sum.
COPY deployment-operator/go.* ./
RUN go mod download

COPY deployment-operator/cmd/harness ./cmd/harness
COPY deployment-operator/pkg ./pkg
COPY deployment-operator/internal ./internal
COPY deployment-operator/api ./api

RUN CGO_ENABLED=0 \
  GOOS=${TARGETOS} \
  GOARCH=${TARGETARCH} \
  go build \
  -tags musl \
  -trimpath \
  -ldflags="-s -w -X github.com/pluralsh/console/go/deployment-operator/pkg/harness/environment.Version=${VERSION}" \
  -o /plural/harness \
  cmd/harness/main.go

FROM cgr.dev/chainguard/wolfi-base:latest AS final

RUN apk update --no-cache && apk add --no-cache git

# Switch to the nonroot user
USER 65532:65532

# Set up the environment
# - copy the harness binary
# - copy the trivy binary
COPY --from=builder /plural/harness /harness
COPY --from=aquasec/trivy:0.69.3 /usr/local/bin/trivy /usr/local/bin/trivy

WORKDIR /plural

ENV HELM_CACHE_HOME=/plural/.cache/helm

HEALTHCHECK --interval=60s --timeout=10s --start-period=30s --retries=5 \
  CMD kill -0 1 || exit 1

ENTRYPOINT ["/harness", "--working-dir=/plural"]
