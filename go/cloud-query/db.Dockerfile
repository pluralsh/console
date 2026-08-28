ARG POSTGRES_MAJOR_VERSION=15
ARG POSTGRES_VERSION=${POSTGRES_MAJOR_VERSION}.18

FROM golang:1.26.6 AS libraries

# Configure versions for Steampipe extensions
# Do not use latest versions here, as they may not be compatible
ARG AWS_VERSION=1.30.8
ARG AZURE_VERSION=1.12.4
ARG GCP_VERSION=1.13.5
ARG VSPHERE_VERSION=0.1.1

WORKDIR /workspace

COPY hack/ hack/

ARG TARGETOS
ARG TARGETARCH

# Install dependencies required by the installer script
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        bash \
        curl \
        ca-certificates

# Set gcloud CLI download URL based on architecture
RUN case ${TARGETARCH} in \
            amd64) GCLOUD_ARCH=x86_64 ;; \
            arm64) GCLOUD_ARCH=arm ;; \
            *) GCLOUD_ARCH=${TARGETARCH} ;; \
        esac && \
    curl https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-${TARGETOS}-${GCLOUD_ARCH}.tar.gz | tar -xz && \
    mv google-cloud-sdk /opt/google-cloud-sdk && \
    /opt/google-cloud-sdk/install.sh --quiet

# Run installer script and install
# provider extensions for AWS, Azure, and GCP
RUN mkdir -p /workspace/lib && \
    /workspace/hack/postgres.sh -p aws -v ${AWS_VERSION} -d /workspace/lib/ && \
    /workspace/hack/postgres.sh -p azure -v ${AZURE_VERSION} -d /workspace/lib/ && \
    /workspace/hack/postgres.sh -p gcp -v ${GCP_VERSION} -d /workspace/lib/ && \
    /workspace/hack/postgres.sh -p vsphere -v ${VSPHERE_VERSION} -d /workspace/lib/

FROM dhi.io/postgres:${POSTGRES_VERSION}

ARG POSTGRES_MAJOR_VERSION

COPY --chmod=755 hack/init.sh /usr/local/bin/startup.sh

# Copy extension libraries
COPY --from=libraries /workspace/lib/steampipe_postgres_*.so /opt/postgresql/${POSTGRES_MAJOR_VERSION}/lib/

# Copy extension SQL and control files
COPY --from=libraries /workspace/lib/steampipe_postgres_*.sql /opt/postgresql/${POSTGRES_MAJOR_VERSION}/share/extension/
COPY --from=libraries /workspace/lib/steampipe_postgres_*.control /opt/postgresql/${POSTGRES_MAJOR_VERSION}/share/extension/

# Copy gcloud CLI
COPY --from=libraries /opt/google-cloud-sdk/bin/gcloud /usr/local/bin/gcloud

# Switch to the postgres user
USER postgres

HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=5 \
  CMD pg_isready -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-postgres}" || exit 1

ENTRYPOINT ["/usr/local/bin/startup.sh"]
CMD ["postgres"]
