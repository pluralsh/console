export abstract class BasePage {
  private static readonly _elementTimeout = 10000; // 10 seconds

  protected static _get(selector: string, options?: Partial<Cypress.Loggable & Cypress.Timeoutable & Cypress.Withinable & Cypress.Shadow>): Cypress.Chainable {
    return cy.get(selector, {...options, timeout: this._elementTimeout})
  }

  protected static _contains(selector: string, text: string, options?: Partial<Cypress.Loggable & Cypress.Timeoutable & Cypress.Withinable & Cypress.Shadow>): Cypress.Chainable {
    return cy.contains(selector, text, {...options, timeout: this._elementTimeout})
  }
}
