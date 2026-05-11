ARG HARNESS_BASE_IMAGE_TAG=latest
ARG HARNESS_BASE_IMAGE_REPO=ghcr.io/pluralsh/stackrun-harness-base
ARG HARNESS_BASE_IMAGE=$HARNESS_BASE_IMAGE_REPO:$HARNESS_BASE_IMAGE_TAG

FROM $HARNESS_BASE_IMAGE as harness

FROM debian:12-slim

COPY --from=harness /harness /usr/local/bin/harness

# Change ownership of the harness binary to UID/GID 65532
RUN addgroup --gid 65532 nonroot && \
  adduser --uid 65532 --gid 65532 --home /home/nonroot nonroot && \
  chown -R 65532:65532 /usr/local/bin/harness

RUN apt-get -y update && apt-get -y install curl unzip && \
      curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
      unzip awscliv2.zip && \
      ./aws/install

# Switch to the non-root user
USER 65532:65532

WORKDIR /plural

ENTRYPOINT ["harness", "--working-dir=/plural"]
