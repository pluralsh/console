# syntax=docker/dockerfile:1.10
#
# ghcr.io/pluralsh/devbox-juicefs: the CSI driver behind JuiceFS devbox homes
# (cmd/devbox-juicefs) and the juicefs client it drives. Build context: ./go
# (pulling from dhi.io needs `docker login dhi.io`)
#
#   docker build -f deployment-operator/dockerfiles/devbox/juicefs.Dockerfile go
#
# It runs as root: the node plugin mounts FUSE filesystems on the host, and the
# controller removes trees with `juicefs rmr --skip-trash`, which requires it.

ARG GO_IMAGE=dhi.io/golang:1.27.3-alpine3.23-dev
ARG RUNTIME_IMAGE=dhi.io/alpine-base:3.23
ARG JUICEFS_VERSION=1.4.2

FROM --platform=${BUILDPLATFORM} ${GO_IMAGE} AS driver-build

ARG TARGETARCH
ARG TARGETOS
ARG VERSION=dev

WORKDIR /workspace
COPY client /workspace/client
COPY polly /workspace/polly

WORKDIR /workspace/deployment-operator
COPY deployment-operator/go.* ./
RUN go mod download

COPY deployment-operator/cmd/ ./cmd
COPY deployment-operator/pkg ./pkg
COPY deployment-operator/internal ./internal
COPY deployment-operator/api ./api

RUN --mount=type=cache,target=/root/.cache/go-build,id=devbox-juicefs-${TARGETARCH} \
    GOCACHE=/root/.cache/go-build CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} \
    go build -trimpath -ldflags="-s -w -X main.version=${VERSION}" \
      -o /out/devbox-juicefs ./cmd/devbox-juicefs

FROM --platform=${BUILDPLATFORM} ${GO_IMAGE} AS juicefs-amd64
ARG JUICEFS_VERSION
ADD --checksum=sha256:79648a0a67145bf42ca4e8336578c13a5bbc9a0bd34df340b3b93dac1e975247 \
    https://github.com/juicedata/juicefs/releases/download/v${JUICEFS_VERSION}/juicefs-${JUICEFS_VERSION}-linux-amd64.tar.gz /juicefs.tar.gz

FROM --platform=${BUILDPLATFORM} ${GO_IMAGE} AS juicefs-arm64
ARG JUICEFS_VERSION
ADD --checksum=sha256:19f72a30d3642a2f7971c8c4a31d2647de62f19520716e85c3a777de5f4c9036 \
    https://github.com/juicedata/juicefs/releases/download/v${JUICEFS_VERSION}/juicefs-${JUICEFS_VERSION}-linux-arm64.tar.gz /juicefs.tar.gz

# hadolint ignore=DL3006
FROM juicefs-${TARGETARCH} AS juicefs
RUN mkdir /out && tar -xzf /juicefs.tar.gz -C /out juicefs

# hadolint ignore=DL3006
FROM ${RUNTIME_IMAGE}

ARG VERSION=dev
ARG JUICEFS_VERSION

COPY --from=juicefs /out/juicefs /usr/local/bin/juicefs
COPY --from=driver-build /out/devbox-juicefs /devbox-juicefs

LABEL sh.plural.devbox/component="juicefs" \
      sh.plural.devbox/version="${VERSION}" \
      sh.plural.devbox/juicefs-version="${JUICEFS_VERSION}"

USER 0:0

ENTRYPOINT ["/devbox-juicefs"]
