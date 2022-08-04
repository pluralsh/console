import {Config} from '@config/config';
import {BasePage} from '@pages/base';

export class LoginPage extends BasePage {
  private static readonly _url = '/';
  private static readonly _oidcLoginButtonSelector = '#plrl-login';
  private static readonly _emailInputSelector = `[name='Email address']`
  private static readonly _passwordInputSelector = `[name='Password']`

  static visit(): void {
    cy.wait(120000)
    cy.visit(this._url);
    cy.wait(120000)
  }

  static login(email: string = Config.EMAIL, password: string = Config.PASSWORD): void {
    this._oidcLoginButton().click();
    cy.wait(60000)
    this._emailInput().type(email);
    cy.wait(60000)
    this._continueButton().click();
    cy.wait(60000)
    this._passwordInput().type(password);
    cy.wait(60000)
    this._continueButton().click();
    cy.wait(60000)
    this._allowButton().click();
    cy.wait(60000)
    cy.wait('@gqlBuildsQuery')
  }

  private static _oidcLoginButton(): Cypress.Chainable {
    return this._get(this._oidcLoginButtonSelector);
  }

  private static _emailInput(): Cypress.Chainable {
    return this._get(this._emailInputSelector);
  }

  private static _passwordInput(): Cypress.Chainable {
    return this._get(this._passwordInputSelector);
  }

  private static _continueButton(): Cypress.Chainable {
    return this._contains('button', 'Continue');
  }

  private static _allowButton(): Cypress.Chainable {
    return this._contains('div', 'Allow');
  }
}
