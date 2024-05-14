import { H1 } from 'honorable'

import { useTheme } from 'styled-components'
import {
  CLUSTERS_QUERY_PAGE_SIZE,
  CLUSTERS_REACT_VIRTUAL_OPTIONS,
} from 'components/cd/clusters/Clusters'
import { useFetchPaginatedData } from 'components/cd/utils/useFetchPaginatedData'
import { GqlError } from 'components/utils/Alert'
import { useClustersQuery, useUpgradeStatisticsQuery } from 'generated/graphql'

import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'

import { HOME_CARD_MAX_HEIGHT, HomeCard } from '../HomeCard'

import { ClusterOverViewTable } from './ClusterOverviewTable'
import { ClusterOverviewChart } from './ClusterOverviewChart'

const CHART_VIEW_WIDTH = '450px'

export function ClusterOverviewCard() {
  const theme = useTheme()
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

  return (
    <HomeCard overflow="none">
      <div
        css={{
          display: 'flex',

          maxHeight: HOME_CARD_MAX_HEIGHT,
        }}
      >
        <div css={{ width: CHART_VIEW_WIDTH, padding: theme.spacing.xlarge }}>
          <H1 title2>Cluster Overview</H1>
          <ClusterOverviewChart data={chartData} />
        </div>
        <div
          css={{
            display: 'flex',
            width: '100%',
            padding: theme.spacing.medium,
          }}
        >
          <ClusterOverViewTable
            data={tableData?.clusters?.edges}
            refetch={refetch}
            virtualizeRows
            hasNextPage={pageInfo?.hasNextPage}
            fetchNextPage={fetchNextPage}
            isFetchingNextPage={loading}
            reactVirtualOptions={CLUSTERS_REACT_VIRTUAL_OPTIONS}
            onVirtualSliceChange={setVirtualSlice}
            width="100%"
            css={{ maxHeight: '100%' }}
          />
        </div>
      </div>
    </HomeCard>
  )
}
