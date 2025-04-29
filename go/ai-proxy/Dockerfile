# Build the binary
FROM golang:1.24.0 as builder
ARG TARGETOS
ARG TARGETARCH
ARG VERSION
ARG GIT_COMMIT

WORKDIR /workspace

# Retrieve application dependencies.
# This allows the container build to reuse cached dependencies.
# Expecting to copy go.mod and if present go.sum.
COPY go.* ./
RUN go mod download

COPY *.go ./
COPY api ./api
COPY args ./args
COPY environment ./environment
COPY internal ./internal
COPY proxy ./proxy

# Build
# the GOARCH has not a default value to allow the binary be built according to the host where the command
# was called. For example, if we call make docker-build in a local env which has the Apple Silicon M1 SO
# the docker BUILDPLATFORM arg will be linux/arm64 when for Apple x86 it will be linux/amd64. Therefore,
# by leaving it empty we can ensure that the container and binary shipped on it will have the same platform.
RUN CGO_ENABLED=0 GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH} go build -ldflags "-s -w -X github.com/pluralsh/console/go/ai-proxy/environment.Version=${VERSION} -X github.com/pluralsh/console/go/ai-proxy/environment.Commit=${GIT_COMMIT}" -a -o ai-proxy .

# Use distroless as minimal base image to package the manager binary
# Refer to https://github.com/GoogleContainerTools/distroless for more details
FROM gcr.io/distroless/static:nonroot
WORKDIR /
COPY --from=builder /workspace/ai-proxy .
USER 65532:65532

ENTRYPOINT ["/ai-proxy"]
