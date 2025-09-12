# ARG ELIXIR_VERSION=1.18.3
# ARG OTP_VERSION=27.3.2
# ARG OS_VARIANT=alpine
# ARG OS_VERSION=3.21.3
# ARG TOOLS_IMAGE=${OS_VARIANT}:${OS_VERSION}
# ARG RUNNER_IMAGE=${OS_VARIANT}:${OS_VERSION}

FROM node:20-alpine as node

WORKDIR /app

COPY assets/package.json ./package.json
COPY assets/yarn.lock ./yarn.lock
COPY assets/.yarn ./.yarn
COPY assets/.yarnrc.yml ./.yarnrc.yml

RUN yarn install

COPY assets/ ./

ARG VITE_PROD_SECRET_KEY
ARG VITE_SENTRY_DSN
ARG SENTRY_AUTH_TOKEN
ARG GIT_COMMIT

ENV VITE_PROD_SECRET_KEY=${VITE_PROD_SECRET_KEY} \
    VITE_GIT_COMMIT=${GIT_COMMIT} \
    VITE_SENTRY_DSN=${VITE_SENTRY_DSN} \
    SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN}

RUN echo "=== SENTRY CHECK ===" && node -e "console.log('SENTRY LENGTH:', (process.env.SENTRY_AUTH_TOKEN||'').length)" && echo "=== END CHECK ==="
RUN NODE_OPTIONS="--max-old-space-size=4096" yarn run build:no-tsc
