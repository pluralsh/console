ARG POSTGRES_MAJOR_VERSION=15
ARG POSTGRES_VERSION=${POSTGRES_MAJOR_VERSION}.13

FROM golang:1.25.5 AS libraries

# Configure versions for Steampipe extensions
# Do not use latest versions here, as they may not be compatible
ARG AWS_VERSION=1.20.0
ARG AZURE_VERSION=1.4.0
ARG GCP_VERSION=1.10.0

WORKDIR /workspace

COPY hack/ hack/

ARG TARGETOS
ARG TARGETARCH

# Set gcloud CLI download URL based on architecture
RUN case ${TARGETARCH} in \
            amd64) GCLOUD_ARCH=x86_64 ;; \
            arm64) GCLOUD_ARCH=arm ;; \
            *) GCLOUD_ARCH=${TARGETARCH} ;; \
        esac && \
    curl https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-${TARGETOS}-${GCLOUD_ARCH}.tar.gz | tar -xz && \
    mv google-cloud-sdk /opt/google-cloud-sdk && \
    /opt/google-cloud-sdk/install.sh --quiet

# Install dependencies required by the installer script
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        bash \
        curl \
        ca-certificates

# Run installer script and install
# provider extensions for AWS, Azure, and GCP
RUN mkdir -p /workspace/lib && \
    /workspace/hack/postgres.sh -p aws -v ${AWS_VERSION} -d /workspace/lib/ && \
    /workspace/hack/postgres.sh -p azure -v ${AZURE_VERSION} -d /workspace/lib/ && \
    /workspace/hack/postgres.sh -p gcp -v ${GCP_VERSION} -d /workspace/lib/

FROM postgres:${POSTGRES_VERSION}

ARG POSTGRES_MAJOR_VERSION

# Install CA certificates and upgrade packages to fix CVEs:
# - openssl/libssl3t64: PKCS#12 NULL pointer dereference DoS (CVE in PKCS12_item_decrypt_d2i_ex)
# - gpg: GnuPG out-of-bounds write (CVE in armor_filter, fixed in 2.4.7-21+deb13u1)
# - libxml2: Uncontrolled recursion in XPath evaluation (CVE in xmlXPathRunEval, fixed in 2.12.7+dfsg+really2.9.14-2.1+deb13u2)
# - libpcre2-8-0: PCRE2 heap-buffer-overflow read in match_ref (CVE in SCS verb handling, fixed in 10.46-1~deb13u1)
RUN apt-get update && apt-get install -y ca-certificates openssl libssl3t64 gpg libxml2 libpcre2-8-0 && rm -rf /var/lib/apt/lists/* \
    && update-ca-certificates

COPY hack/init.sh /usr/local/bin/startup.sh
RUN chmod +x /usr/local/bin/startup.sh

# Copy extension libraries
COPY --from=libraries /workspace/lib/steampipe_postgres_*.so /usr/lib/postgresql/${POSTGRES_MAJOR_VERSION}/lib/

# Copy extension SQL and control files
COPY --from=libraries /workspace/lib//steampipe_postgres_*.sql /usr/share/postgresql/${POSTGRES_MAJOR_VERSION}/extension/
COPY --from=libraries /workspace/lib//steampipe_postgres_*.control /usr/share/postgresql/${POSTGRES_MAJOR_VERSION}/extension/

# Copy gcloud CLI
COPY --from=libraries /opt/google-cloud-sdk/bin/gcloud /usr/local/bin/gcloud

# Switch to the postgres user
USER postgres

ENTRYPOINT ["/usr/local/bin/startup.sh"]
CMD ["postgres"]