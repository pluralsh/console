FROM cypress/included:10.4.0

COPY ./ /e2e/

WORKDIR /e2e

RUN yarn install

