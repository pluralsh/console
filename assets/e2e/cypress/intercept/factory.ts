import {GQLOperation, GQLResponseHandler, NoOpGQLResponseHandler} from '@ctypes/graphql';
import {CreateBuildQueryResponse} from '@intercept/query/build';

export class GQLResponseHandlerFactory {
  private static _cache: Map<GQLOperation, GQLResponseHandler> = new Map();

  static new(op: GQLOperation): GQLResponseHandler {
    if(GQLResponseHandlerFactory._cache.has(op)) {
      return GQLResponseHandlerFactory._cache.get(op);
    }

    switch(op) {
      case 'CreateBuild':
        return GQLResponseHandlerFactory._cache.set(op, new CreateBuildQueryResponse()).get(op);
      default:
        // Use LogGQLResponseHandler to console.log unhandled operations
        return GQLResponseHandlerFactory._cache.set(op, new NoOpGQLResponseHandler()).get(op);
    }
  }
}
