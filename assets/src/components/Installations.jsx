import { createContext, useEffect } from 'react'
import { useQuery } from '@apollo/client'

import { APPLICATIONS_Q, APPLICATION_SUB } from './graphql/plural'
import ShowAfterDelay from './utils/ShowAfterDelay'
import LoadingIndicator from './utils/LoadingIndicator'

export const InstallationContext = createContext({})

function applyDelta(prev, { delta, payload }) {
  switch (delta) {
    case 'CREATE':
      return { ...prev, applications: [...prev.applications, payload] }
    case 'DELETE':
      return {
        ...prev,
        applications: prev.applications.filter(
          ({ name }) => name !== payload.name
        ),
      }
    default:
      return {
        ...prev,
        applications: prev.applications.map((app) =>
          app.name === payload.name ? payload : app
        ),
      }
  }
}

export function InstallationsProvider({ children }) {
  const { data, subscribeToMore, loading } = useQuery(APPLICATIONS_Q, {
    pollInterval: 120_000,
  })

  useEffect(
    () =>
      subscribeToMore({
        document: APPLICATION_SUB,
        updateQuery: (prev, { subscriptionData: { data } }) =>
          data ? applyDelta(prev, data.applicationDelta) : prev,
      }),
    [subscribeToMore]
  )

  if (loading || !data) {
    return (
      <ShowAfterDelay>
        <LoadingIndicator />
      </ShowAfterDelay>
    )
  }

  return (
    <InstallationContext.Provider
      // eslint-disable-next-line react/jsx-no-constructed-context-values
      value={{ applications: data?.applications || [] }}
    >
      {children}
    </InstallationContext.Provider>
  )
}
