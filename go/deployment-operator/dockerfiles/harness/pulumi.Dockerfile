ARG PULUMI_VERSION=3.251.0
ARG NODEJS_VERSION=22
ARG GO_VERSION=1.26

ARG HARNESS_BASE_IMAGE_TAG=latest
ARG HARNESS_BASE_IMAGE_REPO=harness-base
ARG HARNESS_BASE_IMAGE=$HARNESS_BASE_IMAGE_REPO:$HARNESS_BASE_IMAGE_TAG

FROM alpine:3.22 AS pulumi
ARG TARGETARCH
ARG PULUMI_VERSION

RUN set -eux; \
    apk add --no-cache ca-certificates wget; \
    case "$TARGETARCH" in \
      amd64) pulumi_arch="x64" ;; \
      arm64) pulumi_arch="arm64" ;; \
      *) echo "unsupported architecture: $TARGETARCH" >&2; exit 1 ;; \
    esac; \
    release_url="https://github.com/pulumi/pulumi/releases/download/v${PULUMI_VERSION}"; \
    archive_name="pulumi-v${PULUMI_VERSION}-linux-${pulumi_arch}.tar.gz"; \
    checksums_name="pulumi-${PULUMI_VERSION}-checksums.txt"; \
    wget -O "${checksums_name}" "${release_url}/${checksums_name}"; \
    wget -O "${archive_name}" "${release_url}/${archive_name}"; \
    grep "  ${archive_name}$" "${checksums_name}" | sha256sum -c -; \
    mkdir -p /pulumi; \
    tar -xzf "${archive_name}" -C /pulumi --strip-components=1

FROM $HARNESS_BASE_IMAGE AS final

# Node.js and Go only; Python omitted for now.
ARG NODEJS_VERSION
ARG GO_VERSION

USER root

RUN apk add --no-cache \
    nodejs-${NODEJS_VERSION} \
    go-${GO_VERSION} \
    npm && \
    mkdir -p /plural/.cache/go /plural/.cache/go-build /plural/.cache/npm /plural/.pulumi && \
    chown -R 65532:65532 /plural/.cache /plural/.pulumi

COPY --from=pulumi /pulumi/pulumi /bin/pulumi
COPY --from=pulumi /pulumi/pulumi-language-nodejs /bin/pulumi-language-nodejs
COPY --from=pulumi /pulumi/pulumi-language-go /bin/pulumi-language-go

ENV GOPATH="/plural/.cache/go"
ENV GOCACHE="/plural/.cache/go-build"
ENV NPM_CONFIG_CACHE="/plural/.cache/npm"
ENV PULUMI_HOME="/plural/.pulumi"
# Force ANSI color; --color=auto disables it when stdout is not a TTY.
ENV PULUMI_OPTION_COLOR=always

USER 65532:65532
