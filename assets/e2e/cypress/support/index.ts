// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

import { GQLInterceptor } from '@intercept/graphql'

Cypress.on('uncaught:exception', () => false)

before(() => {
  cy.clearCookies()
  cy.clearLocalStorage()
  // Cookie to preset cookie consent to Allow all
  cy.setCookie('CookieConsent',
    '{stamp:%27Qkw6PZWUvBtscFb1mDYm2+J3xCsJ6030PuT8uahuzcUjr3FkzMix3Q==%27%2Cnecessary:true%2Cpreferences:true%2Cstatistics:true%2Cmarketing:true%2Cmethod:%27explicit%27%2Cver:2%2Cutc:1676483264501%2Cregion:%27us-06%27}',
    { domain: 'app.plural.sh' })
})
beforeEach(() => {
  GQLInterceptor.setup()
})
