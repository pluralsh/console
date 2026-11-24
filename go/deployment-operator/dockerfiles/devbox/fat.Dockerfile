# syntax=docker/dockerfile:1.10
#
# ghcr.io/pluralsh/devbox-fat: devbox-minimal plus language toolchains, DevOps
# tools and cloud CLIs, the DevboxRunner default (DBX-49). Build context: ./go
#
#   docker build -f deployment-operator/dockerfiles/devbox/fat.Dockerfile \
#     --build-arg BASE_IMAGE=ghcr.io/pluralsh/devbox-minimal:<version> go
#
# Toolchains live under /usr/local and /opt; their caches (Go modules and build
# cache, Cargo registry, Maven, Gradle, NuGet, uv) default to /home/dev, the
# workspace volume, so they persist across snapshots.

ARG BASE_IMAGE=ghcr.io/pluralsh/devbox-minimal:latest
# renovate: datasource=docker depName=golang
ARG GO_VERSION=1.27.2
# renovate: datasource=docker depName=eclipse-temurin
ARG TEMURIN_TAG=25.0.5_8-jdk-noble
# renovate: datasource=docker depName=maven
ARG MAVEN_TAG=3.9.16-eclipse-temurin-25-noble
# renovate: datasource=docker depName=gradle
ARG GRADLE_TAG=9.9.1-jdk25-noble
# renovate: datasource=docker depName=mcr.microsoft.com/dotnet/sdk
ARG DOTNET_SDK_TAG=10.0.404
# renovate: datasource=docker depName=ghcr.io/astral-sh/uv
ARG UV_VERSION=0.13.8

FROM golang:${GO_VERSION}-trixie AS go
# renovate: datasource=go depName=golang.org/x/tools/gopls
ARG GOPLS_VERSION=0.24.0
RUN CGO_ENABLED=0 GOBIN=/out go install -trimpath -ldflags="-s -w" "golang.org/x/tools/gopls@v${GOPLS_VERSION}"

FROM eclipse-temurin:${TEMURIN_TAG} AS jdk
FROM maven:${MAVEN_TAG} AS maven
FROM gradle:${GRADLE_TAG} AS gradle
FROM mcr.microsoft.com/dotnet/sdk:${DOTNET_SDK_TAG} AS dotnet
FROM ghcr.io/astral-sh/uv:${UV_VERSION} AS uv

# ---------------------------------------------------------------------------
# DevOps CLIs (static binaries)
# ---------------------------------------------------------------------------
FROM debian:trixie-20261104-slim AS devops

ARG TARGETARCH
# renovate: datasource=github-releases depName=kubernetes/kubernetes
ARG KUBECTL_VERSION=1.37.2
# renovate: datasource=github-releases depName=helm/helm
ARG HELM_VERSION=4.3.2
# renovate: datasource=github-releases depName=kubernetes-sigs/kustomize extractVersion=^kustomize/v(?<version>.*)$
ARG KUSTOMIZE_VERSION=5.8.3
# renovate: datasource=github-releases depName=derailed/k9s
ARG K9S_VERSION=0.51.0
# renovate: datasource=github-releases depName=hashicorp/terraform
ARG TERRAFORM_VERSION=1.17.2
# renovate: datasource=github-releases depName=opentofu/opentofu
ARG OPENTOFU_VERSION=1.13.9
# renovate: datasource=github-releases depName=gruntwork-io/terragrunt
ARG TERRAGRUNT_VERSION=1.2.2
# renovate: datasource=github-releases depName=mikefarah/yq
ARG YQ_VERSION=4.54.3
# renovate: datasource=github-releases depName=google/go-containerregistry
ARG CRANE_VERSION=0.22.1
# renovate: datasource=github-releases depName=pluralsh/plural-cli
ARG PLURAL_VERSION=0.12.69

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# hadolint ignore=DL3008
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates curl unzip && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /dl
# verify <file> <checksums-url>: checks <file> against a "<sha256>  <name>" list.
RUN set -eux; \
    verify() { curl -fsSL "$2" | grep -E "[ *]$1\$" | head -1 | awk -v f="$1" '{print $1"  "f}' | sha256sum -c -; }; \
    arch="${TARGETARCH}"; \
    mkdir -p /out; \
    curl -fsSLO "https://dl.k8s.io/release/v${KUBECTL_VERSION}/bin/linux/${arch}/kubectl"; \
    echo "$(curl -fsSL "https://dl.k8s.io/release/v${KUBECTL_VERSION}/bin/linux/${arch}/kubectl.sha256")  kubectl" | sha256sum -c -; \
    install -m 0755 kubectl /out/kubectl; \
    f="helm-v${HELM_VERSION}-linux-${arch}.tar.gz"; curl -fsSLO "https://get.helm.sh/${f}"; \
    echo "$(curl -fsSL "https://get.helm.sh/${f}.sha256sum" | awk '{print $1}')  ${f}" | sha256sum -c -; \
    tar -xzf "${f}"; install -m 0755 "linux-${arch}/helm" /out/helm; \
    f="kustomize_v${KUSTOMIZE_VERSION}_linux_${arch}.tar.gz"; base="https://github.com/kubernetes-sigs/kustomize/releases/download/kustomize%2Fv${KUSTOMIZE_VERSION}"; \
    curl -fsSLO "${base}/${f}"; verify "${f}" "${base}/checksums.txt"; tar -xzf "${f}"; install -m 0755 kustomize /out/kustomize; \
    f="k9s_Linux_${arch}.tar.gz"; base="https://github.com/derailed/k9s/releases/download/v${K9S_VERSION}"; \
    curl -fsSLO "${base}/${f}"; verify "${f}" "${base}/checksums.sha256"; mkdir k9s; tar -xzf "${f}" -C k9s; install -m 0755 k9s/k9s /out/k9s; \
    f="terraform_${TERRAFORM_VERSION}_linux_${arch}.zip"; base="https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}"; \
    curl -fsSLO "${base}/${f}"; verify "${f}" "${base}/terraform_${TERRAFORM_VERSION}_SHA256SUMS"; unzip -q "${f}" terraform; install -m 0755 terraform /out/terraform; \
    f="tofu_${OPENTOFU_VERSION}_linux_${arch}.tar.gz"; base="https://github.com/opentofu/opentofu/releases/download/v${OPENTOFU_VERSION}"; \
    curl -fsSLO "${base}/${f}"; verify "${f}" "${base}/tofu_${OPENTOFU_VERSION}_SHA256SUMS"; mkdir tofu; tar -xzf "${f}" -C tofu; install -m 0755 tofu/tofu /out/tofu; \
    f="terragrunt_linux_${arch}"; base="https://github.com/gruntwork-io/terragrunt/releases/download/v${TERRAGRUNT_VERSION}"; \
    curl -fsSLO "${base}/${f}"; verify "${f}" "${base}/SHA256SUMS"; install -m 0755 "${f}" /out/terragrunt; \
    f="yq_linux_${arch}"; base="https://github.com/mikefarah/yq/releases/download/v${YQ_VERSION}"; \
    curl -fsSLO "${base}/${f}"; \
    echo "$(curl -fsSL "${base}/checksums-bsd" | grep "^SHA256 (${f}) = " | awk '{print $4}')  ${f}" | sha256sum -c -; \
    install -m 0755 "${f}" /out/yq; \
    case "${arch}" in amd64) carch=x86_64 ;; *) carch="${arch}" ;; esac; \
    f="go-containerregistry_Linux_${carch}.tar.gz"; base="https://github.com/google/go-containerregistry/releases/download/v${CRANE_VERSION}"; \
    curl -fsSLO "${base}/${f}"; verify "${f}" "${base}/checksums.txt"; mkdir crane; tar -xzf "${f}" -C crane; install -m 0755 crane/crane /out/crane; \
    f="plural-cli_${PLURAL_VERSION}_Linux_${arch}.tar.gz"; base="https://github.com/pluralsh/plural-cli/releases/download/v${PLURAL_VERSION}"; \
    curl -fsSLO "${base}/${f}"; verify "${f}" "${base}/checksums.txt"; mkdir plural; tar -xzf "${f}" -C plural; install -m 0755 plural/plural /out/plural; \
    rm -rf /dl/*

# ---------------------------------------------------------------------------
# devbox-fat
# ---------------------------------------------------------------------------
# hadolint ignore=DL3006
FROM ${BASE_IMAGE} AS fat

ARG TARGETARCH
ARG GO_VERSION
ARG TEMURIN_TAG
ARG DOTNET_SDK_TAG
ARG UV_VERSION
# renovate: datasource=npm depName=typescript
ARG TYPESCRIPT_VERSION=6.0.3
# renovate: datasource=npm depName=typescript-language-server
ARG TYPESCRIPT_LANGUAGE_SERVER_VERSION=6.1.0
# renovate: datasource=npm depName=corepack
ARG COREPACK_VERSION=0.36.0
# renovate: datasource=npm depName=pnpm
ARG PNPM_VERSION=12.18.0
# renovate: datasource=npm depName=@yarnpkg/cli-dist
ARG YARN_BERRY_VERSION=4.18.1
ARG YARN_CLASSIC_VERSION=1.22.22
# renovate: datasource=github-tags depName=rust-lang/rust
ARG RUST_VERSION=1.100.0
# renovate: datasource=nuget depName=csharp-ls
ARG CSHARP_LS_VERSION=0.28.0
# renovate: datasource=github-tags depName=aws/aws-cli
ARG AWS_CLI_VERSION=2.40.3
# renovate: datasource=pypi depName=azure-cli
ARG AZURE_CLI_VERSION=2.92.0
ARG GCLOUD_VERSION=593.0.0

USER root
# Root build steps must not write caches into /home/dev (the workspace volume).
ENV HOME=/root
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Python 3 plus native libraries the .NET SDK needs.
# hadolint ignore=DL3008
RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      python3 python3-venv python3-pip python3-dev \
      libicu76 zlib1g && \
    rm -rf /var/lib/apt/lists/*

COPY --from=go /usr/local/go /usr/local/go
COPY --from=go /out/gopls /usr/local/bin/gopls
COPY --from=jdk /opt/java/openjdk /opt/java/openjdk
COPY --from=maven /usr/share/maven /opt/maven
COPY --from=gradle /opt/gradle /opt/gradle
COPY --from=dotnet /usr/share/dotnet /usr/share/dotnet
COPY --from=uv /uv /uvx /usr/local/bin/
COPY --from=devops /out/ /usr/local/bin/
COPY --chmod=0755 deployment-operator/dockerfiles/devbox/rootfs/fat/usr/local/bin/ /usr/local/bin/

ENV RUSTUP_HOME=/usr/local/rustup \
    COREPACK_HOME=/usr/local/share/corepack \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    DOTNET_ROOT=/usr/share/dotnet \
    DOTNET_CLI_TELEMETRY_OPTOUT=1 \
    DOTNET_NOLOGO=1 \
    DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1

# Java reads its own trust store, so the JDK's cacerts points at a writable copy
# in the trust directory; the daemon imports the egress CA into it at boot.
RUN set -eux; \
    ln -s /opt/maven/bin/mvn /usr/local/bin/mvn; \
    ln -s /opt/gradle/bin/gradle /usr/local/bin/gradle; \
    ln -s /usr/share/dotnet/dotnet /usr/local/bin/dotnet; \
    for bin in go gofmt; do ln -s "/usr/local/go/bin/${bin}" "/usr/local/bin/${bin}"; done; \
    for bin in java javac jar jshell keytool; do ln -s "/opt/java/openjdk/bin/${bin}" "/usr/local/bin/${bin}"; done; \
    install -o 1000 -g 1000 -m 0644 /opt/java/openjdk/lib/security/cacerts /var/lib/devbox/trust/java-cacerts; \
    ln -sf /var/lib/devbox/trust/java-cacerts /opt/java/openjdk/lib/security/cacerts; \
    go version; java -version; mvn --version; gradle --version --quiet; dotnet --info > /dev/null; uv --version

# Node: TypeScript, its language server, and pnpm/yarn through corepack.
RUN set -eux; \
    NPM_CONFIG_PREFIX=/usr/local npm install --global \
      "corepack@${COREPACK_VERSION}" \
      "typescript@${TYPESCRIPT_VERSION}" \
      "typescript-language-server@${TYPESCRIPT_LANGUAGE_SERVER_VERSION}"; \
    corepack enable --install-directory /usr/local/bin; \
    corepack install --global "pnpm@${PNPM_VERSION}" "yarn@${YARN_BERRY_VERSION}"; \
    corepack install --global "yarn@${YARN_CLASSIC_VERSION}"; \
    chown -R 1000:1000 "${COREPACK_HOME}"; \
    npm cache clean --force; rm -rf /root/.npm /root/.cache; \
    tsc --version; typescript-language-server --version; pnpm --version; yarn --version

# Rust: toolchains in RUSTUP_HOME (writable, so rust-toolchain.toml pins install
# on demand); CARGO_HOME is /home/dev/.cargo at runtime.
RUN set -eux; \
    case "${TARGETARCH}" in amd64) rarch=x86_64 ;; arm64) rarch=aarch64 ;; *) exit 1 ;; esac; \
    url="https://static.rust-lang.org/rustup/dist/${rarch}-unknown-linux-gnu/rustup-init"; \
    curl -fsSLo /tmp/rustup-init "${url}"; \
    echo "$(curl -fsSL "${url}.sha256" | awk '{print $1}')  /tmp/rustup-init" | sha256sum -c -; \
    chmod +x /tmp/rustup-init; \
    CARGO_HOME=/usr/local/cargo /tmp/rustup-init -y --no-modify-path --profile minimal \
      --default-toolchain "${RUST_VERSION}" --component clippy,rustfmt,rust-analyzer; \
    rm /tmp/rustup-init; \
    /usr/local/cargo/bin/rustup set auto-self-update disable; \
    chown -R 1000:1000 "${RUSTUP_HOME}"; \
    /usr/local/cargo/bin/cargo --version; /usr/local/cargo/bin/rust-analyzer --version

# C# language server.
RUN set -eux; \
    dotnet tool install csharp-ls --version "${CSHARP_LS_VERSION}" --tool-path /usr/local/share/dotnet-tools; \
    ln -s /usr/local/share/dotnet-tools/csharp-ls /usr/local/bin/csharp-ls; \
    rm -rf /root/.nuget /root/.dotnet /root/.local /tmp/*

# Cloud CLIs. The wrappers in /usr/local/bin load the daemon's federated
# identity environment (section 4.9) before running the real CLI.
RUN set -eux; \
    case "${TARGETARCH}" in amd64) aarch=x86_64; garch=x86_64 ;; arm64) aarch=aarch64; garch=arm ;; *) exit 1 ;; esac; \
    tmp="$(mktemp -d)"; cd "${tmp}"; \
    curl -fsSLo awscli.zip "https://awscli.amazonaws.com/awscli-exe-linux-${aarch}-${AWS_CLI_VERSION}.zip"; \
    unzip -q awscli.zip; ./aws/install --install-dir /usr/local/aws-cli --bin-dir /usr/local/aws-cli/bin; \
    curl -fsSL "https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-${GCLOUD_VERSION}-linux-${garch}.tar.gz" | tar -xz -C /opt; \
    /opt/google-cloud-sdk/bin/gcloud components install gke-gcloud-auth-plugin --quiet; \
    rm -rf /opt/google-cloud-sdk/.install/.backup; \
    find /opt/google-cloud-sdk -name '__pycache__' -type d -prune -exec rm -rf {} +; \
    ln -s /opt/google-cloud-sdk/bin/gsutil /usr/local/bin/gsutil; \
    ln -s /opt/google-cloud-sdk/bin/bq /usr/local/bin/bq; \
    ln -s /opt/google-cloud-sdk/bin/gke-gcloud-auth-plugin /usr/local/bin/gke-gcloud-auth-plugin; \
    uv venv --python /usr/bin/python3 /opt/az; \
    uv pip install --no-cache --python /opt/az/bin/python "azure-cli==${AZURE_CLI_VERSION}"; \
    cd /; rm -rf "${tmp}" /root/.config /root/.cache; \
    aws --version; gcloud --version > /dev/null; az version --output none

# Containers: rootless Podman as dev, with `docker`, `docker compose` and
# `docker-compose` mapped onto it. The sandbox (gVisor by default) gives no overlay mounts in a user
# namespace, FUSE or cgroup delegation, so images use the vfs driver and
# containers run without cgroups. Containers share the box's network unless
# given one (compose projects get theirs via pasta, with aardvark-dns resolving
# service names); either way traffic leaves through the box's egress policy.
# Images live under /home/dev/.local/share/containers, cached across snapshots.
# hadolint ignore=DL3008
RUN set -eux; \
    apt-get update; \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      podman podman-docker podman-compose uidmap crun catatonit \
      netavark aardvark-dns passt nftables; \
    rm -rf /var/lib/apt/lists/*; \
    echo "dev:100000:65536" > /etc/subuid; \
    echo "dev:100000:65536" > /etc/subgid; \
    touch /etc/containers/nodocker; \
    ln -s /usr/bin/podman-compose /usr/local/bin/docker-compose; \
    printf '%s\n' \
      '[storage]' \
      'driver = "vfs"' \
      'runroot = "/run/containers/storage"' \
      'graphroot = "/var/lib/containers/storage"' \
      'rootless_storage_path = "/home/dev/.local/share/containers/storage"' \
      > /etc/containers/storage.conf; \
    mkdir -p /etc/containers/containers.conf.d; \
    printf '%s\n' \
      '[containers]' \
      'netns = "host"' \
      'cgroups = "disabled"' \
      'log_driver = "k8s-file"' \
      '' \
      '[engine]' \
      'compose_warning_logs = false' \
      'cgroup_manager = "cgroupfs"' \
      'events_logger = "file"' \
      'runtime = "crun"' \
      '' \
      '[engine.runtimes]' \
      'crun = ["/usr/bin/crun"]' \
      > /etc/containers/containers.conf.d/devbox.conf; \
    podman --version; docker --version; podman-compose --version

RUN jq --arg flavor fat \
      --arg go "${GO_VERSION}" --arg rust "${RUST_VERSION}" --arg java "${TEMURIN_TAG}" \
      --arg dotnet "${DOTNET_SDK_TAG}" --arg typescript "${TYPESCRIPT_VERSION}" --arg uv "${UV_VERSION}" \
      '.flavor = $flavor | .toolchains = {go: $go, rust: $rust, java: $java, dotnet: $dotnet, typescript: $typescript, uv: $uv}' \
      /etc/devbox/image.json > /tmp/image.json && mv /tmp/image.json /etc/devbox/image.json && chmod 0644 /etc/devbox/image.json && \
    if [ -n "$(ls -A /home/dev)" ]; then echo "build wrote into /home/dev:" >&2; ls -A /home/dev >&2; exit 1; fi

LABEL sh.plural.devbox/contract="v1" \
      sh.plural.devbox/flavor="fat"

ENV HOME=/home/dev \
    GOPATH=/home/dev/go \
    CARGO_HOME=/home/dev/.cargo \
    JAVA_HOME=/opt/java/openjdk \
    MAVEN_HOME=/opt/maven \
    GRADLE_HOME=/opt/gradle \
    CLOUDSDK_CORE_DISABLE_PROMPTS=1 \
    CLOUDSDK_COMPONENT_MANAGER_DISABLE_UPDATE_CHECK=1 \
    AZURE_CORE_COLLECT_TELEMETRY=false \
    AWS_PAGER="" \
    MISE_ERLANG_COMPILE=false \
    MISE_ERLANG_PRECOMPILED_OS=ubuntu-24.04 \
    PATH=/home/dev/.local/share/mise/shims:/home/dev/.local/bin:/home/dev/go/bin:/home/dev/.cargo/bin:/home/dev/.dotnet/tools:/usr/local/sbin:/usr/local/bin:/usr/local/cargo/bin:/usr/sbin:/usr/bin:/sbin:/bin

USER 1000:1000
WORKDIR /home/dev
