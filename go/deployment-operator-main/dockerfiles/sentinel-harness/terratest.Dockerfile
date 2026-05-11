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

# Create directories and fix permissions
RUN mkdir -p /sentinel/.cache && chown -R 65532:65532 /sentinel && chown -R 65532:65532 /plural

# Copy test files
COPY terratest /sentinel/terratest

# Switch to the nonroot user
USER 65532:65532

WORKDIR /sentinel/terratest

RUN go mod download

ENTRYPOINT ["sentinel-harness", "--test-dir=/sentinel", "--output-dir=/plural"]