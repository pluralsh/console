ARG TERRAFORM_IMAGE_TAG=1.8.2
ARG TERRAFORM_IMAGE=hashicorp/terraform:$TERRAFORM_IMAGE_TAG

ARG HARNESS_BASE_IMAGE_TAG=latest
ARG HARNESS_BASE_IMAGE_REPO=harness-base
ARG HARNESS_BASE_IMAGE=$HARNESS_BASE_IMAGE_REPO:$HARNESS_BASE_IMAGE_TAG

ARG INFRACOST_VERSION=0.10.44

FROM $TERRAFORM_IMAGE as terraform

# Fetch the infracost binary from the official GitHub release. We use a
# downloader stage rather than the infracost docker image because the latter
# is published as linux/amd64 only, while this image supports multi-arch.
FROM alpine:3.22 as infracost
ARG TARGETARCH
ARG INFRACOST_VERSION
RUN apk add --no-cache curl tar && \
    curl -fsSL "https://github.com/infracost/infracost/releases/download/v${INFRACOST_VERSION}/infracost-linux-${TARGETARCH}.tar.gz" \
        | tar -xz -C /tmp && \
    mv "/tmp/infracost-linux-${TARGETARCH}" /infracost && \
    chmod +x /infracost

FROM $HARNESS_BASE_IMAGE as final

COPY --from=terraform /bin/terraform /bin/terraform
COPY --from=infracost /infracost /bin/infracost
