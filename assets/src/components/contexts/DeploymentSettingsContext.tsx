import { createContext, useContext, useMemo } from 'react'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import { useCDEnabled } from 'components/cd/utils/useCDEnabled'
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

export function DeploymentSettingsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { data } = useDeploymentSettingsQuery({
    pollInterval: POLL_INTERVAL,
    errorPolicy: 'all',
  })

  useCDEnabled({ redirect: false })

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
