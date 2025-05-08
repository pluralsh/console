import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'
import {
  DeploymentSettingsFragment,
  useDeploymentSettingsQuery,
} from 'generated/graphql'
import { createContext, ReactNode, use, useMemo } from 'react'

import { isValidURL } from '../../utils/url'

const DeploymentSettingsContext = createContext<{
  data: Nullable<DeploymentSettingsFragment>
  loading: boolean
}>({ data: null, loading: false })

export function useDeploymentSettings(): Partial<DeploymentSettingsFragment> {
  const { data } = use(DeploymentSettingsContext)

  return data || ({} as Partial<DeploymentSettingsFragment>)
}

export function useLogsEnabled() {
  const ctx = useDeploymentSettings()

  return !!ctx?.logging?.enabled
}

export function useMetricsEnabled() {
  const ctx = useDeploymentSettings()

  return isValidURL(ctx?.prometheusConnection?.host ?? '')
}

export function useAIEnabled() {
  const ctx = useDeploymentSettings()

  return ctx.ai?.enabled
}

export function useOnboarded() {
  const { data, loading } = use(DeploymentSettingsContext)
  return data?.onboarded === true || loading // don't show popup if still loading settings
}

export function DeploymentSettingsProvider({
  children,
}: {
  children: ReactNode
}) {
  const { data, loading } = useDeploymentSettingsQuery({
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  })

  const providerValue = useMemo(
    () => ({ data: data?.deploymentSettings, loading }),
    [data?.deploymentSettings, loading]
  )

  return (
    <DeploymentSettingsContext value={providerValue}>
      {children}
    </DeploymentSettingsContext>
  )
}
