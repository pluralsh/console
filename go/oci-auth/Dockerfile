FROM golang:1.23.7 as builder
ARG TARGETOS
ARG TARGETARCH

WORKDIR /workspace/oci-auth

# Retrieve application dependencies.
# This allows the container build to reuse cached dependencies.
# Expecting to copy go.mod and if present go.sum.
COPY oci-auth/go.* ./
RUN go mod download

COPY oci-auth/internal ./internal
COPY oci-auth/main.go ./

# Build
# the GOARCH has not a default value to allow the binary be built according to the host where the command
# was called. For example, if we call make docker-build in a local env which has the Apple Silicon M1 SO
# the docker BUILDPLATFORM arg will be linux/arm64 when for Apple x86 it will be linux/amd64. Therefore,
# by leaving it empty we can ensure that the container and binary shipped on it will have the same platform.
RUN CGO_ENABLED=0 GOOS=${TARGETOS:-linux} GOARCH=${TARGETARCH} go build -ldflags '-s -w -X github.com/pluralsh/console/go/oci-auth/internal/environment.Version=${VERSION} -X github.com/pluralsh/console/go/oci-auth/internal/environment.Commit=${GIT_COMMIT}' -a -o oci-auth .

# Use distroless as minimal base image to package the oci-auth binary
# Refer to https://github.com/GoogleContainerTools/distroless for more details
FROM gcr.io/distroless/static:nonroot
WORKDIR /
COPY --from=builder /workspace/oci-auth/oci-auth .
USER 65532:65532

ENTRYPOINT ["/oci-auth"]
