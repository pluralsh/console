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
  ClustersQueryVariables,
  ClustersRowFragment,
  useClusterHealthScoresQuery,
  useClustersQuery,
  useUpgradeStatisticsQuery,
  VersionCompliance,
} from 'generated/graphql.ts'
import { useMemo, useState } from 'react'
import styled, { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql.ts'
import { isNonNullable } from 'utils/isNonNullable.ts'
import {
  aggregateHealthScoreStats,
  ClusterHealthScoresFilterBtns,
  ClusterHealthScoresHeatmap,
  HealthScoreFilterLabel,
  healthScoreLabelToRange,
} from './clusteroverview/ClusterHealthScoresHeatmap.tsx'
import {
  aggregateUpgradeStats,
  ClusterUpgradesChart,
  ClusterUpgradesFilterBtns,
  UpgradeChartFilter,
} from './clusteroverview/ClusterUpgradesChart.tsx'
import {
  GettingStartedContentHomeVariant,
  GettingStartedPopup,
} from './GettingStarted.tsx'
import { isNil } from 'lodash'
import { Body1BoldP } from 'components/utils/typography/Text.tsx'

const breadcrumbs: Breadcrumb[] = [{ label: 'home', url: '/' }]

export function Home() {
  const { borders } = useTheme()
  const projectId = useProjectId()
  useSetBreadcrumbs(breadcrumbs)
  // we don't want a double popup, and cloud setup would come first if relevant
  const isCloudSetupUnfinished = useCloudSetupUnfinished()
  const onboarded = useOnboarded()

  const [healthScoreOption, setHealthScoreLabelOption] =
    useState<HealthScoreFilterLabel>('All')
  const [upgradeFilterOption, setUpgradeFilterOptionState] = useState(
    UpgradeChartFilter.All
  )
  // only select one filter at a time
  const setHealthScoreOption = (filter: HealthScoreFilterLabel) => {
    setHealthScoreLabelOption(filter)
    setUpgradeFilterOptionState(UpgradeChartFilter.All)
  }
  const setUpgradeFilterOption = (filter: UpgradeChartFilter) => {
    setUpgradeFilterOptionState(filter)
    setHealthScoreLabelOption('All')
  }

  const [selectedCluster, setSelectedCluster] =
    useState<Nullable<ClustersRowFragment>>(null)

  const { data: healthScoresData } = useClusterHealthScoresQuery({
    variables: { projectId },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })

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
    {
      projectId,
      healthRange: healthScoreLabelToRange[healthScoreOption],
      ...getUpgradesFilterArgs(upgradeFilterOption),
    }
  )
  const {
    data: upgradeData,
    loading: upgradeLoading,
    error: upgradeError,
  } = useUpgradeStatisticsQuery({
    variables: { projectId },
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })

  const { aggregatedHealthScores, aggregatedUpgradeStats, heatmapList } =
    useMemo(() => {
      const clusters = mapExistingNodes(healthScoresData?.clusters)
      return {
        aggregatedHealthScores: aggregateHealthScoreStats(clusters),
        aggregatedUpgradeStats: aggregateUpgradeStats(
          upgradeData?.upgradeStatistics ?? {}
        ),
        heatmapList: clusters.filter(({ healthScore }) => {
          const range = healthScoreLabelToRange[healthScoreOption]
          return (
            !range ||
            (!isNil(healthScore) &&
              healthScore <= range.max &&
              healthScore >= range.min)
          )
        }),
      }
    }, [
      healthScoreOption,
      healthScoresData?.clusters,
      upgradeData?.upgradeStatistics,
    ])

  const clusters = useMemo(
    () => mapExistingNodes(tableData?.clusters),
    [tableData]
  )

  const noClustersYet =
    aggregatedUpgradeStats.all === 0 &&
    !(projectId || tableLoading || upgradeLoading)

  return (
    <Flex
      direction="column"
      overflow="auto"
      height="100%"
    >
      <ChartSectionSC>
        <WidthLimiterSC $type="charts">
          <ChartAndFilterWrapperSC css={{ borderRight: borders.default }}>
            <Body1BoldP>Health scores</Body1BoldP>
            <ClusterHealthScoresHeatmap
              clusters={heatmapList}
              onClick={(name) =>
                setSelectedCluster(clusters.find((c) => c.name === name))
              }
            />
            <ClusterHealthScoresFilterBtns
              selectedFilter={healthScoreOption}
              onSelect={setHealthScoreOption}
              values={aggregatedHealthScores}
            />
          </ChartAndFilterWrapperSC>
          <ChartAndFilterWrapperSC>
            <Body1BoldP>Upgrades</Body1BoldP>
            <ClusterUpgradesChart
              data={upgradeData}
              loading={upgradeLoading}
              error={upgradeError}
              selectedFilter={upgradeFilterOption}
              onClick={setUpgradeFilterOption}
            />
            <ClusterUpgradesFilterBtns
              selectedFilter={upgradeFilterOption}
              onSelect={setUpgradeFilterOption}
              values={aggregatedUpgradeStats}
            />
          </ChartAndFilterWrapperSC>
        </WidthLimiterSC>
      </ChartSectionSC>
      <TableSectionSC>
        <WidthLimiterSC $type="table">
          {tableError ? (
            <GqlError error={tableError} />
          ) : noClustersYet ? (
            <GettingStartedContentHomeVariant />
          ) : (
            <ClustersTable
              fullHeightWrap
              rowBg="raised"
              rowClickAction="flyover"
              selectedCluster={selectedCluster}
              setSelectedCluster={setSelectedCluster}
              data={tableData?.clusters?.edges?.filter(isNonNullable) ?? []}
              loading={!tableData && tableLoading}
              refetch={refetch}
              columns={homeClustersColumns}
              hasNextPage={pageInfo?.hasNextPage}
              fetchNextPage={fetchNextPage}
              isFetchingNextPage={tableLoading}
              onVirtualSliceChange={setVirtualSlice}
              emptyStateProps={{
                message: 'No clusters found - try adjusting your filters.',
              }}
            />
          )}
        </WidthLimiterSC>
      </TableSectionSC>
      {!onboarded && !isCloudSetupUnfinished && <GettingStartedPopup />}
    </Flex>
  )
}

const ChartAndFilterWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  padding: `${theme.spacing.medium}px ${theme.spacing.large}px ${theme.spacing.large}px`,
  flex: 1,
  whiteSpace: 'nowrap',
  height: '100%',
  '& g:first-of-type, & canvas': { cursor: 'pointer' },
}))

const ChartSectionSC = styled.div(({ theme }) => ({
  minHeight: 350,
  [`@media (max-width: ${theme.breakpoints.desktop}px)`]: {
    minHeight: 700,
  },
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
  backgroundColor: theme.colors['fill-accent'],
}))

const TableSectionSC = styled.div(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  flex: 1,
  minHeight: 400,
  backgroundColor: theme.colors['fill-zero-selected'],
  padding: theme.spacing.large,
  borderTop: theme.borders.default,
  overflow: 'hidden',
}))

const WidthLimiterSC = styled.div<{
  $type?: 'charts' | 'table'
}>(({ theme, $type = 'table' }) => ({
  maxWidth: theme.breakpoints.desktopLarge,
  height: '100%',
  width: '100%',
  ...($type === 'charts' && {
    display: 'flex',
    [`@media (max-width: ${theme.breakpoints.desktop}px)`]: {
      flexDirection: 'column',
    },
  }),
}))

const getUpgradesFilterArgs = (
  filterOption: UpgradeChartFilter
): Pick<ClustersQueryVariables, 'compliance' | 'upgradeable'> => {
  switch (filterOption) {
    case UpgradeChartFilter.All:
      return {}
    case UpgradeChartFilter.Compliant:
      return { compliance: VersionCompliance.Compliant }
    case UpgradeChartFilter.NonCompliant:
      return { compliance: VersionCompliance.Outdated }
    case UpgradeChartFilter.Latest:
      return { compliance: VersionCompliance.Latest }
    case UpgradeChartFilter.Upgradeable:
      return { upgradeable: true }
    case UpgradeChartFilter.NotUpgradeable:
      return { upgradeable: false }
  }
}
