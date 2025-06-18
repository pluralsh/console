import { Breadcrumb, Flex, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useCloudSetupUnfinished } from 'components/contexts'
import { useOnboarded } from '../contexts/DeploymentSettingsContext.tsx'

import { ClustersTable } from 'components/cd/clusters/Clusters.tsx'
import { homeClustersColumns } from 'components/cd/clusters/ClustersColumns.tsx'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment.tsx'
import { useProjectId } from 'components/contexts/ProjectsContext.tsx'
import { GqlError } from 'components/utils/Alert.tsx'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData.tsx'
import {
  useClustersQuery,
  useUpgradeStatisticsQuery,
} from 'generated/graphql.ts'
import styled from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable.ts'
import { ClusterOverviewChart } from './clusteroverview/ClusterOverviewChart.tsx'
import { GettingStartedPopup } from './GettingStarted.tsx'

const breadcrumbs: Breadcrumb[] = [{ label: 'home', url: '/' }]

export function Home() {
  useSetBreadcrumbs(breadcrumbs)
  // we don't want a double popup, and cloud setup would come first if relevant
  const isCloudSetupUnfinished = useCloudSetupUnfinished()
  const onboarded = useOnboarded()

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
    variables: { projectId },
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })

  return (
    <Flex
      direction="column"
      overflow="hidden"
      height="100%"
    >
      <ChartSectionSC>
        <span>filters</span>
        <ClusterOverviewChart
          data={chartData}
          loading={chartLoading}
          error={chartError}
        />
      </ChartSectionSC>
      <TableSectionSC>
        {tableError ? (
          <GqlError error={tableError} />
        ) : (
          <ClustersTable
            fullHeightWrap
            rowBg="raised"
            rowClickAction="flyover"
            data={tableData?.clusters?.edges?.filter(isNonNullable) ?? []}
            loading={!tableData && tableLoading}
            refetch={refetch}
            columns={homeClustersColumns}
            hasNextPage={pageInfo?.hasNextPage}
            fetchNextPage={fetchNextPage}
            isFetchingNextPage={tableLoading}
            onVirtualSliceChange={setVirtualSlice}
          />
        )}
      </TableSectionSC>
      {!onboarded && !isCloudSetupUnfinished && <GettingStartedPopup />}
    </Flex>
  )
}

const ChartSectionSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.large,
  backgroundColor: theme.colors['fill-accent'],
  padding: theme.spacing.large,
  paddingBottom: theme.spacing.xxlarge,
  width: '100%',
  [`@media (min-width: ${theme.breakpoints.desktopLarge}px)`]: {
    gap: theme.spacing.xxlarge,
  },
}))

const TableSectionSC = styled.div(({ theme }) => ({
  backgroundColor: theme.colors['fill-zero-selected'],
  padding: theme.spacing.large,
  borderTop: theme.borders.default,
  height: '100%',
  overflow: 'hidden',
  flex: 1,
}))
