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
      req.alias = operation;
    }
  }

  static wait(op: GQLOperation, timeout?: number): void
  static wait(op: Array<GQLOperation>, timeout?: number): void
  static wait(op: GQLOperation | Array<GQLOperation>, timeout?: number): void {
    const handler = (o: GQLOperation) => {
      const alias = `@${o}`;
      timeout ? cy.wait(alias, {timeout}) : cy.wait(alias);
    }

    if(op instanceof Array) {
      op.forEach(handler)
      return;
    }


    handler(op);
  }
}
