FROM cypress/included:10.4.0

# Install latest stable chromium browser
RUN apt-get -yq update \
 && apt-get -yq install --no-install-recommends \
    chromium \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

COPY ./ /e2e/

WORKDIR /e2e

RUN yarn install --immutable
