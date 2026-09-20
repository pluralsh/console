FROM node:24-alpine AS base

WORKDIR /app

RUN apk add --no-cache git

COPY js/package.json js/yarn.lock js/.yarnrc.yml js/.prettierrc.yaml ./
COPY js/.yarn/ ./.yarn/
COPY js/console/package.json ./console/package.json
COPY js/design-system/package.json ./design-system/package.json
COPY js/documentation/package.json ./documentation/package.json
COPY js/eslint-config/package.json ./eslint-config/package.json
COPY js/stylelint-config/package.json ./stylelint-config/package.json
RUN corepack enable \
  && yarn install --immutable

COPY js/design-system/ ./design-system/
COPY js/documentation/ ./documentation/
COPY js/eslint-config/ ./eslint-config/

ARG NEXT_PUBLIC_ROOT_URL
ARG NEXT_PUBLIC_GA_ID

ENV NEXT_PUBLIC_ROOT_URL=$NEXT_PUBLIC_ROOT_URL
ENV NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID

RUN yarn workspace @pluralsh/documentation build:next

FROM node:24-alpine AS production
WORKDIR /app

COPY --chown=node:node --from=base /app/node_modules/ ./node_modules/
COPY --chown=node:node --from=base /app/documentation/ ./documentation/

EXPOSE 3000

WORKDIR /app/documentation
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:3000/"]
CMD ["node", "/app/node_modules/next/dist/bin/next", "start", "-p", "3000"]
