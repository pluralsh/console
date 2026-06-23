import {
  AvailableModel,
  AiProvider,
  DeploymentSettingsFragment,
  ModelDefault,
  useDeploymentSettingsQuery,
  WorkbenchJobModelAttributes,
} from 'generated/graphql'
import { createContext, ReactNode, use, useMemo } from 'react'
import { isNonNullable } from 'utils/isNonNullable'

import { isValidURL } from '../../utils/url'

const POLL_INTERVAL = 60 * 1000

const DeploymentSettingsContext = createContext<{
  data: Nullable<DeploymentSettingsFragment>
  defaultModels: Nullable<Array<Nullable<ModelDefault>>>
  availableModels: Nullable<Array<Nullable<AvailableModel>>>
  loading: boolean
}>({ data: null, defaultModels: null, availableModels: null, loading: false })

export function useDeploymentSettings(): Partial<DeploymentSettingsFragment> {
  const { data } = use(DeploymentSettingsContext)

  return data || ({} as Partial<DeploymentSettingsFragment>)
}

export function useLoadingDeploymentSettings() {
  const { loading, data } = use(DeploymentSettingsContext)

  return loading && !data
}

export function useAiModels(): {
  loading: boolean
  default: Nullable<WorkbenchJobModelAttributes>
  available: WorkbenchJobModelAttributes[]
  defaultsByProvider: Partial<Record<AiProvider, ModelDefault>>
} {
  const { loading, availableModels, defaultModels } = use(
    DeploymentSettingsContext
  )

  return useMemo(() => {
    const defaultModelEntry = defaultModels?.find(isNonNullable) ?? null
    const defaultModel =
      defaultModelEntry?.provider && defaultModelEntry?.model?.trim()
        ? ({
            provider: defaultModelEntry.provider,
            model: defaultModelEntry.model,
          } satisfies WorkbenchJobModelAttributes)
        : null
    const defaultsByProvider = Object.fromEntries(
      (defaultModels ?? [])
        .filter((modelDefault): modelDefault is ModelDefault => {
          return !!modelDefault?.provider
        })
        .map((modelDefault) => [modelDefault.provider, modelDefault])
    ) as Partial<Record<AiProvider, ModelDefault>>

    const dedupedAvailableModels = new Map<
      string,
      WorkbenchJobModelAttributes
    >()

    availableModels?.forEach((option) => {
      if (!option?.provider || !option.model?.trim()) return

      const normalizedOption = {
        provider: option.provider,
        model: option.model,
      } satisfies WorkbenchJobModelAttributes

      dedupedAvailableModels.set(
        `${normalizedOption.provider}:${normalizedOption.model}`,
        normalizedOption
      )
    })

    return {
      loading: loading && (!availableModels || !defaultModels),
      default: defaultModel,
      available: Array.from(dedupedAvailableModels.values()),
      defaultsByProvider,
    }
  }, [availableModels, defaultModels, loading])
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

export function useVectorStoreEnabled() {
  const ctx = useDeploymentSettings()

  return ctx.ai?.vectorStore?.enabled
}

export function useLatestK8sVsn() {
  const ctx = useDeploymentSettings()

  return ctx.latestK8sVsn
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
    () => ({
      data: data?.deploymentSettings,
      defaultModels: data?.defaultModels,
      availableModels: data?.availableModels,
      loading,
    }),
    [
      data?.availableModels,
      data?.defaultModels,
      data?.deploymentSettings,
      loading,
    ]
  )

  return (
    <DeploymentSettingsContext value={providerValue}>
      {children}
    </DeploymentSettingsContext>
  )
}
