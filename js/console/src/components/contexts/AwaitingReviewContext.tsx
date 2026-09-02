import { ApolloError } from '@apollo/client'
import {
  AwaitingReviewAgentRunFragment,
  AwaitingReviewStackFragment,
  AwaitingReviewWorkbenchActivityFragment,
  usePendingApprovalAgentRunsQuery,
  usePendingApprovalStacksQuery,
  usePendingApprovalWorkbenchActivitiesQuery,
} from 'generated/graphql'
import { createContext, ReactNode, use, useMemo } from 'react'
import { mapExistingNodes } from 'utils/graphql'

const POLL_INTERVAL = 60 * 1000

type AwaitingReviewContextValue = {
  stacks: AwaitingReviewStackFragment[]
  agentRuns: AwaitingReviewAgentRunFragment[]
  activities: AwaitingReviewWorkbenchActivityFragment[]
  count: number
  loading: boolean
  error?: ApolloError
}

const AwaitingReviewContext = createContext<AwaitingReviewContextValue>({
  stacks: [],
  agentRuns: [],
  activities: [],
  count: 0,
  loading: false,
})

export function useAwaitingReview() {
  return use(AwaitingReviewContext)
}

export function AwaitingReviewProvider({ children }: { children: ReactNode }) {
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

  const {
    data: activitiesData,
    loading: activitiesLoading,
    error: activitiesError,
  } = usePendingApprovalWorkbenchActivitiesQuery({
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

  const activities = useMemo(
    () => mapExistingNodes(activitiesData?.workbenchJobActivities),
    [activitiesData?.workbenchJobActivities]
  )

  const value = useMemo(
    () => ({
      stacks,
      agentRuns,
      activities,
      count: stacks.length + agentRuns.length + activities.length,
      loading: stacksLoading || agentRunsLoading || activitiesLoading,
      error: stacksError ?? agentRunsError ?? activitiesError,
    }),
    [
      stacks,
      agentRuns,
      activities,
      stacksLoading,
      agentRunsLoading,
      activitiesLoading,
      stacksError,
      agentRunsError,
      activitiesError,
    ]
  )

  return <AwaitingReviewContext value={value}>{children}</AwaitingReviewContext>
}
