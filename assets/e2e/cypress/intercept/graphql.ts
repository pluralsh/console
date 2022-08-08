import {CyHttpMessages} from 'cypress/types/net-stubbing';
import {Mutations} from './mutations';
import {Queries} from './queries';

type GQLOperation = keyof typeof Mutations | keyof typeof Queries;

export class GQLInterceptor {
  private static readonly _endpoint = '/gql';
  private static readonly _method = 'POST';
  private static readonly _operations = new Set<GQLOperation>([
    ...Object.values(Mutations),
    ...Object.values(Queries)
  ]);

  static setup(): void {
    cy.intercept(this._method, this._endpoint, this._routeHandler);
  }

  private static _routeHandler(req: CyHttpMessages.IncomingHttpRequest): void {
    const {body} = req;
    const operation = body?.operationName

    if (GQLInterceptor._operations.has(operation)) {
      console.log(operation);
      req.alias = operation;
    }
  }

  static wait(op: GQLOperation, timeout?: number): void {
    const alias = `@${op}`;
    timeout ? cy.wait(alias, {timeout}) : cy.wait(alias)
  }
}
