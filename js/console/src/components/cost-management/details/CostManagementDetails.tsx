import { useThrottle } from 'components/hooks/useThrottle'
import { PageColumnSC } from 'components/layout/PageLayout'
import {
  PageToolbar,
  PageToolbarSlotContext,
} from 'components/layout/PageToolbar'
import {
  FetchPaginatedDataResult,
  useFetchPaginatedData,
} from 'components/utils/table/useFetchPaginatedData'
import {
  ClusterUsageHistoryQuery,
  ClusterUsageNamespacesQuery,
  ClusterUsageScalingRecommendationsQuery,
  ScalingRecommendationType,
  useClusterUsageHistoryQuery,
  useClusterUsageNamespacesQuery,
  useClusterUsageScalingRecommendationsQuery,
} from 'generated/graphql'
import { useMemo, useState } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import {
  CM_NAMESPACES_REL_PATH,
  CM_OVERVIEW_REL_PATH,
  CM_RECOMMENDATIONS_REL_PATH,
  getCostManagementDetailsPath,
} from 'routes/costManagementRoutesConsts'
import styled from 'styled-components'

const BIG_PAGE_SIZE = 500

export type CMContextType = {
  clusterName?: string
  historyQuery: FetchPaginatedDataResult<ClusterUsageHistoryQuery>
  namespacesQuery: FetchPaginatedDataResult<ClusterUsageNamespacesQuery>
  namespaceQ: string
  setNamespaceQ: (q: string) => void
  recommendationsQuery: FetchPaginatedDataResult<ClusterUsageScalingRecommendationsQuery>
  recommendationsQ: string
  setRecommendationsQ: (q: string) => void
  recType: ScalingRecommendationType | undefined
  setRecType: (type: ScalingRecommendationType | undefined) => void
}

export function CostManagementDetails() {
  const { id = '', ['*']: route } = useParams()
  const [toolbarSlot, setToolbarSlot] = useState<HTMLDivElement | null>(null)
  const [namespaceQ, setNamespaceQ] = useState<string>('')
  const throttledNamespaceQ = useThrottle(namespaceQ, 300)
  const [recommendationsQ, setRecommendationsQ] = useState<string>('')
  const throttledRecommendationsQ = useThrottle(recommendationsQ, 300)
  const [recType, setRecType] = useState<ScalingRecommendationType | undefined>(
    undefined
  )

  const historyQuery = useFetchPaginatedData(
    {
      queryHook: useClusterUsageHistoryQuery,
      pageSize: BIG_PAGE_SIZE,
      keyPath: ['clusterUsage', 'history'],
    },
    { id }
  )

  const namespacesQuery = useFetchPaginatedData(
    {
      queryHook: useClusterUsageNamespacesQuery,
      pageSize: BIG_PAGE_SIZE,
      keyPath: ['clusterUsage', 'namespaces'],
    },
    { id, q: throttledNamespaceQ || undefined }
  )

  const recommendationsQuery = useFetchPaginatedData(
    {
      queryHook: useClusterUsageScalingRecommendationsQuery,
      pageSize: BIG_PAGE_SIZE,
      keyPath: ['clusterUsage', 'recommendations'],
    },
    { id, q: throttledRecommendationsQ || undefined, type: recType }
  )

  const ctx = useMemo(() => {
    return {
      clusterName: namespacesQuery?.data?.clusterUsage?.cluster?.name,
      historyQuery,
      namespacesQuery,
      namespaceQ,
      setNamespaceQ,
      recommendationsQuery,
      recommendationsQ,
      setRecommendationsQ,
      recType,
      setRecType,
    }
  }, [
    historyQuery,
    namespacesQuery,
    namespaceQ,
    recommendationsQuery,
    recommendationsQ,
    recType,
  ])

  const basePath = getCostManagementDetailsPath(id)
  const tabs = useMemo(
    () => [
      { label: 'Overview', path: `${basePath}/${CM_OVERVIEW_REL_PATH}` },
      { label: 'Namespaces', path: `${basePath}/${CM_NAMESPACES_REL_PATH}` },
      {
        label: 'Recommendations',
        path: `${basePath}/${CM_RECOMMENDATIONS_REL_PATH}`,
      },
    ],
    [basePath]
  )

  return (
    <PageColumnSC>
      <PageToolbar
        tabs={tabs}
        activeFn={(path) =>
          !!route && route.includes(path.split('/').pop() ?? '')
        }
        slotRef={setToolbarSlot}
      />
      <PageWrapperSC>
        <PageToolbarSlotContext value={toolbarSlot}>
          <Outlet context={ctx} />
        </PageToolbarSlotContext>
      </PageWrapperSC>
    </PageColumnSC>
  )
}

const PageWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  overflow: 'auto',
  gap: theme.spacing.medium,
  padding: theme.spacing.large,
  flex: 1,
  minHeight: 0,
  width: '100%',
}))
