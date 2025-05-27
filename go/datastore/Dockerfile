# Build the manager binary
FROM golang:1.23.7 as builder
ARG TARGETOS
ARG TARGETARCH

WORKDIR /workspace

# Copy required local modules
COPY /client /workspace/client

WORKDIR /workspace/controller

# Retrieve application dependencies.
# This allows the container build to reuse cached dependencies.
# Expecting to copy go.mod and if present go.sum.
COPY datastore/go.* ./
RUN go mod download

COPY datastore/api ./api
COPY datastore/cmd ./cmd
COPY datastore/internal ./internal

# Build
# the GOARCH has not a default value to allow the binary be built according to the host where the command
# was called. For example, if we call make docker-build in a local env which has the Apple Silicon M1 SO
# the docker BUILDPLATFORM arg will be linux/arm64 when for Apple x86 it will be linux/amd64. Therefore,
# by leaving it empty we can ensure that the container and binary shipped on it will have the same platform.
RUN CGO_ENABLED=0 GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH} go build -ldflags '-s -w -X main.version=${VERSION} -X main.commit=${GIT_COMMIT}' -a -o manager cmd/main.go

# Use distroless as minimal base image to package the manager binary
# Refer to https://github.com/GoogleContainerTools/distroless for more details
FROM gcr.io/distroless/static:nonroot
WORKDIR /
COPY --from=builder /workspace/controller/manager .
USER 65532:65532

ENTRYPOINT ["/manager"]
