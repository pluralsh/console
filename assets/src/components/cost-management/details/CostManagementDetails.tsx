import { Flex, IconFrame, ReturnIcon, SubTab } from '@pluralsh/design-system'
import { useThrottle } from 'components/hooks/useThrottle'
import {
  FetchPaginatedDataResult,
  useFetchPaginatedData,
} from 'components/utils/table/useFetchPaginatedData'
import { Subtitle1H1 } from 'components/utils/typography/Text'
import {
  ClusterUsageNamespacesQuery,
  ClusterUsageScalingRecommendationsQuery,
  ScalingRecommendationType,
  useClusterUsageNamespacesQuery,
  useClusterUsageScalingRecommendationsQuery,
} from 'generated/graphql'
import { useMemo, useState } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router-dom'
import {
  CM_NAMESPACES_REL_PATH,
  CM_RECOMMENDATIONS_REL_PATH,
  COST_MANAGEMENT_ABS_PATH,
} from 'routes/costManagementRoutesConsts'
import styled from 'styled-components'

export type CMContextType = {
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

  const namespacesQuery = useFetchPaginatedData(
    {
      queryHook: useClusterUsageNamespacesQuery,
      pageSize: 500,
      keyPath: ['clusterUsage', 'namespaces'],
    },
    { id, q: throttledNamespaceQ || undefined }
  )

  const recommendationsQuery = useFetchPaginatedData(
    {
      queryHook: useClusterUsageScalingRecommendationsQuery,
      pageSize: 500,
      keyPath: ['clusterUsage', 'recommendations'],
    },
    { id, q: throttledRecommendationsQ || undefined, type: recType }
  )

  const ctx = useMemo(() => {
    return {
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
    namespacesQuery,
    namespaceQ,
    setNamespaceQ,
    recommendationsQuery,
    recommendationsQ,
    setRecommendationsQ,
    recType,
    setRecType,
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
  gap: theme.spacing.large,
  padding: theme.spacing.large,
  height: '100%',
  width: '100%',
  overflow: 'hidden',
}))

const HeaderWrapperSC = styled.div({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
})
