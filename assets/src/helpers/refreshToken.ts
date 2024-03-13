import { RefreshDocument, RefreshQuery } from 'generated/graphql'
import { FetchResult } from '@apollo/client'
import { Observable } from 'apollo-link'
import { ErrorHandler } from 'apollo-link-error'

import { authlessClient } from './client'
import {
  fetchRefreshToken,
  setToken,
  wipeRefreshToken,
  wipeToken,
} from './auth'

export const getRefreshedToken = async () => {
  const refreshToken = fetchRefreshToken()
  const refreshResolverResponse = await authlessClient.query<RefreshQuery>({
    query: RefreshDocument,
    variables: { token: refreshToken },
  })
  const jwt = refreshResolverResponse.data.refresh?.jwt

  setToken(jwt)

  return jwt
}

export const onErrorHandler: ErrorHandler = ({
  graphQLErrors,
  networkError,
  operation,
  forward,
}) => {
  const refreshToken = fetchRefreshToken()
  const is401 = networkError && (networkError as any).statusCode === 401
  const isUnauthenticated = graphQLErrors?.some(
    (err) =>
      err.message === 'unauthenticated' || err.message === 'invalid_token'
  )

  // Attempt to refresh jwt if we have a refresh token and the request is
  // unauthenticated
  if (refreshToken && (is401 || isUnauthenticated)) {
    // Allow Refresh to fail without retrying
    if (operation.operationName === 'Refresh') {
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
    onNetworkError()
  }
}

export function onNetworkError() {
  wipeToken()
  wipeRefreshToken()
  window.location = '/login' as any as Location
}
