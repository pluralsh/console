import { ApolloError } from '@apollo/client'
import {
  AwaitingReviewAgentRunFragment,
  AwaitingReviewStackFragment,
  usePendingApprovalAgentRunsQuery,
  usePendingApprovalStacksQuery,
} from 'generated/graphql'
import { createContext, ReactNode, use, useMemo } from 'react'
import { mapExistingNodes } from 'utils/graphql'

const POLL_INTERVAL = 60 * 1000

type PendingApprovalStacksContextValue = {
  stacks: AwaitingReviewStackFragment[]
  agentRuns: AwaitingReviewAgentRunFragment[]
  count: number
  loading: boolean
  error?: ApolloError
}

const PendingApprovalStacksContext =
  createContext<PendingApprovalStacksContextValue>({
    stacks: [],
    agentRuns: [],
    count: 0,
    loading: false,
  })

export function usePendingApprovalStacks() {
  return use(PendingApprovalStacksContext)
}

export function PendingApprovalStacksProvider({
  children,
}: {
  children: ReactNode
}) {
  const {
    data: stacksData,
    loading: stacksLoading,
    error: stacksError,
  } = usePendingApprovalStacksQuery({
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })

  const {
    data: agentRunsData,
    loading: agentRunsLoading,
    error: agentRunsError,
  } = usePendingApprovalAgentRunsQuery({
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })

  const stacks = useMemo(
    () => mapExistingNodes(stacksData?.infrastructureStacks),
    [stacksData?.infrastructureStacks]
  )

  const agentRuns = useMemo(
    () => mapExistingNodes(agentRunsData?.agentRuns),
    [agentRunsData?.agentRuns]
  )

  const value = useMemo(
    () => ({
      stacks,
      agentRuns,
      count: stacks.length + agentRuns.length,
      loading: stacksLoading || agentRunsLoading,
      error: stacksError ?? agentRunsError,
    }),
    [
      stacks,
      agentRuns,
      stacksLoading,
      agentRunsLoading,
      stacksError,
      agentRunsError,
    ]
  )

  return (
    <PendingApprovalStacksContext value={value}>
      {children}
    </PendingApprovalStacksContext>
  )
}
