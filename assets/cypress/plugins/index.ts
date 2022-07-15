import webpack from '@cypress/webpack-preprocessor';
import { configuration } from './cy-ts-preprocessor';

// @ts-ignore
export default async (on, config: Cypress.Config) => {
  on('file:preprocessor', webpack(configuration));

  return config;
};
