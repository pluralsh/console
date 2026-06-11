import { ApolloError } from '@apollo/client'
import {
  AwaitingReviewStackFragment,
  usePendingApprovalStacksQuery,
} from 'generated/graphql'
import { createContext, ReactNode, use, useMemo } from 'react'
import { mapExistingNodes } from 'utils/graphql'

const POLL_INTERVAL = 60 * 1000

type PendingApprovalStacksContextValue = {
  stacks: AwaitingReviewStackFragment[]
  count: number
  loading: boolean
  error?: ApolloError
}

const PendingApprovalStacksContext =
  createContext<PendingApprovalStacksContextValue>({
    stacks: [],
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
  const { data, loading, error } = usePendingApprovalStacksQuery({
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })

  const stacks = useMemo(
    () => mapExistingNodes(data?.infrastructureStacks),
    [data?.infrastructureStacks]
  )

  const value = useMemo(
    () => ({
      stacks,
      count: stacks.length,
      loading,
      error,
    }),
    [stacks, loading, error]
  )

  return (
    <PendingApprovalStacksContext value={value}>
      {children}
    </PendingApprovalStacksContext>
  )
}
