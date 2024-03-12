import { RefreshDocument, RefreshQuery } from 'generated/graphql'
import { FetchResult, Observable } from '@apollo/client'
import { ErrorHandler } from 'apollo-link-error'

import { client } from './client'
import {
  fetchRefreshToken,
  setToken,
  wipeRefreshToken,
  wipeToken,
} from './auth'

export const getRefreshedToken = async () => {
  const refreshToken = fetchRefreshToken()

  const refreshResolverResponse = await client.query<RefreshQuery>({
    query: RefreshDocument,
    variables: { token: refreshToken },
  })

  const jwt = refreshResolverResponse.data.refresh?.jwt

  console.log('DID IT', jwt)
  setToken(jwt)

  return jwt
}

export const onErrorHandler: ErrorHandler = ({
  graphQLErrors,
  networkError,
  operation,
  forward,
}) => {
  console.log('networkError', networkError)
  console.log('graphQLErrors', graphQLErrors)
  const refreshToken = fetchRefreshToken()
  const is401 = networkError && (networkError as any).statusCode === 401
  const isUnauthenticated = graphQLErrors?.some((err) => {
    console.log('err.message', err.message)

    return err.message === 'unauthenticated'
  })

  console.log('is401', is401)
  console.log('isUnauthenticated', isUnauthenticated)
  console.log('refreshToken', refreshToken)

  if (refreshToken && (is401 || isUnauthenticated)) {
    console.log('refreshToken', refreshToken)
    console.log('operation', operation.operationName)

    // ignore 401 error for a refresh request
    if (operation.operationName === 'Refresh') {
      console.log('Refresh request', operation.variables)

      return
    }

    const observable = new Observable<FetchResult>((observer) => {
      ;(async () => {
        try {
          const jwt = await getRefreshedToken()

          if (!jwt) {
            onNetworkError()
          }
          operation.setContext(({ headers = {} }) => ({
            headers: {
              authorization: `Bearer ${jwt}`,
              ...headers,
            },
          }))
          // Retry the failed request
          const subscriber = {
            next: observer.next.bind(observer),
            error: observer.error.bind(observer),
            complete: observer.complete.bind(observer),
          }

          forward(operation).subscribe(subscriber)
        } catch (err) {
          observer.error(err)
          onNetworkError()
        }
      })()
    })

    return observable
  }
  if (is401) {
    console.log(networkError)
    onNetworkError()
  }
}

export function onNetworkError() {
  wipeToken()
  wipeRefreshToken()
  window.location = '/login' as any as Location
}
