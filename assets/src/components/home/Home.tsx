import { Breadcrumb, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useCloudSetupUnfinished } from 'components/contexts'
import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'
import { useOnboarded } from '../contexts/DeploymentSettingsContext.tsx'

import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment.tsx'
import { useProjectId } from 'components/contexts/ProjectsContext.tsx'
import { GqlError } from 'components/utils/Alert.tsx'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData.tsx'
import {
  useClustersQuery,
  useUpgradeStatisticsQuery,
} from 'generated/graphql.ts'
import { ClusterOverviewChart } from './clusteroverview/ClusterOverviewChart.tsx'
import { GettingStartedPopup } from './GettingStarted.tsx'
import { ClustersTable } from 'components/cd/clusters/Clusters.tsx'
import { isNonNullable } from 'utils/isNonNullable.ts'
import { homeClustersColumns } from 'components/cd/clusters/ClustersColumns.tsx'

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
    <ResponsivePageFullWidth maxContentWidth={1440}>
      {!onboarded && !isCloudSetupUnfinished && <GettingStartedPopup />}
      <ClusterOverviewChart
        data={chartData}
        loading={chartLoading}
        error={chartError}
      />
      {tableError ? (
        <GqlError error={tableError} />
      ) : (
        <ClustersTable
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
    </ResponsivePageFullWidth>
  )
}
