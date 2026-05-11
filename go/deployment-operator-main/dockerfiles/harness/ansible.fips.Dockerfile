ARG HARNESS_BASE_IMAGE_TAG=latest
ARG HARNESS_BASE_IMAGE_REPO=harness-base-fips
ARG HARNESS_BASE_IMAGE=$HARNESS_BASE_IMAGE_REPO:$HARNESS_BASE_IMAGE_TAG
ARG PYTHON_VERSION=3.12

# Use harness base image
FROM ${HARNESS_BASE_IMAGE} AS harness

# Build Ansible from Python Image
FROM registry.access.redhat.com/ubi8/ubi:latest AS final

# Set environment variables for FIPS compliance
ENV OPENSSL_FIPS=1
ENV FIPS_MODE=true

# Copy Harness bin from the Harness Image
COPY --from=harness /harness /usr/local/bin/harness
# Change ownership of the harness binary to UID/GID 65532
RUN chown -R 65532:65532 /usr/local/bin/harness

# Install build dependencies, Ansible, and openssh-client
ARG ANSIBLE_VERSION=9.0.0
ARG PYTHON_VERSION=3.12

# Install dependencies for building Python
RUN INSTALL_PKGS="python${PYTHON_VERSION} python${PYTHON_VERSION}-devel python${PYTHON_VERSION}-setuptools python${PYTHON_VERSION}-pip nss_wrapper \
        httpd httpd-devel mod_ssl mod_auth_gssapi mod_ldap \
        mod_session atlas-devel gcc-gfortran libffi-devel libtool-ltdl \
        enchant krb5-devel gcc openssl make" && \
    yum -y module enable  httpd:2.4 && \
    yum -y --setopt=tsflags=nodocs install $INSTALL_PKGS && \
    rpm -V $INSTALL_PKGS && \
    # Remove redhat-logos-httpd (httpd dependency) to keep image size smaller.
    rpm -e --nodeps redhat-logos-httpd && \
    yum -y clean all --enablerepo='*'

# Install Ansible via Pip.
RUN pip3 install --upgrade pip \
    && pip3 install setuptools-rust
RUN pip3 install --no-cache-dir ansible==${ANSIBLE_VERSION}

# Switch to the non-root user
USER 65532:65532
WORKDIR /plural

ENTRYPOINT ["harness", "--working-dir=/plural"]
