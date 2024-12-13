ARG ELIXIR_VERSION=1.16.3
ARG OTP_VERSION=26.2.5.5
ARG DEBIAN_VERSION=bullseye-20241111
ARG RUNNER_IMAGE=debian:${DEBIAN_VERSION}-slim

FROM node:16.16-alpine3.15 as node

WORKDIR /app

COPY assets/package.json ./package.json
COPY assets/yarn.lock ./yarn.lock
COPY assets/.yarn ./.yarn
COPY assets/.yarnrc.yml ./.yarnrc.yml

RUN npm config set unsafe-perm true
RUN yarn install

COPY assets/ ./

ARG VITE_PROD_SECRET_KEY
ENV VITE_PROD_SECRET_KEY=${VITE_PROD_SECRET_KEY}

RUN yarn run build

FROM hexpm/elixir:${ELIXIR_VERSION}-erlang-${OTP_VERSION}-debian-${DEBIAN_VERSION}-slim AS builder

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

# By convention, /opt is typically used for applications
WORKDIR /opt/app

# This step installs all the build tools we'll need
RUN apt-get update -y && apt-get install -y git build-essential && \
  mix local.rebar --force && \
  mix local.hex --force

# This copies our app source code into the build container
COPY . .

# needed so that we can get the app version from the git tag
RUN git config --global --add safe.directory '/opt/app'

RUN mix do deps.get, compile
RUN ls -al

COPY --from=node /app/build ./priv/static

RUN mix release

FROM ${RUNNER_IMAGE} as tools

ARG TARGETARCH=amd64

# renovate: datasource=github-releases depName=helm/helm
# ENV HELM_VERSION=v3.16.3

# renovate: datasource=github-releases depName=hashicorp/terraform
# ENV TERRAFORM_VERSION=v1.9.8

# renovate: datasource=github-releases depName=pluralsh/plural-cli
ENV CLI_VERSION=v0.10.3

# renovate: datasource=github-tags depName=kubernetes/kubernetes
# ENV KUBECTL_VERSION=v1.31.3

RUN apt-get update -y && apt-get install -y curl wget unzip
RUN curl -L https://github.com/pluralsh/plural-cli/releases/download/${CLI_VERSION}/plural-cli_${CLI_VERSION#v}_Linux_${TARGETARCH}.tar.gz | tar xvz plural && \
  mv plural /usr/local/bin/plural && \
  # curl -L https://get.helm.sh/helm-${HELM_VERSION}-linux-${TARGETARCH}.tar.gz | tar xvz && \
  # mv linux-${TARGETARCH}/helm /usr/local/bin/helm && \
  # wget https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION#v}/terraform_${TERRAFORM_VERSION#v}_linux_${TARGETARCH}.zip && \
  # unzip terraform_${TERRAFORM_VERSION#v}_linux_${TARGETARCH}.zip -d /usr/local/bin && \
  # curl -LO https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/${TARGETARCH}/kubectl && \
  # mv kubectl /usr/local/bin/kubectl && \
  # chmod +x /usr/local/bin/kubectl && \
  # chmod +x /usr/local/bin/helm && \
  # chmod +x /usr/local/bin/terraform
  chmod +x /usr/local/bin/plural

# From this line onwards, we're in a new image, which will be the image used in production
FROM ${RUNNER_IMAGE}

COPY --from=tools /usr/local/bin/plural /usr/local/bin/plural

WORKDIR /opt/app

RUN  echo "deb http://deb.debian.org/debian bullseye-backports main" >/etc/apt/sources.list.d/bullseye-backports.list && \
  apt-get update -y && \
  apt-get install -y libstdc++6 openssl libncurses5 locales ca-certificates git-man/bullseye-backports git/bullseye-backports gnupg bash && \
  apt-get clean && rm -f /var/lib/apt/lists/*_* && \
  sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && locale-gen && \
  addgroup --gid 10001 app && \
  adduser --home /home/console --uid 10001 --gid 10001 console && \
  chown console:app /opt/app && \
  mkdir -p /opt/app/data

ARG APP_NAME=console
ARG GIT_COMMIT

ENV REPLACE_OS_VARS=true \
    APP_NAME=${APP_NAME} \
    GIT_ASKPASS=/opt/app/bin/.git-askpass \
    SSH_ASKPASS=/opt/app/bin/.ssh-askpass \
    GIT_COMMIT=${GIT_COMMIT} \
    MIX_ENV=prod \
    LANG=en_US.UTF-8 \
    LANGUAGE=en_US:en \
    LC_ALL=en_US.UTF-8 \
    GIT_SSH_COMMAND="ssh -i /home/console/.ssh/id_rsa -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no -o LogLevel=quiet" \
    SSH_ASKPASS_REQUIRE=force \
    DISPLAY=1

COPY bin /opt/app/bin

RUN chmod +x /opt/app/bin/.git-askpass && \ 
  chmod +x /opt/app/bin/.ssh-askpass && \
  chown console:app /opt/app/bin/.ssh-askpass && \
  chown console:app /opt/app/bin/.git-askpass

COPY --from=builder /opt/app/_build/prod/rel/console .

USER console

CMD mkdir -p /tmp/sqlite; /opt/app/bin/console start
