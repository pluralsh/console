import { createContext, useContext, useMemo } from 'react'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import {
  DeploymentSettingsFragment,
  useDeploymentSettingsQuery,
} from 'generated/graphql'

const DeploymentSettingsContext = createContext<
  DeploymentSettingsFragment | undefined | null
>(null)

export function useDeploymentSettings() {
  const ctx = useContext(DeploymentSettingsContext)

  return ctx || ({} as Partial<DeploymentSettingsFragment>)
}

export function useLogsEnabled() {
  const ctx = useDeploymentSettings()

  return !!ctx?.lokiConnection
}

export function useMetricsEnabled() {
  const ctx = useDeploymentSettings()

  return !!ctx?.prometheusConnection
}

export function DeploymentSettingsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { data } = useDeploymentSettingsQuery({
    pollInterval: POLL_INTERVAL,
    errorPolicy: 'all',
  })

  const providerValue = useMemo(
    () => data?.deploymentSettings,
    [data?.deploymentSettings]
  )

  return (
    <DeploymentSettingsContext.Provider value={providerValue}>
      {children}
    </DeploymentSettingsContext.Provider>
  )
}
