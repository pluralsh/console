FROM golang:1.26.2-alpine3.22 as builder

ARG TARGETARCH
ARG TARGETOS
ARG VERSION

WORKDIR /workspace

# Retrieve application dependencies.
# This allows the container build to reuse cached dependencies.
# Expecting to copy go.mod and if present go.sum.
COPY go.* ./
RUN go mod download

COPY cmd/harness ./cmd/harness
COPY pkg ./pkg
COPY internal ./internal
COPY api ./api

RUN CGO_ENABLED=0 \
    GOOS=${TARGETOS} \
    GOARCH=${TARGETARCH} \
    go build \
    -trimpath \
    -ldflags="-s -w -X github.com/pluralsh/deployment-operator/pkg/harness/environment.Version=${VERSION}" \
    -o /plural/harness \
    cmd/harness/main.go

FROM cgr.dev/chainguard/wolfi-base:latest as final

RUN apk update --no-cache && apk add git

# Switch to the nonroot user
USER 65532:65532

# Set up the environment
# - copy the harness binary
# - copy the trivy binary
COPY --from=builder /plural/harness /harness
COPY --from=aquasec/trivy:0.69.3 /usr/local/bin/trivy /usr/local/bin/trivy

WORKDIR /plural

ENTRYPOINT ["/harness", "--working-dir=/plural"]
