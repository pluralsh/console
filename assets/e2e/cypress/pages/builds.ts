import {Mutations} from '@ctypes/mutations';
import {Queries} from '@ctypes/queries';
import {GQLInterceptor} from '@intercept/graphql';
import {CreateBuildQueryResponse} from '@intercept/query/build';
import {BasePage} from '@pages/base';
import {RootPage} from '@pages/root';

export class BuildsPage extends BasePage {
  static visit(buildID?: string): void {
    if(buildID) {
      cy.visit(`/build/${buildID}`);
      return;
    }

    RootPage.visit();
  }

  static deploy(): void {
    this._deployButton().click();
    this._verifyBuildStatus();
  }

  static bounce(): void {
    this._bounceButton().click();
    this._verifyBuildStatus();
  }

  private static _verifyBuildStatus(): void {
    GQLInterceptor.wait(Mutations.CreateBuild, () => {
      const id = GQLInterceptor.response<CreateBuildQueryResponse>(Mutations.CreateBuild).id;
      this.visit(id);
    });

    // wait for the build page to load
    GQLInterceptor.wait(Queries.Build);

    // wait until the deployment is done running
    cy.get('[id=build-status]', { timeout: 120000 }).should('not.have.css', 'background-color', 'rgb(0, 123, 255)')

    // ensure the deployment hasn't failed
    cy.get('[id=build-status]').contains('Failed').should('not.exist');

    // ensure the deployment was successful
    cy.get('[id=build-status]').contains('Passed').should('exist');
  }

  private static _bounceButton(): Cypress.Chainable {
    return this._contains('div', 'Bounce');
  }

  private static _deployButton(): Cypress.Chainable {
    return this._contains('div', 'Deploy');
  }
}
