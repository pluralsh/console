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
    loading,
    error: tableError,
    refetch,
    pageInfo,
    fetchNextPage,
    setVirtualSlice,
  } = useFetchPaginatedData(
    {
      queryHook: useClustersQuery,
      keyPath: ['clusters'],
    },
    {
      projectId,
    }
  )

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
    <div
      css={{
        display: 'flex',
        gap: theme.spacing.large,
        maxHeight: HOME_CARD_MAX_HEIGHT,
      }}
    >
      <ClusterOverviewChart data={chartData} />
      <ClusterOverViewTable
        data={tableData?.clusters?.edges ?? []}
        loading={!tableData && loading}
        refetch={refetch}
        virtualizeRows
        hasNextPage={pageInfo?.hasNextPage}
        fetchNextPage={fetchNextPage}
        isFetchingNextPage={loading}
        reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
        onVirtualSliceChange={setVirtualSlice}
        width="100%"
        css={{ maxHeight: '100%' }}
      />
    </div>
  )
}
