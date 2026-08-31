FROM node:24.11.1

WORKDIR /app

ENV HUSKY=0

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/ ./.yarn/
COPY assets/package.json ./assets/package.json
COPY design-system/package.json ./design-system/package.json
COPY documentation/package.json ./documentation/package.json

RUN corepack enable \
  && yarn install --immutable

COPY assets/ ./assets/
COPY design-system/ ./design-system/

WORKDIR /app/assets
CMD ["yarn", "build"]
