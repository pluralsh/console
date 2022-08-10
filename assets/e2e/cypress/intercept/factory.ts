import {GQLOperation, GQLResponseHandler, NoOpGQLResponseHandler} from '@ctypes/graphql';
import {CreateBuildQueryResponse} from '@intercept/query/build';

export class GQLResponseHandlerFactory {
  static new(op: GQLOperation): GQLResponseHandler {
    switch(op) {
      case 'CreateBuild':
        return new CreateBuildQueryResponse();
      default:
        // Use LogGQLResponseHandler to console.log unhandled operations
        return new NoOpGQLResponseHandler();
    }
  }
}
