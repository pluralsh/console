# syntax=docker/dockerfile:1.10
#
# ghcr.io/pluralsh/devbox-block: the CSI driver behind block storage devbox
# homes (cmd/devbox-block): its controller, its node plugin and the anchor pods
# that keep disks attached, so the image is just the binary. Build context:
# ./go (pulling from dhi.io needs `docker login dhi.io`)
#
#   docker build -f deployment-operator/dockerfiles/devbox/block.Dockerfile go
#
# It runs as root: the node plugin mounts and sets the owner of each freshly
# formatted home. The controller and anchor pods override the user.

ARG GO_IMAGE=dhi.io/golang:1.27.3-alpine3.23-dev
ARG RUNTIME_IMAGE=dhi.io/alpine-base:3.23

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

RUN --mount=type=cache,target=/root/.cache/go-build,id=devbox-block-${TARGETARCH} \
    GOCACHE=/root/.cache/go-build CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} \
    go build -trimpath -ldflags="-s -w -X main.version=${VERSION}" \
      -o /out/devbox-block ./cmd/devbox-block

# hadolint ignore=DL3006
FROM ${RUNTIME_IMAGE}

ARG VERSION=dev

COPY --from=driver-build /out/devbox-block /devbox-block

LABEL sh.plural.devbox/component="block" \
      sh.plural.devbox/version="${VERSION}"

USER 0:0

ENTRYPOINT ["/devbox-block"]
