import { defineConfig } from 'cypress';

export default defineConfig({
  fixturesFolder: false,
  e2e: { baseUrl: 'https://localhost:3000' },
});
