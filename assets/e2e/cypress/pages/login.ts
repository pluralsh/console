import {Config} from '@config/config';
import {BasePage} from '@pages/base';

export class LoginPage extends BasePage {
  private static readonly _url = '/';
  private static readonly _oidcLoginButtonSelector = '#plrl-login';
  private static readonly _emailInputSelector = `[name='Email address']`
  private static readonly _passwordInputSelector = `[name='Password']`

  static visit(): void {
    cy.visit(this._url);
  }

  static login(email: string = Config.EMAIL, password: string = Config.PASSWORD): void {
    cy.wait('@gqlLoginInfoQuery')
    this._oidcLoginButton().click();
    cy.origin('app.plural.sh', 
    { args: {email, password} },
    
    ({ email, password }) => {
      cy.get(`[name='Email address']`).type(email);
      // this._emailInput().type(email);
      cy.contains('button', 'Continue').should('be.visible').and('be.enabled').click();

      cy.wait('@gqlLoginMethodQuery')

      // this._continueButton().click();
      cy.get(`[name='Password']`).type(password);
      // this._passwordInput().type(password);
      cy.contains('button', 'Continue').should('be.visible').and('be.enabled').click();

      cy.wait('@gqlLoginMutation')
      // cy.wait('@gqlAcceptLoginMutation')
      cy.wait('@gqlOIDCConsentQuery')

      // this._continueButton().click();
      cy.contains('div', 'Allow').should('be.visible').click();
      // this._allowButton().click();


      cy.wait('@gqlConsentMutation')
      cy.wait('@gqlCallbackMutation')
  })
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
