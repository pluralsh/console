ARG ELIXIR_VERSION=1.19.4
ARG OTP_VERSION=28.5
ARG OS_VARIANT=alpine
ARG OS_VERSION=3.23.4
ARG TOOLS_IMAGE=${OS_VARIANT}:${OS_VERSION}
ARG RUNNER_IMAGE=alpine:3.23.4 # TODO: change back to ${OS_VARIANT}:${OS_VERSION}

FROM node:24.11.1-alpine as node

WORKDIR /app

COPY js/package.json js/yarn.lock js/.yarnrc.yml ./
COPY js/.yarn/ ./.yarn/
COPY js/console/package.json ./console/package.json
COPY js/design-system/package.json ./design-system/package.json
COPY js/documentation/package.json ./documentation/package.json
COPY js/eslint-config/package.json ./eslint-config/package.json
COPY js/stylelint-config/package.json ./stylelint-config/package.json

# Focus skips documentation, Storybook, ESLint, and Stylelint. Vite bundles
# the design system from source, so the image only needs those two workspaces.
# Immutable installs match `yarn install --immutable` (CI is unset in Docker).
RUN corepack enable \
  && YARN_ENABLE_IMMUTABLE_INSTALLS=true \
    yarn workspaces focus console @pluralsh/design-system

COPY js/console/ ./console/
COPY js/design-system/ ./design-system/

ARG VITE_PROD_SECRET_KEY
ARG VITE_SENTRY_DSN
ARG SENTRY_AUTH_TOKEN
ARG GIT_COMMIT

ENV VITE_PROD_SECRET_KEY=${VITE_PROD_SECRET_KEY} \
    VITE_GIT_COMMIT=${GIT_COMMIT} \
    VITE_SENTRY_DSN=${VITE_SENTRY_DSN} \
    SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN}

# Typecheck is the js-ci Typecheck job. tsconfig.app.json is noEmit and
# the production bundle aliases @pluralsh/design-system to src.
RUN yarn workspace console build:no-tsc

FROM hexpm/elixir:${ELIXIR_VERSION}-erlang-${OTP_VERSION}-${OS_VARIANT}-${OS_VERSION} AS builder

ARG APP_NAME=console
ARG MIX_ENV=prod
ARG SKIP_PHOENIX=false
ARG OS_VARIANT=alpine

ENV SKIP_PHOENIX=${SKIP_PHOENIX} \
    APP_NAME=${APP_NAME} \
    MIX_ENV=${MIX_ENV} \
    OS_VARIANT=${OS_VARIANT} \
    MIX_OS_DEPS_COMPILE_PARTITION_COUNT=4

WORKDIR /opt/app

# hexpm/elixir-alpine has Mix and ca-certificates only. git is required for
# mix git deps; build-base is required for argon2_elixir's C NIF. Rust NIFs
# (mdex, mermaid_validator) ship precompiled and do not need rustc.
RUN if [ "$OS_VARIANT" = "alpine" ]; then \
      apk add --no-cache git build-base; \
    else \
      apt-get update && apt-get install -y --no-install-recommends git build-essential && \
      rm -rf /var/lib/apt/lists/*; \
    fi && \
  mix local.rebar --force && \
  mix local.hex --force

COPY mix.exs mix.lock ./
COPY config/config.exs config/${MIX_ENV}.exs config/
RUN mix do deps.get --only ${MIX_ENV} + deps.compile

COPY config/ config/
COPY src/ src/
COPY static/ static/
COPY priv/ priv/
COPY rel/ rel/
COPY lib/ lib/
COPY AGENT_VERSION KUBE_VERSION ./
COPY charts/controller/crds/ charts/controller/crds/
COPY go/client/generated/persisted-queries/queries.json go/client/generated/persisted-queries/
COPY js/console/src/generated/persisted-queries/client.json js/console/src/generated/persisted-queries/
RUN mix compile

COPY --from=node /app/console/build ./priv/static

RUN mix do db.certs, agent.chart, sentry.package_source_code, release

FROM alpine:3.21.3 as tools

ARG TARGETARCH=amd64
ENV CLI_VERSION=v0.12.66

COPY AGENT_VERSION AGENT_VERSION

RUN apk update && apk add --no-cache curl wget unzip
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

ARG OS_VARIANT=alpine

COPY --from=tools /usr/local/bin/plural /usr/local/bin/plural

WORKDIR /opt/app

RUN [ "$OS_VARIANT" = "alpine" ] && apk update && apk upgrade --no-cache libexpat zlib musl musl-utils || true

COPY bin/setup/${OS_VARIANT}.sh /opt/app/bin/setup.sh
RUN /bin/sh /opt/app/bin/setup.sh && rm /opt/app/bin/setup.sh

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

EXPOSE 4000 6000 4369 50051

CMD mkdir -p /tmp/sqlite; /opt/app/bin/console start
