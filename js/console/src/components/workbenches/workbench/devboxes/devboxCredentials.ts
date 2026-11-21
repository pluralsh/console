import {
  AgentCredentialFragment,
  AgentCredentialKind,
  AgentCredentialProvider,
  AgentCredentialStatus,
  DevboxAgentBillingFragment,
  DevboxAgentType,
  DevboxBillingMode,
  useAgentCredentialsQuery,
  useDeleteAgentCredentialMutation,
  useLinkAgentCredentialMutation,
  useSetDefaultAgentBillingMutation,
  useSetDevboxAgentBillingMutation,
  useWorkbenchDevboxesQuery,
} from 'generated/graphql'
import { AgentCredentialsDocument } from 'generated/graphql-documents'
import dayjs from 'dayjs'
import { useCallback } from 'react'
import { isNonNullable } from 'utils/isNonNullable'
export const AI_SUBSCRIPTIONS_REL_PATH = 'ai-subscriptions'
export const AI_SUBSCRIPTIONS_ABS_PATH = `/profile/${AI_SUBSCRIPTIONS_REL_PATH}`

export type AgentCredential = AgentCredentialFragment

export type LinkAgentCredentialAttributes = {
  kind: AgentCredentialKind
  secret: string
  label?: string
  expiresAt?: string
  defaultBilling?: boolean
}

export type AgentCredentialsApi = {
  loading: boolean
  error?: Nullable<Error>
  credentials: AgentCredential[]
  link: (attrs: LinkAgentCredentialAttributes) => Promise<void>
  remove: (id: string) => Promise<void>
  setDefaultBilling: (
    provider: AgentCredentialProvider,
    enabled: boolean
  ) => Promise<void>
}

// v1 subscription plans: Claude plans power Claude Code, ChatGPT plans Codex
export const AGENT_PROVIDER: Partial<
  Record<DevboxAgentType, AgentCredentialProvider>
> = {
  [DevboxAgentType.Claude]: AgentCredentialProvider.Claude,
  [DevboxAgentType.Codex]: AgentCredentialProvider.Codex,
}

export const PROVIDER_PLAN: Record<AgentCredentialProvider, string> = {
  [AgentCredentialProvider.Claude]: 'Claude plan',
  [AgentCredentialProvider.Codex]: 'ChatGPT plan',
}

export function useAgentCredentials(): AgentCredentialsApi {
  const { data, loading, error } = useAgentCredentialsQuery({
    fetchPolicy: 'cache-and-network',
  })
  const refetchQueries = [{ query: AgentCredentialsDocument }]
  const [linkMutation] = useLinkAgentCredentialMutation({ refetchQueries })
  const [deleteMutation] = useDeleteAgentCredentialMutation({ refetchQueries })
  const [defaultMutation] = useSetDefaultAgentBillingMutation({
    refetchQueries,
  })

  return {
    loading: loading && !data,
    error,
    credentials: (data?.agentCredentials ?? []).filter(isNonNullable),
    link: async (attributes) => {
      await linkMutation({ variables: { attributes } })
    },
    remove: async (id) => {
      await deleteMutation({ variables: { id } })
    },
    setDefaultBilling: async (provider, enabled) => {
      await defaultMutation({ variables: { provider, enabled } })
    },
  }
}

export function useWorkbenchAllowsSubscriptions(
  workbenchId: Nullable<string>
): boolean {
  const { data } = useWorkbenchDevboxesQuery({
    variables: { id: workbenchId ?? '' },
    skip: !workbenchId,
  })
  return !!data?.workbench?.configuration?.devbox?.allowSubscriptionCredentials
}

// restarts one agent's ACP process on the AI proxy and resumes its threads
export function useSwitchToProxy() {
  const [mutation] = useSetDevboxAgentBillingMutation()
  return useCallback(
    async (instanceId: string, agent: DevboxAgentType) => {
      await mutation({
        variables: {
          instanceId,
          attributes: { agent, billing: DevboxBillingMode.Proxy },
        },
      })
    },
    [mutation]
  )
}

export const isUsableCredential = (
  c: Pick<AgentCredential, 'status' | 'expiresAt'>,
  now: Date = new Date()
) =>
  c.status === AgentCredentialStatus.Valid &&
  (!c.expiresAt || dayjs(c.expiresAt).isAfter(now))

export const linkedAgentsFrom = (credentials: AgentCredential[]) =>
  (Object.keys(AGENT_PROVIDER) as DevboxAgentType[]).filter((agent) =>
    credentials.some(
      (c) => c.provider === AGENT_PROVIDER[agent] && isUsableCredential(c)
    )
  )

// the start form's billing defaults: agents whose credential is marked default
export const defaultBillingFrom = (credentials: AgentCredential[]) =>
  Object.fromEntries(
    (Object.keys(AGENT_PROVIDER) as DevboxAgentType[]).flatMap((agent) =>
      credentials.some(
        (c) =>
          c.provider === AGENT_PROVIDER[agent] &&
          c.defaultBilling &&
          isUsableCredential(c)
      )
        ? [[agent, 'subscription' as const]]
        : []
    )
  )

export function billingBadgeLabel(
  billing: Pick<DevboxAgentBillingFragment, 'agent' | 'billing'>,
  ownerName?: Nullable<string>
) {
  const provider = billing.agent && AGENT_PROVIDER[billing.agent]
  if (billing.billing !== DevboxBillingMode.Subscription || !provider)
    return null
  return `On ${ownerName ? `${ownerName}'s` : 'a'} ${PROVIDER_PLAN[provider]}`
}

// agentConnections[].billing is a string ("proxy" or "subscription")
export const toBillingMode = (billing: Nullable<string>) =>
  billing?.toLowerCase().startsWith('subscription')
    ? DevboxBillingMode.Subscription
    : billing
      ? DevboxBillingMode.Proxy
      : null
