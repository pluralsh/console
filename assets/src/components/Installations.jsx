import React, { useContext, useEffect } from 'react'
import { ThemeContext } from 'grommet'
import { useQuery } from 'react-apollo'

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

export const hasIcon = ({ spec: { descriptor: { icons } } }) => icons.length > 0

export function useEnsureCurrent(repo) {
  const { applications, currentApplication, setCurrentUnsafe } = useContext(InstallationContext)

  useEffect(() => {
    const desired = applications.find(({ name }) => name === repo)

    if (desired && currentApplication.name !== desired.name) {
      setCurrentUnsafe(desired)
    }
  }, [repo, applications, currentApplication])
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
  }), [])

  if (loading || !data) return <LoopingLogo />

  return (
    <InstallationContext.Provider
      // eslint-disable-next-line react/jsx-no-constructed-context-values
      value={{
        applications: data?.applications || [],
        currentApplication: { name: 'mock', spec: { descriptor: { links: [] } } }, // TODO: Remove.
      }}
    >
      {children}
    </InstallationContext.Provider>
  )
}
