ARG SENTINEL_HARNESS_BASE_IMAGE_TAG=latest
ARG SENTINEL_HARNESS_BASE_IMAGE_REPO=ghcr.io/pluralsh/sentinel-harness-base
ARG SENTINEL_HARNESS_BASE_IMAGE=$SENTINEL_HARNESS_BASE_IMAGE_REPO:$SENTINEL_HARNESS_BASE_IMAGE_TAG

FROM ${SENTINEL_HARNESS_BASE_IMAGE} AS final

# Define build arguments for multi-arch support
ARG TARGETOS
ARG TARGETARCH

ENV CGO_ENABLED=0 \
    GOOS=${TARGETOS} \
    GOARCH=${TARGETARCH} \
    GOCACHE=/sentinel/.cache

WORKDIR /sentinel/terratest

# Copy test files
COPY --chown=65532:65532 deployment-operator/terratest ./

RUN go mod download

ENTRYPOINT ["sentinel-harness", "--test-dir=/sentinel", "--output-dir=/plural"]
