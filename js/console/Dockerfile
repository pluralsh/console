FROM node:24.11.1

WORKDIR /app

COPY js/package.json js/yarn.lock js/.yarnrc.yml ./
COPY js/.yarn/ ./.yarn/
COPY js/console/package.json ./console/package.json
COPY js/design-system/package.json ./design-system/package.json
COPY js/documentation/package.json ./documentation/package.json
COPY js/eslint-config/package.json ./eslint-config/package.json

RUN corepack enable \
  && yarn install --immutable

COPY js/console/ ./console/
COPY js/design-system/ ./design-system/

WORKDIR /app/console
CMD ["yarn", "build"]
