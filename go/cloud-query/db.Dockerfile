ARG POSTGRES_MAJOR_VERSION=15
ARG POSTGRES_VERSION=${POSTGRES_MAJOR_VERSION}.19

FROM golang:1.27.1 AS libraries

# Configure versions for Steampipe extensions
# Do not use latest versions here, as they may not be compatible
ARG AWS_VERSION=1.30.8
ARG AZURE_VERSION=1.12.4
ARG GCP_VERSION=1.13.5
ARG VSPHERE_VERSION=0.1.1

WORKDIR /workspace

COPY hack/ hack/

# Run installer script and install
# provider extensions for AWS, Azure, and GCP
RUN mkdir -p /workspace/lib && \
    /workspace/hack/postgres.sh -p aws -v ${AWS_VERSION} -d /workspace/lib/ && \
    /workspace/hack/postgres.sh -p azure -v ${AZURE_VERSION} -d /workspace/lib/ && \
    /workspace/hack/postgres.sh -p gcp -v ${GCP_VERSION} -d /workspace/lib/ && \
    /workspace/hack/postgres.sh -p vsphere -v ${VSPHERE_VERSION} -d /workspace/lib/

FROM reg.mini.dev/postgres:${POSTGRES_VERSION}

ARG POSTGRES_MAJOR_VERSION

COPY --chmod=755 hack/init.sh /usr/local/bin/startup.sh

# Copy extension libraries
COPY --from=libraries /workspace/lib/steampipe_postgres_*.so /usr/lib/postgresql${POSTGRES_MAJOR_VERSION}/

# Copy extension SQL and control files
COPY --from=libraries /workspace/lib/steampipe_postgres_*.sql /usr/share/postgresql${POSTGRES_MAJOR_VERSION}/extension/
COPY --from=libraries /workspace/lib/steampipe_postgres_*.control /usr/share/postgresql${POSTGRES_MAJOR_VERSION}/extension/

# Switch to the postgres user
USER postgres

HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=5 \
  CMD pg_isready -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-postgres}" || exit 1

ENTRYPOINT ["/usr/local/bin/startup.sh"]
CMD ["postgres"]
