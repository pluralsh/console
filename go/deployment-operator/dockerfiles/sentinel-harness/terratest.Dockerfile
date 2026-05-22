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
    GOCACHE=/workspace/deployment-operator/.cache

# Create directories and fix permissions
RUN mkdir -p /workspace/deployment-operator/.cache && chown -R 65532:65532 /workspace/deployment-operator && chown -R 65532:65532 /plural

WORKDIR /workspace

# Copy required local modules referenced by go.mod replace directives
COPY /client /workspace/client
COPY /polly /workspace/polly

WORKDIR /workspace/deployment-operator/terratest

# Copy test files
COPY deployment-operator/terratest ./

# Switch to the nonroot user
USER 65532:65532

RUN go mod download

ENTRYPOINT ["sentinel-harness", "--test-dir=/workspace/deployment-operator", "--output-dir=/plural"]