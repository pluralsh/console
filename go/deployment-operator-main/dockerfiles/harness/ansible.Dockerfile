ARG HARNESS_BASE_IMAGE_TAG=latest
ARG HARNESS_BASE_IMAGE_REPO=harness-base
ARG HARNESS_BASE_IMAGE=$HARNESS_BASE_IMAGE_REPO:$HARNESS_BASE_IMAGE_TAG
ARG PYTHON_VERSION=3.12

# Use harness base image
FROM ${HARNESS_BASE_IMAGE} AS harness

# Build Ansible from Python Image
FROM python:${PYTHON_VERSION}-alpine AS final
ARG ANSIBLE_VERSION=11.0.0

# Copy Harness bin from the Harness Image
COPY --from=harness /harness /usr/local/bin/harness

# Change ownership of the harness binary to UID/GID 65532
RUN chown -R 65532:65532 /usr/local/bin/harness

COPY ansible/modules/ /usr/share/plural/plugins/modules/
COPY ansible/action_plugins/ /usr/share/plural/plugins/action/
RUN chown -R 65532:65532 /usr/share/plural/plugins/modules/
RUN chown -R 65532:65532 /usr/share/plural/plugins/action/

# Install system packages and build deps, install Python packages, then remove build deps
RUN apk add --no-cache \
    openssh-client \
    git \
    sshpass \
    rsync \
    curl \
    wget \
    bash \
    jq \
    gnupg \
    unzip \
    tar \
    ca-certificates && \
    apk add --no-cache --virtual .build-deps \
    gcc \
    musl-dev \
    libffi-dev \
    openssl-dev \
    make \
    build-base && \
    pip install --no-cache-dir \
    ansible==${ANSIBLE_VERSION} \
    jmespath \
    netaddr \
    boto3 \
    botocore \
    kubernetes \
    passlib \
    cryptography && \
    apk del .build-deps

# install plural cli
ARG TARGETARCH
RUN VERSION=$(curl -sL https://api.github.com/repos/pluralsh/plural-cli/releases/latest | jq -r '.tag_name' | tr -d v) && \
    curl -L https://github.com/pluralsh/plural-cli/releases/download/v${VERSION}/plural-cli_${VERSION}_Linux_${TARGETARCH}.tar.gz \
    | tar zx && \
    mv plural /usr/local/bin/plural && \
    chmod +x /usr/local/bin/plural

RUN addgroup --gid 65532 nonroot && \
    adduser --uid 65532 --ingroup nonroot --disabled-password --home /home/nonroot nonroot && \
    mkdir -p /home/nonroot/.cache/pip /home/nonroot/.local && \
    chown -R 65532:65532 /home/nonroot

# Ensure pip uses a writable cache dir and does not fall back to user install
ENV PIP_CACHE_DIR=/home/nonroot/.cache/pip
ENV PIP_USER=false
ENV PYTHONUSERBASE=/home/nonroot/.local
ENV PYTHONPATH=/home/nonroot/.local/lib/python3.12/site-packages

# Switch to the non-root user
USER 65532:65532

WORKDIR /plural

ENTRYPOINT ["harness", "--working-dir=/plural"]
