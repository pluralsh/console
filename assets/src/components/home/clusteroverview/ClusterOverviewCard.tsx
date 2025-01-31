import { useTheme } from 'styled-components'
import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from 'components/utils/table/useFetchPaginatedData'
import { GqlError } from 'components/utils/Alert'
import { useClustersQuery, useUpgradeStatisticsQuery } from 'generated/graphql'

import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'

import { HOME_CARD_MAX_HEIGHT } from '../HomeCard'

import { useProjectId } from '../../contexts/ProjectsContext'

import { ClusterOverViewTable } from './ClusterOverviewTable'
import { ClusterOverviewChart } from './ClusterOverviewChart'

export function ClusterOverviewCard() {
  const theme = useTheme()
  const projectId = useProjectId()
  const {
    data: tableData,
    loading: tableLoading,
    error: tableError,
    refetch,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData(
    { queryHook: useClustersQuery, keyPath: ['clusters'] },
    { projectId }
  )

  const {
    data: chartData,
    loading: chartLoading,
    error: chartError,
  } = useUpgradeStatisticsQuery({
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })

  return (
    <div
      css={{
        display: 'flex',
        gap: theme.spacing.large,
        maxHeight: HOME_CARD_MAX_HEIGHT,
      }}
    >
      <ClusterOverviewChart
        data={chartData}
        loading={chartLoading}
        error={chartError}
      />
      {tableError ? (
        <GqlError error={tableError} />
      ) : (
        <ClusterOverViewTable
          data={tableData?.clusters?.edges ?? []}
          loading={!tableData && tableLoading}
          refetch={refetch}
          virtualizeRows
          hasNextPage={pageInfo?.hasNextPage}
          fetchNextPage={fetchNextPage}
          isFetchingNextPage={tableLoading}
          reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
          onVirtualSliceChange={setVirtualSlice}
          width="100%"
          height="100%"
        />
      )}
    </div>
  )
}
