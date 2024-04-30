import { Flex, H1 } from 'honorable'

import styled from 'styled-components'
import {
  CLUSTERS_QUERY_PAGE_SIZE,
  CLUSTERS_REACT_VIRTUAL_OPTIONS,
} from 'components/cd/clusters/Clusters'
import { useFetchPaginatedData } from 'components/cd/utils/useFetchPaginatedData'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { useClustersQuery, useUpgradeStatisticsQuery } from 'generated/graphql'

import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'

import { HOME_CARD_MAX_HEIGHT, HomeCard } from '../HomeCard'

import { ClusterOverViewTable } from './ClusterOverviewTable'
import { ClusterOverviewChart } from './ClusterOverviewChart'

const CHART_VIEW_WIDTH = '450px'

export function ClusterOverviewCard() {
  const {
    data: tableData,
    loading,
    error: tableError,
    refetch,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData({
    queryHook: useClustersQuery,
    pageSize: CLUSTERS_QUERY_PAGE_SIZE,
    queryKey: 'clusters',
  })

  const { data: chartData, error: chartError } = useUpgradeStatisticsQuery({
    pollInterval: POLL_INTERVAL,
  })

  if (chartError) {
    return <GqlError error={chartError} />
  }
  if (tableError) {
    return <GqlError error={tableError} />
  }

  if (!tableData?.clusters?.edges) {
    return <LoadingIndicator />
  }

  return (
    <HomeCard overflow="none">
      <Flex
        style={{
          maxHeight: HOME_CARD_MAX_HEIGHT,
        }}
      >
        <ChartViewWrapperSC>
          <H1 title2>Cluster Overview</H1>
          <ClusterOverviewChart data={chartData} />
        </ChartViewWrapperSC>
        <OverviewTableWrapperSC>
          <ClusterOverViewTable
            data={tableData.clusters.edges}
            refetch={refetch}
            virtualizeRows
            hasNextPage={pageInfo?.hasNextPage}
            fetchNextPage={fetchNextPage}
            isFetchingNextPage={loading}
            reactVirtualOptions={CLUSTERS_REACT_VIRTUAL_OPTIONS}
            onVirtualSliceChange={setVirtualSlice}
          />
        </OverviewTableWrapperSC>
      </Flex>
    </HomeCard>
  )
}

const ChartViewWrapperSC = styled.div(({ theme }) => ({
  width: CHART_VIEW_WIDTH,
  padding: theme.spacing.xlarge,
}))
const OverviewTableWrapperSC = styled.div({
  flex: 1,
  overflow: 'auto',
})
