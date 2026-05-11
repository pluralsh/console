ARG VERSION=25

ARG AGENT_HARNESS_IMAGE_TAG
ARG AGENT_HARNESS_IMAGE_REPO
ARG AGENT_HARNESS_IMAGE=$AGENT_HARNESS_IMAGE_REPO:$AGENT_HARNESS_IMAGE_TAG

FROM openjdk:${VERSION}-rc-slim AS openjdk

RUN ln -sfn $JAVA_HOME /usr/local/openjdk

FROM $AGENT_HARNESS_IMAGE AS final

COPY --from=openjdk /usr/lib /usr/lib
COPY --from=openjdk /usr/local /usr/local
COPY --from=openjdk /etc/ssl/certs /etc/ssl/certs

ENV JAVA_HOME=/usr/local/openjdk/
ENV PATH=${JAVA_HOME}/bin:${PATH}

USER 65532:65532
