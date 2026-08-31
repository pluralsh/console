FROM node:24-alpine AS base

WORKDIR /app

RUN apk add --no-cache git

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/ ./.yarn/
COPY assets/package.json ./assets/package.json
COPY assets/design-system/package.json ./assets/design-system/package.json
COPY documentation/package.json ./documentation/package.json
RUN yarn install --immutable

COPY assets/design-system/ ./assets/design-system/
COPY documentation/ ./documentation/

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
