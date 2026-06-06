ARG TERRAFORM_IMAGE_TAG=1.14.9
ARG TERRAFORM_IMAGE=hashicorp/terraform:$TERRAFORM_IMAGE_TAG
ARG OPENTOFU_IMAGE_TAG=1.12.0
ARG OPENTOFU_IMAGE=ghcr.io/opentofu/opentofu:${OPENTOFU_IMAGE_TAG}-minimal
ARG TERRAGRUNT_VERSION=1.0.6

ARG HARNESS_BASE_IMAGE_TAG=latest
ARG HARNESS_BASE_IMAGE_REPO=harness-base
ARG HARNESS_BASE_IMAGE=$HARNESS_BASE_IMAGE_REPO:$HARNESS_BASE_IMAGE_TAG

FROM $TERRAFORM_IMAGE AS terraform
FROM $OPENTOFU_IMAGE AS opentofu

FROM alpine:3.22 AS terragrunt
ARG TARGETARCH
ARG TERRAGRUNT_VERSION

RUN set -eux; \
    case "$TARGETARCH" in \
      amd64) terragrunt_arch="amd64" ;; \
      arm64) terragrunt_arch="arm64" ;; \
      *) echo "unsupported architecture: $TARGETARCH" >&2; exit 1 ;; \
    esac; \
    release_url="https://github.com/gruntwork-io/terragrunt/releases/download/v${TERRAGRUNT_VERSION}"; \
    binary_name="terragrunt_linux_${terragrunt_arch}"; \
    wget -O SHA256SUMS "${release_url}/SHA256SUMS"; \
    wget -O "${binary_name}" "${release_url}/${binary_name}"; \
    grep "  ${binary_name}$" SHA256SUMS | sha256sum -c -; \
    mv "${binary_name}" /bin/terragrunt; \
    chmod +x /bin/terragrunt

FROM $HARNESS_BASE_IMAGE AS final

COPY --from=terraform /bin/terraform /bin/terraform
COPY --from=opentofu /usr/local/bin/tofu /bin/tofu
COPY --from=terragrunt /bin/terragrunt /bin/terragrunt
