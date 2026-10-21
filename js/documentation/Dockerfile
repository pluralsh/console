FROM node:26.12.0-alpine AS base

WORKDIR /app

COPY js/package.json js/yarn.lock js/.yarnrc.yml ./
COPY js/.yarn/ ./.yarn/
COPY js/console/package.json ./console/package.json
COPY js/design-system/package.json ./design-system/package.json
COPY js/documentation/package.json ./documentation/package.json

# Focus skips the console app. The design system is focused too because Next
# transpiles and type-checks its source, which needs its dev-only type deps.
# Node 25+ no longer bundles corepack
RUN npm install -g corepack@0.36.0 \
  && corepack enable \
  && YARN_ENABLE_IMMUTABLE_INSTALLS=true \
    yarn workspaces focus @pluralsh/documentation @pluralsh/design-system

COPY js/design-system/ ./design-system/
COPY js/documentation/ ./documentation/

ARG NEXT_PUBLIC_ROOT_URL
ARG NEXT_PUBLIC_GA_ID

ENV NEXT_PUBLIC_ROOT_URL=$NEXT_PUBLIC_ROOT_URL
ENV NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID

# Biome is the js-ci Lint job, so the image runs next build directly.
RUN yarn workspace @pluralsh/documentation next build

FROM node:26.12.0-alpine AS production

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

WORKDIR /app

COPY --from=base --chown=node:node /app/documentation/.next/standalone/ ./
COPY --from=base --chown=node:node /app/documentation/.next/static/ ./documentation/.next/static/
COPY --from=base --chown=node:node /app/documentation/public/ ./documentation/public/
# Pages not prerendered at build time (fallback: 'blocking') read their
# markdown from here at request time.
COPY --from=base --chown=node:node /app/documentation/pages/ ./documentation/pages/

USER node
WORKDIR /app/documentation
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:3000/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
CMD ["node", "server.js"]
