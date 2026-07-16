FROM node:24.11.1

WORKDIR /app/assets

ENV HUSKY=0

COPY .yarn/ .yarn/
COPY .yarnrc.yml package.json yarn.lock ./
COPY design-system/package.json design-system/package.json

RUN corepack enable \
  && yarn install --immutable

COPY . .

CMD ["yarn", "build"]
