import { Flex, IconFrame, ReturnIcon, SubTab } from '@pluralsh/design-system'
import { useThrottle } from 'components/hooks/useThrottle'
import {
  FetchPaginatedDataResult,
  useFetchPaginatedData,
} from 'components/utils/table/useFetchPaginatedData'
import { Subtitle1H1 } from 'components/utils/typography/Text'
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
import { Outlet, useNavigate, useParams } from 'react-router-dom'
import {
  CM_NAMESPACES_REL_PATH,
  CM_OVERVIEW_REL_PATH,
  CM_RECOMMENDATIONS_REL_PATH,
  COST_MANAGEMENT_ABS_PATH,
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
  const navigate = useNavigate()
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

  return (
    <PageWrapperSC>
      <HeaderWrapperSC>
        <Flex
          gap="medium"
          align="center"
        >
          <IconFrame
            clickable
            type="secondary"
            icon={<ReturnIcon />}
            size="large"
            onClick={() => navigate(COST_MANAGEMENT_ABS_PATH)}
          >
            Back
          </IconFrame>
          <Subtitle1H1>
            {namespacesQuery?.data?.clusterUsage?.cluster?.name}
          </Subtitle1H1>
        </Flex>
        <Flex>
          <SubTab
            active={route?.includes(CM_OVERVIEW_REL_PATH)}
            onClick={() => {
              if (!route?.includes(CM_OVERVIEW_REL_PATH)) {
                navigate(`${CM_OVERVIEW_REL_PATH}`)
              }
            }}
          >
            Overview
          </SubTab>
          <SubTab
            active={route?.includes(CM_NAMESPACES_REL_PATH)}
            onClick={() => {
              if (!route?.includes(CM_NAMESPACES_REL_PATH)) {
                navigate(`${CM_NAMESPACES_REL_PATH}`)
              }
            }}
          >
            Namespaces
          </SubTab>
          <SubTab
            active={route?.includes(CM_RECOMMENDATIONS_REL_PATH)}
            onClick={() => {
              if (!route?.includes(CM_RECOMMENDATIONS_REL_PATH)) {
                navigate(`${CM_RECOMMENDATIONS_REL_PATH}`)
              }
            }}
          >
            Recommendations
          </SubTab>
        </Flex>
      </HeaderWrapperSC>
      <Outlet context={ctx} />
    </PageWrapperSC>
  )
}

const PageWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  overflow: 'auto',
  gap: theme.spacing.medium,
  padding: theme.spacing.large,
  height: '100%',
  width: '100%',
}))

const HeaderWrapperSC = styled.div({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
})
