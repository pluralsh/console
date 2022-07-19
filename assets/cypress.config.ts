import { defineConfig } from 'cypress';

export default defineConfig({
  fixturesFolder: false,
  chromeWebSecurity: false,
  video: true,
  e2e: {
    baseUrl: 'https://localhost:3000',
    chromeWebSecurity: false,
    supportFile: 'cypress/support/index.ts',
    experimentalSessionAndOrigin: true,
  },
});
