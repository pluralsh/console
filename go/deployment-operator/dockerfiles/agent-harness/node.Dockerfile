ARG VERSION=24

ARG AGENT_HARNESS_IMAGE_TAG=0.6.11-claude-2.1.72
ARG AGENT_HARNESS_IMAGE_REPO=docker.io/pluralsh/agent-harness
ARG AGENT_HARNESS_IMAGE=$AGENT_HARNESS_IMAGE_REPO:$AGENT_HARNESS_IMAGE_TAG

FROM node:${VERSION}-slim AS node

FROM $AGENT_HARNESS_IMAGE AS final

USER root

RUN rm -rf /usr/local/bin/node

COPY --from=node /usr/local/bin/node /usr/local/bin/node

USER 65532:65532