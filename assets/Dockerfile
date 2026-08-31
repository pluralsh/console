FROM node:24.11.1

WORKDIR /app

ENV HUSKY=0

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/ ./.yarn/
COPY assets/package.json ./assets/package.json
COPY assets/design-system/package.json ./assets/design-system/package.json
COPY documentation/package.json ./documentation/package.json

RUN corepack enable \
  && yarn install --immutable

COPY assets/ ./assets/

WORKDIR /app/assets
CMD ["yarn", "build"]
