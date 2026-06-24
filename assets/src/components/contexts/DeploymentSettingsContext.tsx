import {
  AvailableModel,
  AiProvider,
  DeploymentSettingsFragment,
  ModelDefault,
  useDeploymentSettingsQuery,
} from 'generated/graphql'
import { createContext, ReactNode, use, useMemo } from 'react'

import {
  modelDefaultForProvider,
  ModelDefaultsByProvider,
} from '../settings/ai/aiModelRoutingUtils'
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

/**
 * Returns AI model metadata for the current deployment settings.
 *
 * @returns {{
 *   loading: boolean
 *   default: Nullable<ModelDefault>
 *   available: ModelDefault[]
 *   defaultsByProvider: Partial<Record<AiProvider, ModelDefault>>
 * }}
 *
 * Hook result with:
 * - `available`: provider-level effective model defaults for configured
 *   providers returned by `availableModels`, using runtime settings first and
 *   static `defaultModels` only as fallback.
 * - `default`: the provider-level effective model defaults for
 *   `deploymentSettings.ai.provider`, selected from `available`.
 * - `defaultsByProvider`: the static per-provider fallback defaults from
 *   `defaultModels`.
 */
export function useAiModels(): {
  loading: boolean
  default: Nullable<ModelDefault>
  available: ModelDefault[]
  defaultsByProvider: Partial<Record<AiProvider, ModelDefault>>
} {
  const { loading, data, availableModels, defaultModels } = use(
    DeploymentSettingsContext
  )

  return useMemo(() => {
    const defaultsByProvider = Object.fromEntries(
      (defaultModels ?? [])
        .filter((modelDefault): modelDefault is ModelDefault => {
          return !!modelDefault?.provider
        })
        .map((modelDefault) => [modelDefault.provider, modelDefault])
    ) as ModelDefaultsByProvider
    const availableProviders = new Set<AiProvider>()

    availableModels?.forEach((option) => {
      if (option?.provider) availableProviders.add(option.provider)
    })

    const availableModelDefaults = Array.from(availableProviders).flatMap(
      (provider) => {
        const modelDefault = modelDefaultForProvider(
          provider,
          data?.ai,
          defaultsByProvider
        )

        return modelDefault ? [modelDefault] : []
      }
    )
    const defaultProvider = data?.ai?.provider
    const defaultModel =
      availableModelDefaults.find(
        ({ provider }) => provider === defaultProvider
      ) ?? null

    return {
      loading: loading && (!availableModels || !defaultModels),
      default: defaultModel,
      available: availableModelDefaults,
      defaultsByProvider,
    }
  }, [data, availableModels, defaultModels, loading])
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
