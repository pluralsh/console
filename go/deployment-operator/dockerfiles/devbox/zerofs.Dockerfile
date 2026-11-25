# syntax=docker/dockerfile:1.10
#
# ghcr.io/pluralsh/devbox-zerofs (also docker.io and gcr.io/pluralsh): the CSI driver behind ZeroFS devbox homes
# (cmd/devbox-zerofs), the zerofs server it runs per volume, and the block tooling it drives: nbd-client,
# mkfs.ext4, resize2fs, blkid and modprobe. Build context: ./go (pulling from dhi.io needs `docker login dhi.io`)
#
#   docker build -f deployment-operator/dockerfiles/devbox/zerofs.Dockerfile go
#
# It runs as root: the node plugin loads the nbd module, attaches NBD devices and mounts ext4 and FUSE on the host.
# ZeroFS is AGPL-3.0 (or commercially licensed); this image ships its unmodified release binary.

ARG GO_IMAGE=dhi.io/golang:1.27.3-alpine3.23-dev
# A -dev variant: the runtime needs apk for the block tooling.
ARG RUNTIME_IMAGE=dhi.io/alpine-base:3.23-dev
ARG ZEROFS_VERSION=2.3.7

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

RUN --mount=type=cache,target=/root/.cache/go-build,id=devbox-zerofs-${TARGETARCH} \
    GOCACHE=/root/.cache/go-build CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} \
    go build -trimpath -ldflags="-s -w -X main.version=${VERSION}" \
      -o /out/devbox-zerofs ./cmd/devbox-zerofs

# One archive holds every platform's static, PGO-built binary.
FROM --platform=${BUILDPLATFORM} ${GO_IMAGE} AS zerofs
ARG ZEROFS_VERSION
ARG TARGETARCH
ADD --checksum=sha256:8efa26f7abee82e5b720e57ef9c307d0f745a22cd0d81a6d3bbc095db56707c8 \
    https://github.com/Barre/ZeroFS/releases/download/v${ZEROFS_VERSION}/zerofs-pgo-multiplatform.tar.gz /zerofs.tar.gz
RUN mkdir /out && tar -xzf /zerofs.tar.gz -C /out "zerofs-linux-${TARGETARCH}-pgo" \
    && mv "/out/zerofs-linux-${TARGETARCH}-pgo" /out/zerofs && chmod 0755 /out/zerofs

# hadolint ignore=DL3006
FROM ${RUNTIME_IMAGE}

ARG VERSION=dev
ARG ZEROFS_VERSION

# hadolint ignore=DL3018
RUN apk add --no-cache nbd-client e2fsprogs e2fsprogs-extra blkid kmod fuse3

COPY --from=zerofs /out/zerofs /usr/local/bin/zerofs
COPY --from=driver-build /out/devbox-zerofs /devbox-zerofs

LABEL sh.plural.devbox/component="zerofs" \
      sh.plural.devbox/version="${VERSION}" \
      sh.plural.devbox/zerofs-version="${ZEROFS_VERSION}"

USER 0:0

ENTRYPOINT ["/devbox-zerofs"]
