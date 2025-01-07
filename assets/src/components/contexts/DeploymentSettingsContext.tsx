import { createContext, ReactNode, useContext, useMemo } from 'react'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import {
  DeploymentSettingsFragment,
  useDeploymentSettingsQuery,
} from 'generated/graphql'

import { isValidURL } from '../../utils/url'

const DeploymentSettingsContext = createContext<
  DeploymentSettingsFragment | undefined | null
>(null)

export function useDeploymentSettings() {
  const ctx = useContext(DeploymentSettingsContext)

  return ctx || ({} as Partial<DeploymentSettingsFragment>)
}

export function useLogsEnabled() {
  const ctx = useDeploymentSettings()

  return isValidURL(ctx?.lokiConnection?.host ?? '')
}

export function useMetricsEnabled() {
  const ctx = useDeploymentSettings()

  return isValidURL(ctx?.prometheusConnection?.host ?? '')
}

export function useAIEnabled() {
  const ctx = useDeploymentSettings()

  return !!ctx.ai?.enabled
}

export function DeploymentSettingsProvider({
  children,
}: {
  children: ReactNode
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
