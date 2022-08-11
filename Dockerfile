FROM node:16.16-alpine3.15 as node

FROM bitwalker/alpine-elixir:1.11.4 AS builder

# The following are build arguments used to change variable parts of the image.
# The name of your application/release (required)
ARG APP_NAME=console
# The environment to build with
ARG MIX_ENV=prod
# Set this to true if this release is not a Phoenix app
ARG SKIP_PHOENIX=false

ENV SKIP_PHOENIX=${SKIP_PHOENIX} \
    APP_NAME=${APP_NAME} \
    MIX_ENV=${MIX_ENV}

COPY --from=node /usr/lib /usr/lib
COPY --from=node /usr/local/share /usr/local/share
COPY --from=node /usr/local/lib /usr/local/lib
COPY --from=node /usr/local/include /usr/local/include
COPY --from=node /usr/local/bin /usr/local/bin

# By convention, /opt is typically used for applications
WORKDIR /opt/app

# This step installs all the build tools we'll need
RUN apk update --allow-untrusted && \
  apk upgrade --no-cache && \
  apk add --no-cache \
    yarn \
    git \
    build-base && \
  mix local.rebar --force && \
  mix local.hex --force

# This copies our app source code into the build container
COPY . .

# needed so that we can get the app version from the git tag
RUN git config --global --add safe.directory '/opt/app'

RUN mix do deps.get, compile
RUN ls -al

# This step builds assets for the Phoenix app (if there is one)
# If you aren't building a Phoenix app, pass `--build-arg SKIP_PHOENIX=true`
# This is mostly here for demonstration purposes
RUN if [ ! "$SKIP_PHOENIX" = "true" ]; then \
  cd assets && \
  yarn install && \
  yarn run build && \
  mkdir -p ../priv/static && \
  mv build/* ../priv/static && \
  rm -rf build; \
fi

RUN \
  mkdir -p /opt/built && \
  mix distillery.release --name ${APP_NAME} && \
  cp _build/${MIX_ENV}/rel/${APP_NAME}/releases/*/${APP_NAME}.tar.gz /opt/built && \
  cd /opt/built && \
  tar -xzf ${APP_NAME}.tar.gz && \
  rm ${APP_NAME}.tar.gz

FROM alpine:3.16.2 as tools

ARG TARGETARCH

# renovate: datasource=github-releases depName=helm/helm
ENV HELM_VERSION=v3.7.0

# renovate: datasource=github-releases depName=hashicorp/terraform
ENV TERRAFORM_VERSION=v0.15.2

# renovate: datasource=github-releases depName=pluralsh/plural-cli
ENV CLI_VERSION=v0.4.3

# renovate: datasource=github-tags depName=kubernetes/kubectl
ENV KUBECTL_VERSION=v1.16.14

#TODO: use TARGETARCH for Plural CLI when new release is cut
RUN apk add --update --no-cache curl ca-certificates unzip wget openssl build-base && \
    curl -L https://get.helm.sh/helm-${HELM_VERSION}-linux-${TARGETARCH}.tar.gz | tar xvz && \
    mv linux-amd64/helm /usr/local/bin/helm && \
    wget https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION/v/}/terraform_${TERRAFORM_VERSION/v/}_linux_${TARGETARCH}.zip && \
    unzip terraform_${TERRAFORM_VERSION/v/}_linux_${TARGETARCH}.zip -d /usr/local/bin && \
    curl -L https://github.com/pluralsh/plural-cli/releases/download/${CLI_VERSION}/plural-cli_${CLI_VERSION/v/}_Linux_x86_64.tar.gz | tar xvz plural && \
    mv plural /usr/local/bin/plural && \
    curl -LO https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/${TARGETARCH}/kubectl && \
    mv kubectl /usr/local/bin/kubectl && \
    chmod +x /usr/local/bin/kubectl && \
    chmod +x /usr/local/bin/plural && \
    chmod +x /usr/local/bin/helm && \
    chmod +x /usr/local/bin/terraform

FROM docker:17.12.0-ce as static-docker-source

# From this line onwards, we're in a new image, which will be the image used in production
FROM erlang:23.3.4.16-alpine

ARG CLOUD_SDK_VERSION=273.0.0
ENV CLOUD_SDK_VERSION=$CLOUD_SDK_VERSION
ENV PATH /google-cloud-sdk/bin:$PATH

COPY --from=static-docker-source /usr/local/bin/docker /usr/local/bin/docker
COPY --from=tools /usr/local/bin/helm /usr/local/bin/helm
COPY --from=tools /usr/local/bin/terraform /usr/local/bin/terraform
COPY --from=tools /usr/local/bin/plural /usr/local/bin/plural
COPY --from=tools /usr/local/bin/kubectl /usr/local/bin/kubectl

RUN apk --no-cache add \
        ca-certificates \
        curl \
        # python3 \
        # py3-pip \
        # py-crcmod \
        bash \
        libc6-compat \
        openssh-client \
        openssl-dev \
        git \
        gnupg

# The name of your application/release (required)
ARG APP_NAME=console
ARG GIT_COMMIT

ENV REPLACE_OS_VARS=true \
    APP_NAME=${APP_NAME} \
    GIT_ASKPASS=/root/bin/.git-askpass \
    SSH_ASKPASS=/root/bin/.ssh-askpass \
    GIT_COMMIT=${GIT_COMMIT}

WORKDIR /opt/app

RUN helm plugin install https://github.com/databus23/helm-diff --version 3.1.3
RUN mkdir -p /root/.ssh && chmod 0700 /root/.ssh
RUN mkdir -p /root/.plural && mkdir -p /root/.creds && mkdir /root/bin
RUN ln -s /usr/local/bin/plural /usr/local/bin/forge

# add common repos to known hosts
COPY bin /root/bin
RUN chmod +x /root/bin/.git-askpass && \ 
      chmod +x /root/bin/.ssh-askpass && \
      chmod +x /root/bin/ssh-add

ENV GIT_SSH_COMMAND="ssh -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no -o LogLevel=quiet"

COPY --from=builder /opt/built .

CMD trap 'exit' INT; eval $(ssh-agent -s); /opt/app/bin/${APP_NAME} foreground
