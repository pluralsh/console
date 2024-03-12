import { RefreshDocument, RefreshQuery } from 'generated/graphql'
import { ErrorLink } from 'apollo-link-error'

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

  console.log('refreshResolverResponse', refreshResolverResponse)
  const jwt = refreshResolverResponse.data.refresh?.jwt

  setToken(jwt)

  return jwt
}

export const onErrorHandler: ErrorLink.ErrorHandler = ({
  graphQLErrors,
  networkError,
  operation,
  forward,
}) => {
  console.log('networkError', networkError)
  console.log('graphQLErrors', graphQLErrors)
  const refreshToken = fetchRefreshToken()
  const is401 = networkError && (networkError as any).statusCode === 401

  if (is401 && refreshToken) {
    console.log('refreshToken', refreshToken)
    console.log('operation', operation.operationName)

    // ignore 401 error for a refresh request
    if (operation.operationName === 'Refresh') {
      console.log('Refresh request', operation.variables)

      return
    }

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
        console.log('retry', operation)
        // Retry the failed request
        forward(operation)
      } catch (err) {
        console.log('refresh error', err)
        onNetworkError()
      }
    })()
  }
  if (is401) {
    console.log(networkError)
    onNetworkError()
  }
}

export function onNetworkError() {
  wipeToken()
  wipeRefreshToken()
  ;(window.location as any) = '/login'
}
