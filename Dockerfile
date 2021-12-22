# The version of Alpine to use for the final image
# This should match the version of Alpine that the `elixir:1.7.2-alpine` image uses
ARG ALPINE_VERSION=3.8

FROM gcr.io/pluralsh/elixir:1.9-alpine-old AS builder

# The following are build arguments used to change variable parts of the image.
# The name of your application/release (required)
ARG APP_NAME
# The version of the application we are building (required)
ARG APP_VSN
# The environment to build with
ARG MIX_ENV=prod
# Set this to true if this release is not a Phoenix app
ARG SKIP_PHOENIX=false

ENV SKIP_PHOENIX=${SKIP_PHOENIX} \
    APP_NAME=${APP_NAME} \
    APP_VSN=${APP_VSN} \
    MIX_ENV=${MIX_ENV}

# By convention, /opt is typically used for applications
WORKDIR /opt/app

# This step installs all the build tools we'll need
RUN apk update && \
  apk upgrade --no-cache && \
  apk add --no-cache \
    nodejs \
    yarn \
    git \
    build-base && \
  mix local.rebar --force && \
  mix local.hex --force

# This copies our app source code into the build container
COPY . .

RUN mix do deps.get, compile
RUN ls -al

# This step builds assets for the Phoenix app (if there is one)
# If you aren't building a Phoenix app, pass `--build-arg SKIP_PHOENIX=true`
# This is mostly here for demonstration purposes
RUN if [ ! "$SKIP_PHOENIX" = "true" ]; then \
  cd assets && \
  yarn install && \
  yarn run build; \
fi

RUN \
  mkdir -p /opt/built && \
  mix distillery.release --name ${APP_NAME} && \
  cp _build/${MIX_ENV}/rel/${APP_NAME}/releases/${APP_VSN}/${APP_NAME}.tar.gz /opt/built && \
  cd /opt/built && \
  tar -xzf ${APP_NAME}.tar.gz && \
  rm ${APP_NAME}.tar.gz

FROM dkr.plural.sh/plural/plural-cli:0.1.1 as cmd

FROM gcr.io/pluralsh/alpine:3 as helm

ARG VERSION=3.3.1
ENV TERRAFORM_VERSION=0.15.2

# ENV BASE_URL="https://storage.googleapis.com/kubernetes-helm"
ENV BASE_URL="https://get.helm.sh"
ENV TAR_FILE="helm-v${VERSION}-linux-amd64.tar.gz"

RUN apk add --update --no-cache curl ca-certificates unzip wget openssl build-base && \
    curl -L ${BASE_URL}/${TAR_FILE} | tar xvz && \
    mv linux-amd64/helm /usr/local/bin/helm && \
    wget https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip && \
    unzip terraform_${TERRAFORM_VERSION}_linux_amd64.zip -d /usr/local/bin && \
    chmod +x /usr/local/bin/helm && \
    chmod +x /usr/local/bin/terraform

FROM gcr.io/pluralsh/docker:17.12.0-ce as static-docker-source

# From this line onwards, we're in a new image, which will be the image used in production
FROM gcr.io/pluralsh/erlang:22-alpine

ARG CLOUD_SDK_VERSION=273.0.0
ENV CLOUD_SDK_VERSION=$CLOUD_SDK_VERSION
ENV PATH /google-cloud-sdk/bin:$PATH

COPY --from=static-docker-source /usr/local/bin/docker /usr/local/bin/docker
COPY --from=cmd /go/bin/plural /usr/local/bin/plural
COPY --from=helm /usr/local/bin/helm /usr/local/bin/helm
COPY --from=helm /usr/local/bin/terraform /usr/local/bin/terraform

RUN apk --no-cache add \
        curl \
        # python3 \
        # py3-pip \
        # py-crcmod \
        bash \
        libc6-compat \
        openssh-client \
        git \
        gnupg

# The name of your application/release (required)
ARG APP_NAME
ARG GIT_COMMIT
ARG KUBECTL_VERSION='1.16.14'
ADD https://storage.googleapis.com/kubernetes-release/release/v${KUBECTL_VERSION}/bin/linux/amd64/kubectl /usr/local/bin/kubectl

RUN set -x && \
    apk add --no-cache curl openssl-dev ca-certificates bash && \
    chmod +x /usr/local/bin/kubectl && \
    kubectl version --client

ENV REPLACE_OS_VARS=true \
    APP_NAME=${APP_NAME} \
    GIT_ASKPASS=/root/bin/.git-askpass \
    SSH_ASKPASS=/root/bin/.ssh-askpass \
    GIT_COMMIT=${GIT_COMMIT}

WORKDIR /opt/app

RUN helm plugin install https://github.com/chartmuseum/helm-push && \
    helm plugin install https://github.com/databus23/helm-diff
RUN mkdir -p /root/.ssh && chmod 0700 /root/.ssh
RUN mkdir -p /root/.plural && mkdir -p /root/.creds && mkdir /root/bin
RUN ln -s /usr/local/bin/plural /usr/local/bin/forge

# add common repos to known hosts
RUN touch /root/.ssh/known_hosts
RUN ssh-keyscan github.com >> /root/.ssh/known_hosts
COPY bin /root/bin
RUN chmod +x /root/bin/.git-askpass && \ 
      chmod +x /root/bin/.ssh-askpass && \
      chmod +x /root/bin/ssh-add

COPY --from=builder /opt/built .

CMD trap 'exit' INT; eval $(ssh-agent -s); /opt/app/bin/${APP_NAME} foreground