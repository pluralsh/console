FROM node:24-alpine AS base

WORKDIR /app

RUN apk add --no-cache git

COPY js/package.json js/yarn.lock js/.yarnrc.yml js/.prettierrc.yaml ./
COPY js/.yarn/ ./.yarn/
COPY js/console/package.json ./console/package.json
COPY js/design-system/package.json ./design-system/package.json
COPY js/documentation/package.json ./documentation/package.json
RUN corepack enable \
  && yarn install --immutable

COPY js/design-system/ ./design-system/
COPY js/documentation/ ./documentation/

ARG NEXT_PUBLIC_ROOT_URL
ARG NEXT_PUBLIC_GA_ID

ENV NEXT_PUBLIC_ROOT_URL=$NEXT_PUBLIC_ROOT_URL
ENV NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID

RUN yarn workspace @pluralsh/documentation build:next

FROM node:24-alpine AS production
WORKDIR /app

COPY --from=base /app/node_modules/ ./node_modules/
COPY --from=base /app/documentation/ ./documentation/

EXPOSE 3000

WORKDIR /app/documentation
CMD ["node", "/app/node_modules/next/dist/bin/next", "start", "-p", "3000"]
