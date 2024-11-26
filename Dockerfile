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
ENV CLI_VERSION=v0.10.1

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
# COPY --from=tools /usr/local/bin/helm /usr/local/bin/helm
# COPY --from=tools /usr/local/bin/terraform /usr/local/bin/terraform
# COPY --from=tools /usr/local/bin/kubectl /usr/local/bin/kubectl

RUN apt-get update -y && \
  apt-get install -y libstdc++6 openssl openssh-server libncurses5 locales ca-certificates git gnupg bash \
  && apt-get clean && rm -f /var/lib/apt/lists/*_*

RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && locale-gen

ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8

# The name of your application/release (required)
ARG APP_NAME=console
ARG GIT_COMMIT

ENV REPLACE_OS_VARS=true \
    APP_NAME=${APP_NAME} \
    GIT_ASKPASS=/opt/app/bin/.git-askpass \
    SSH_ASKPASS=/opt/app/bin/.ssh-askpass \
    GIT_COMMIT=${GIT_COMMIT} \
    MIX_ENV=prod

WORKDIR /opt/app

RUN addgroup --gid 10001 app
RUN adduser --uid 10001 --gid 10001 console
RUN chown console:app /opt/app

RUN mkdir -p /root/.ssh && chmod 0700 /root/.ssh
RUN mkdir -p /root/.plural && mkdir -p /root/.creds && mkdir /root/bin
RUN ln -s /usr/local/bin/plural /usr/local/bin/forge

COPY bin/ssh-add /root/ssh-add
RUN chmod +x /root/ssh-add

# add common repos to known hosts
COPY bin /opt/app/bin
RUN chmod +x /opt/app/bin/.git-askpass && \ 
      chmod +x /opt/app/bin/.ssh-askpass && \
      chmod +x /opt/app/bin/ssh-add && \
      chown console:app /opt/app/bin/.ssh-askpass && \
      chown console:app /opt/app/bin/.git-askpass && \
      chown console:app /opt/app/bin/ssh-add

ENV GIT_SSH_COMMAND="ssh -i /root/.ssh/id_rsa -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no -o LogLevel=quiet" \
  SSH_ASKPASS_REQUIRE=force \
  DISPLAY=1

COPY --from=builder /opt/app/_build/prod/rel/console .

CMD /opt/app/bin/console start
