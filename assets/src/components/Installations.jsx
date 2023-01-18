import React, { useContext, useEffect } from 'react'
import { ThemeContext } from 'grommet'
import { useQuery } from '@apollo/client'

import { APPLICATIONS_Q, APPLICATION_SUB } from './graphql/plural'
import { LoopingLogo } from './utils/AnimatedLogo'

export const InstallationContext = React.createContext({})

export function ApplicationIcon({ application: { spec: { descriptor: { icons } } }, size }) {
  const { dark } = useContext(ThemeContext)

  return (
    <img
      alt=""
      src={(dark && icons[1]) ? icons[1] : icons[0]}
      width={size || '25px'}
      height={size || '25px'}
    />
  )
}

function applyDelta(prev, { delta, payload }) {
  switch (delta) {
  case 'CREATE':
    return { ...prev, applications: [...prev.applications, payload] }
  case 'DELETE':
    return { ...prev, applications: prev.applications.filter(({ name }) => name !== payload.name) }
  default:
    return { ...prev, applications: prev.applications.map(app => (app.name === payload.name ? payload : app)) }
  }
}

export function InstallationsProvider({ children }) {
  const { data, subscribeToMore, loading } = useQuery(APPLICATIONS_Q, { pollInterval: 120_000 })

  useEffect(() => subscribeToMore({
    document: APPLICATION_SUB,
    updateQuery: (prev, { subscriptionData: { data } }) => (data ? applyDelta(prev, data.applicationDelta) : prev),
  }), [subscribeToMore])

  if (loading || !data) return <LoopingLogo />

  return (
    <InstallationContext.Provider
      // eslint-disable-next-line react/jsx-no-constructed-context-values
      value={{
        applications: data?.applications || [],
        currentApplication: { name: 'mock', spec: { descriptor: { links: [] } } },
      }}
    >
      {children}
    </InstallationContext.Provider>
  )
}
