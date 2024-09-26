import { H1 } from 'honorable'

import { useTheme } from 'styled-components'
import {
  DEFAULT_REACT_VIRTUAL_OPTIONS,
  useFetchPaginatedData,
} from 'components/utils/table/useFetchPaginatedData'
import { GqlError } from 'components/utils/Alert'
import { useClustersQuery, useUpgradeStatisticsQuery } from 'generated/graphql'

import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment'

import { HOME_CARD_MAX_HEIGHT, HomeCard } from '../HomeCard'

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
    <HomeCard>
      <div
        css={{
          display: 'flex',
          maxHeight: HOME_CARD_MAX_HEIGHT,
        }}
      >
        <div css={{ minWidth: 'fit-content', padding: theme.spacing.xlarge }}>
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
            reactVirtualOptions={DEFAULT_REACT_VIRTUAL_OPTIONS}
            onVirtualSliceChange={setVirtualSlice}
            width="100%"
            css={{ maxHeight: '100%' }}
          />
        </div>
      </div>
    </HomeCard>
  )
}
