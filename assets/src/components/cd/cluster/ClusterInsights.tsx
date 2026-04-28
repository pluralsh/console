import { mergeDeep } from '@apollo/client/utilities'
import { EmptyState, Flex } from '@pluralsh/design-system'
import { POLL_INTERVAL } from 'components/cluster/constants.ts'
import { GqlError } from 'components/utils/Alert.tsx'
import {
  Dispatch,
  ReactNode,
  SetStateAction,
  Suspense,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react'
import { Outlet, useOutletContext } from 'react-router-dom'
import { useTheme } from 'styled-components'
import {
  ClusterFragment,
  ClusterInsightFragment,
  useClusterInsightQuery,
} from '../../../generated/graphql.ts'

import LoadingIndicator from '../../utils/LoadingIndicator.tsx'
import { useClusterContext } from './Cluster.tsx'
import { StretchedFlex } from 'components/utils/StretchedFlex.tsx'

export function ClusterInsights() {
  const theme = useTheme()
  const { cluster, clusterLoading } = useClusterContext()

  const {
    data,
    loading: insightLoading,
    error,
    refetch,
  } = useClusterInsightQuery({
    skip: !cluster?.id,
    variables: { id: cluster?.id ?? '' },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
    notifyOnNetworkStatusChange: true,
  })

  const [navigationContent, setNavigationContent] = useState<ReactNode>()
  const [actionContent, setActionContent] = useState<ReactNode>()
  const ctx: ClusterInsightsContextType = useMemo(
    () => ({
      cluster: mergeDeep(cluster, data?.cluster),
      clusterLoading: clusterLoading || insightLoading,
      refetch,
      setNavigationContent,
      setActionContent,
    }),
    [cluster, data?.cluster, clusterLoading, insightLoading, refetch]
  )

  if (error) return <GqlError error={error} />
  if (!(data || insightLoading || clusterLoading))
    return <EmptyState message="Cluster insights not found." />
  return (
    <Flex
      direction="column"
      gap="medium"
      overflow="hidden"
      marginBottom={theme.spacing.large}
      height="100%"
    >
      <StretchedFlex align="end">
        {navigationContent}
        {actionContent}
      </StretchedFlex>
      <Suspense fallback={<LoadingIndicator />}>
        <Outlet context={ctx} />
      </Suspense>
    </Flex>
  )
}

type ClusterInsightsContextType = {
  cluster: Nullable<ClusterFragment> & Nullable<ClusterInsightFragment>
  clusterLoading: boolean
  refetch: () => void
  setNavigationContent: Dispatch<SetStateAction<Nullable<ReactNode>>>
  setActionContent: Dispatch<SetStateAction<Nullable<ReactNode>>>
}

export function useClusterInsightsContext() {
  return useOutletContext<ClusterInsightsContextType>()
}

export function useSetNavigationContent(node?: ReactNode) {
  const ctx = useClusterInsightsContext()

  if (!ctx) {
    throw new Error(
      'useSetDirectory() must be used within a ClusterInsightsContext'
    )
  }

  const { setNavigationContent } = ctx

  useLayoutEffect(() => {
    setNavigationContent?.(node)

    return () => {
      setNavigationContent?.(null)
    }
  }, [node, setNavigationContent])
}

export function useSetActionContent(node?: ReactNode) {
  const ctx = useClusterInsightsContext()

  if (!ctx) {
    throw new Error(
      'useSetDirectory() must be used within a ClusterInsightsContext'
    )
  }

  const { setActionContent } = ctx

  useLayoutEffect(() => {
    setActionContent?.(node)

    return () => {
      setActionContent?.(null)
    }
  }, [node, setActionContent])
}
