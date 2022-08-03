import {Config} from '@config/config';
import {BasePage} from '@pages/base';
import { aliasQuery, aliasMutation } from '../utils/graphql-test-utils';

export class BuildsPage extends BasePage {
  static deploy(): void {
    this._deployButton().click();
    cy.wait('@gqlCreateBuildMutation') // wait for intercept 
      .then(interception => {
        // navigate to the build page for this deploy request
        console.log(interception.response)
        cy.visit('/build/'+interception.response.body.data.createBuild.id)
        
      });

    // wait for the build page to load
    cy.wait('@gqlBuildQuery')
    
    // wait until the deployment is done running
    cy.get('[id=build-status]', { timeout: 120000 }).should('not.have.css', 'background-color', 'rgb(0, 123, 255)')

    // ensure the deployment hasn't failed
    cy.get('[id=build-status]').contains('Failed').should('not.exist');

    // ensure the deployment was successful
    cy.get('[id=build-status]').contains('Passed').should('exist');
  }

  static bounce(): void {
    this._bounceButton().click();
    cy.wait('@gqlCreateBuildMutation') // wait for intercept 
      .then(interception => {
        // navigate to the build page for this bounce request
        cy.visit('/build/'+interception.response.body.data.createBuild.id)
        
      });

    // wait for the build page to load
    cy.wait('@gqlBuildQuery')
    
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
