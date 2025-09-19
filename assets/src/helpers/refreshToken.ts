import { FetchResult, Observable } from '@apollo/client'
import { NetworkError } from '@apollo/client/errors'
import { ErrorHandler } from '@apollo/client/link/error'
import { RefreshDocument, RefreshQuery } from 'generated/graphql'

import {
  fetchRefreshToken,
  setToken,
  wipeRefreshToken,
  wipeToken,
} from './auth'
import { authlessClient } from './client'

const RETURN_TO_KEY = 'plural-return-to'

export const getRefreshedToken = async () => {
  const refreshToken = fetchRefreshToken()
  const refreshResolverResponse = await authlessClient.query<RefreshQuery>({
    query: RefreshDocument,
    variables: { token: refreshToken },
    fetchPolicy: 'no-cache',
  })

  return refreshResolverResponse?.data?.refresh?.jwt
}

export const onErrorHandler: ErrorHandler = ({
  graphQLErrors,
  networkError,
  operation,
  forward,
}) => {
  const refreshToken = fetchRefreshToken()
  const is401 = networkError && (networkError as any).statusCode === 401
  const isUnauthenticated = graphQLErrors?.some?.(
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

    return new Observable<FetchResult>((observer) => {
      ;(async () => {
        try {
          const jwt = await getRefreshedToken()

          if (!jwt) {
            logoutWithReturnTo()
          } else {
            setToken(jwt)
          }

          operation.setContext(({ headers = {} }) => ({
            headers: {
              ...headers,
              authorization: `Bearer ${jwt}`,
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
          // Prevent logout if refresh endpoint is just unreachable
          if (
            (err as Nullable<{ networkError?: Nullable<NetworkError> }>)
              ?.networkError?.message === 'Failed to fetch'
          ) {
            return
          }
          logoutWithReturnTo()
        }
      })()
    })
  }

  if (is401) {
    logoutWithReturnTo()
  }
}

export function logoutWithReturnTo() {
  const returnPath = window.location.pathname + window.location.search
  if (returnPath) localStorage.setItem(RETURN_TO_KEY, returnPath)

  wipeToken()
  wipeRefreshToken()
  ;(window as Window).location = '/login'
}

export function getLoginReturnPath() {
  const returnTo = localStorage.getItem(RETURN_TO_KEY)
  localStorage.removeItem(RETURN_TO_KEY)
  if (
    typeof returnTo === 'string' &&
    returnTo.startsWith('/') &&
    !returnTo.startsWith('//')
  )
    return returnTo

  return '/'
}
