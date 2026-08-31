FROM node:24.11.1

WORKDIR /app

ENV HUSKY=0

COPY js/package.json js/yarn.lock js/.yarnrc.yml ./
COPY js/.yarn/ ./.yarn/
COPY js/assets/package.json ./assets/package.json
COPY js/design-system/package.json ./design-system/package.json
COPY js/documentation/package.json ./documentation/package.json

RUN corepack enable \
  && yarn install --immutable

COPY js/assets/ ./assets/
COPY js/design-system/ ./design-system/

WORKDIR /app/assets
CMD ["yarn", "build"]
