# syntax=docker/dockerfile:1.10
#
# ghcr.io/pluralsh/devbox-runtime-core: the plural-runtime sidecar of every devbox actor. It holds devbox-daemon
# and the installer that copies it into the home volume, where the devbox container (the environment image)
# runs it from. The deployment operator pins this image by digest, so daemon fixes reach every runner with an
# operator release, whatever environment image the runner uses. Build context: ./go
#
#   docker build -f deployment-operator/dockerfiles/devbox/runtime-core.Dockerfile go
#
# The build is reproducible: the same sources give the same digest, so a release that doesn't change the daemon
# doesn't roll a new template revision and cold-boot every instance. Keep it that way:
#   - nothing here may depend on the build time, the commit or the release (VERSION is only set the first time
#     a source hash is built, see runtime-src-hash.sh and the CD workflow)
#   - build with SOURCE_DATE_EPOCH=0 and the image output's rewrite-timestamp=true
#   - GO_IMAGE is pinned by digest
#
# Everything in /payload lands in every instance's home volume and snapshots, so it stays daemon-only.

ARG GO_IMAGE=golang:1.27.2-trixie@sha256:47667934874913a449b96faa7ef4777fa285d9ec29126ee80ed61c45b7cccf0e

FROM --platform=${BUILDPLATFORM} ${GO_IMAGE} AS build

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

# -buildid= and -trimpath keep the build host out of the binaries.
RUN --mount=type=cache,target=/root/.cache/go-build,id=devbox-runtime-${TARGETARCH} \
    GOCACHE=/root/.cache/go-build CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} GOFLAGS=-buildvcs=false \
    go build -trimpath \
      -ldflags="-s -w -buildid= -X main.version=${VERSION}" \
      -o /out/ \
      ./cmd/devbox-daemon ./cmd/devbox-runtime-installer

FROM scratch

ARG VERSION=dev
ARG SRC_HASH=unknown

COPY --from=build --chmod=0755 /out/devbox-runtime-installer /devbox-runtime-installer
COPY --from=build --chmod=0755 /out/devbox-daemon /payload/bin/devbox-daemon

LABEL sh.plural.devbox/runtime-contract="v1" \
      sh.plural.devbox/daemon-version="${VERSION}" \
      sh.plural.devbox/flavor="core" \
      sh.plural.devbox/src-hash="${SRC_HASH}"

# Root, to write into a home volume owned by the environment image's user. The operator grants only the
# capabilities that needs.
ENTRYPOINT ["/devbox-runtime-installer"]
