import {Condition} from '@ctypes/condition';
import {Mutations} from '@ctypes/mutations';
import {Queries} from '@ctypes/queries';
import {Time} from '@ctypes/time';
import {GQLInterceptor} from '@intercept/graphql';
import {CreateBuildQueryResponse} from '@intercept/query/build';
import {BasePage} from '@pages/base';
import {RootPage} from '@pages/root';

enum BuildStatus {
  Running = 'Running',
  Failed = 'Failed',
  Passed = 'Passed'
}

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
    this._ensure();
  }

  static bounce(): void {
    this._bounceButton().click();
    this._ensure();
  }

  private static _ensure(): void {
    GQLInterceptor.wait(Mutations.CreateBuild, () => {
      const id = GQLInterceptor.response<CreateBuildQueryResponse>(Mutations.CreateBuild).id;
      cy.wrap(id).should(Condition.NotBeEmpty);
      this.visit(id);
    });

    // wait for the build page to load
    GQLInterceptor.wait(Queries.Build);

    // wait until the deployment is done running
    this._buildStatus(BuildStatus.Running, 60 * Time.Second).should(Condition.NotExist);

    // ensure the deployment hasn't failed
    this._buildStatus(BuildStatus.Failed).should(Condition.NotExist);

    // ensure the deployment was successful
    this._buildStatus(BuildStatus.Passed).should(Condition.Exist);
  }

  private static _bounceButton(): Cypress.Chainable {
    return this._contains('div', 'Bounce');
  }

  private static _deployButton(): Cypress.Chainable {
    return this._contains('div', 'Deploy');
  }

  private static _buildStatus(status: BuildStatus | RegExp, timeout?: number): Cypress.Chainable {
    if(status === BuildStatus.Running) {
      status = /^\d{2}:\d{2}:\d{2}$/
    }

    return this._contains('#build-status', status, timeout ? {timeout} : undefined);
  }
}
