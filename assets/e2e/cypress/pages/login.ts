import { Config } from '@config/config'
import { BasePage } from '@pages/base'
import { RootPage } from '@pages/root'
import { Condition } from '@ctypes/condition'
import { Mutations } from '@ctypes/mutations'
import { Queries } from '@ctypes/queries'
import { GQLInterceptor } from '@intercept/graphql'

export class LoginPage extends BasePage {
  static login(email: string = Config.EMAIL, password: string = Config.PASSWORD): void {
    cy.session([email, password], () => {
      RootPage.visit()

      GQLInterceptor.wait(Queries.LoginInfo)

      this._oidcLoginButton.click()

      this._allowCookies.click()

      this._emailInput.type(email)
      this._continueButton.should(Condition.BeVisible).and(Condition.BeEnabled).click()

      GQLInterceptor.wait(Queries.LoginMethod)
      this._passwordInput.type(password)
      this._loginButton.should(Condition.BeVisible).and(Condition.BeEnabled).click()

      GQLInterceptor.wait([Mutations.Login, Queries.OIDCConsent])

      this._allowButton.should(Condition.BeVisible).click()

      GQLInterceptor.wait([Mutations.Consent, Mutations.Callback, Queries.Builds])
    })
  }

  private static get _oidcLoginButton(): Cypress.Chainable {
    return this._get('#plrl-login')
  }

  private static get _emailInput(): Cypress.Chainable {
    return this._get('input[placeholder*="email" i]')
  }

  private static get _passwordInput(): Cypress.Chainable {
    return this._get('input[type*="password" i]')
  }

  private static get _loginButton(): Cypress.Chainable {
    return this._get('button[type="submit"]')
  }

  private static get _continueButton(): Cypress.Chainable {
    return this._get('button[type="submit"]')
  }

  private static get _allowButton(): Cypress.Chainable {
    return this._contains('button', 'Allow')
  }

  private static get _allowCookies(): Cypress.Chainable {
    return this._contains('button', 'Allow all')
  }
}
