---
title: Remote browser setup
description: Enable browser sidecars and prepare repositories for E2E testing.
---
Remote browser support lets the agent run headless browser tests in the same pod as the agent runtime. The browser server is exposed on `localhost:3000`, and the agent uses Docker/Docker Compose (via DinD) to run your test commands.
Using the browser sidecar is recommended when possible because it lets you set dedicated pod resource limits for the browser container via `AgentRuntime`. This avoids running heavy browsers inside DinD and gives you predictable memory/CPU isolation for test workloads.

## How it works

- The agent runtime pod includes a DinD container and a browser sidecar container.
- The agent runs Docker or Docker Compose inside DinD to build and run your app and test containers.
- Test containers connect to the sidecar on `localhost:3000` using the appropriate protocol.

## AgentRuntime browser configuration

Enable DinD and the browser sidecar in `AgentRuntime`:
For field-level details, see the [BrowserConfig API reference](/api-reference/kubernetes/agent-api-reference#browserconfig) and [Browser enum API reference](/api-reference/kubernetes/agent-api-reference#browser).

```yaml
spec:
  dind: true
  browser:
    enabled: true
    browser: chrome
```

Supported browser values include:

- `chrome`, `chromium`, `firefox`
- `selenium-chrome`, `selenium-chromium`, `selenium-firefox`, `selenium-edge`
- `puppeteer`
- `custom`

If you need a custom image, set `browser: custom` and supply a container that binds to port 3000:

```yaml
spec:
  browser:
    enabled: true
    browser: custom
    container:
      name: browser
      image: selenium/standalone-chrome:144.0
      env:
      - name: SE_OPTS
        value: "--port 3000"
```

When using non-custom browser values, you can only override environment variables, resource limits, and image pull policy. This is the recommended place to raise browser memory/CPU limits for heavy test suites:

```yaml
spec:
  browser:
    enabled: true
    browser: chrome
    container:
      resources:
        requests:
          cpu: "500m"
          memory: "1Gi"
        limits:
          cpu: "2"
          memory: "4Gi"
```

## Browser endpoints

- **Browserless (chrome/chromium/firefox/puppeteer):** websocket endpoint on `ws://localhost:3000` (Playwright uses `ws://localhost:3000/chrome/playwright` by default).
- **Selenium:** HTTP endpoint on `http://localhost:3000`.

## Repository setup for remote browser tests

Because the agent runtime only has access to Docker and Docker Compose, your repository should provide containerized test commands that:

1. start the app stack in containers, and
2. connect to the remote browser sidecar at `localhost:3000`.

Use environment variables in your test code to switch between local and remote browsers, then wire those env vars in your Compose services or scripts.
When running in containers, use a network mode that allows access to both endpoints (for example, host networking or an explicit network with proper routing).

### Compose layout for app + tests

Use a dedicated app proxy (for example, `nginx`) that exposes a single port, then run test containers against that base URL.

```yaml
services:
  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    environment:
      APP_ADDR: :8080
    ports:
    - "8080:8080"

  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
    command: sh -c "npm ci && npm run dev"
    ports:
    - "5173:5173"

  nginx:
    image: nginx:1.27
    volumes:
    - ./nginx/dev.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
    - frontend
    - backend
    ports:
    - "8088:80"
```

The `nginx` container provides a stable base URL for tests (`http://localhost:8088` when host ports are published).

### Minimal Dockerfiles for app services

Keep your Dockerfiles simple and fast so the agent can build and run them inside DinD.

```dockerfile
FROM golang:1.25

WORKDIR /app

COPY go.work ./
COPY backend/go.mod backend/go.sum ./backend/
COPY shared/go.mod ./shared/

RUN cd backend && go mod download

EXPOSE 8080

CMD ["go", "run", "./backend/cmd/server"]
```

```dockerfile
FROM node:25

WORKDIR /app

COPY frontend/ ./frontend/

WORKDIR frontend
```

### Playwright (remote browser)

Use `playwright-core` and connect to the remote websocket. The test container runs on host networking so it can reach both the app (`localhost:8088`) and the sidecar (`localhost:3000`).

```yaml
services:
  e2e-playwright-remote:
    image: node:25
    network_mode: host
    working_dir: /app/frontend
    command: sh -c "npm ci && npm run test:e2e:playwright:remote"
    environment:
      PLAYWRIGHT_WS_ENDPOINT: ws://localhost:3000/chrome/playwright
      PLAYWRIGHT_BASE_URL: http://localhost:8088
    depends_on:
    - nginx
    volumes:
    - ./frontend/e2e/playwright/remote:/app/frontend/e2e/playwright/remote
    - ./frontend/playwright.remote.config.js:/app/frontend/playwright.remote.config.js
    - ./frontend/package.json:/app/frontend/package.json
    - ./frontend/package-lock.json:/app/frontend/package-lock.json
```

```javascript
import { test as base } from "@playwright/test";
import { chromium } from "playwright-core";

const wsEndpoint =
  process.env.PLAYWRIGHT_WS_ENDPOINT || "ws://localhost:3000/chrome/playwright";

const test = base.extend({
  browser: async ({}, use) => {
    const browser = await chromium.connect(wsEndpoint);
    await use(browser);
    await browser.close();
  }
});
```

### Puppeteer (remote browser)

Connect to a remote browser via `PUPPETEER_WS_ENDPOINT` and keep the base URL configurable.

```javascript
import puppeteer from "puppeteer-core";

const wsEndpoint = process.env.PUPPETEER_WS_ENDPOINT || "ws://localhost:3000";
const baseUrl = process.env.PUPPETEER_BASE_URL || "http://localhost:8088";

const browser = await puppeteer.connect({ browserWSEndpoint: wsEndpoint });
const page = await browser.newPage();
await page.goto(baseUrl);
```

```yaml
services:
  e2e-puppeteer-remote:
    image: node:25
    network_mode: host
    working_dir: /app/frontend
    command: sh -c "npm ci && npm run test:e2e:puppeteer:remote"
    environment:
      PUPPETEER_WS_ENDPOINT: ws://localhost:3000
      PUPPETEER_BASE_URL: http://localhost:8088
    depends_on:
    - nginx
    volumes:
    - ./frontend/e2e/puppeteer:/app/frontend/e2e/puppeteer
    - ./frontend/package.json:/app/frontend/package.json
    - ./frontend/package-lock.json:/app/frontend/package-lock.json
```

### Selenium (remote browser)

Point the WebDriver at `SELENIUM_REMOTE_URL` and keep the app URL configurable.

```javascript
import { Builder } from "selenium-webdriver";

const remoteUrl = process.env.SELENIUM_REMOTE_URL || "http://localhost:3000";
const baseUrl = process.env.SELENIUM_BASE_URL || "http://localhost:8088";

const driver = await new Builder().usingServer(remoteUrl).forBrowser("chrome").build();
await driver.get(baseUrl);
```

```yaml
services:
  e2e-selenium-remote:
    image: node:25
    network_mode: host
    working_dir: /app/frontend
    command: sh -c "npm ci && npm run test:e2e:selenium:remote"
    environment:
      SELENIUM_REMOTE_URL: http://localhost:3000
      SELENIUM_BASE_URL: http://localhost:8088
    depends_on:
    - nginx
    volumes:
    - ./frontend/e2e/selenium:/app/frontend/e2e/selenium
    - ./frontend/package.json:/app/frontend/package.json
    - ./frontend/package-lock.json:/app/frontend/package-lock.json
```

### Cypress (DinD only)

Cypress does not support remote browser execution. Run Cypress entirely in Docker and point it at your app base URL.

```yaml
services:
  cypress:
    image: cypress/browsers:24.13.0
    working_dir: /app/frontend
    command: sh -c "npm ci && npx cypress run --config baseUrl=http://nginx"
    depends_on:
    - nginx
    volumes:
    - ./frontend/e2e/cypress:/app/frontend/e2e/cypress
    - ./frontend/cypress.config.js:/app/frontend/cypress.config.js
    - ./frontend/package.json:/app/frontend/package.json
    - ./frontend/package-lock.json:/app/frontend/package-lock.json
```

### Best practices

- Keep base URLs and websocket endpoints configurable via environment variables.
- Provide dockerized commands for E2E tests so the agent can run them without host tooling.
- Avoid hard-coding ports or hostnames in test files; use a single config module if possible.
- Ensure your test commands only require the app and remote browser endpoints to run.
- Cypress does not support remote browser execution; run it fully in Docker with DinD instead of connecting to the sidecar.
- The browser sidecar lets you set dedicated pod resource limits for the browser container, which helps with memory/CPU-heavy browsers.
