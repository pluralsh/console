import {
  Breadcrumb,
  Flex,
  HealthHeartIcon,
  UpdatesIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useCloudSetupUnfinished } from 'components/contexts'
import { useOnboarded } from '../contexts/DeploymentSettingsContext.tsx'

import { ClustersTable } from 'components/cd/clusters/Clusters.tsx'
import { homeClustersColumns } from 'components/cd/clusters/ClustersColumns.tsx'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment.tsx'
import { useProjectId } from 'components/contexts/ProjectsContext.tsx'
import { GqlError } from 'components/utils/Alert.tsx'
import {
  ButtonGroup,
  ButtonGroupDirectory,
} from 'components/utils/ButtonGroup.tsx'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData.tsx'
import {
  ClustersQueryVariables,
  useClustersQuery,
  useUpgradeStatisticsQuery,
  VersionCompliance,
} from 'generated/graphql.ts'
import { useState } from 'react'
import styled from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable.ts'
import {
  ClusterHealthScoresFilterBtns,
  HealthScoreFilterLabel,
  healthScoreLabelToRange,
} from './clusteroverview/ClusterHealthScoresHeatmap.tsx'
import {
  aggregateUpgradeStats,
  ClusterUpgradesChart,
  ClusterUpgradesFilterBtns,
  UpgradeChartFilter,
} from './clusteroverview/ClusterUpgradesChart.tsx'
import { GettingStartedPopup } from './GettingStarted.tsx'

enum HomeScreenTab {
  HealthScores = 'Health scores',
  Upgrades = 'Upgrades',
}

const breadcrumbs: Breadcrumb[] = [{ label: 'home', url: '/' }]

export function Home() {
  const projectId = useProjectId()
  useSetBreadcrumbs(breadcrumbs)
  // we don't want a double popup, and cloud setup would come first if relevant
  const isCloudSetupUnfinished = useCloudSetupUnfinished()
  const onboarded = useOnboarded()

  const [tab, setTab] = useState(HomeScreenTab.HealthScores)
  const [healthScoreRange, setHealthScoreRange] =
    useState<HealthScoreFilterLabel>('All')
  const [upgradeFilterOption, setUpgradeFilterOption] = useState(
    UpgradeChartFilter.All
  )

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
      ...(tab === HomeScreenTab.HealthScores && {
        healthRange: healthScoreLabelToRange[healthScoreRange],
      }),
      ...(tab === HomeScreenTab.Upgrades && {
        ...getUpgradesFilterArgs(upgradeFilterOption),
      }),
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

  return (
    <Flex
      direction="column"
      overflow="auto"
      height="100%"
    >
      <ChartSectionSC>
        <WidthLimiterSC css={{ display: 'flex' }}>
          <Flex
            flex={1}
            gap="medium"
            direction="column"
          >
            <ButtonGroup
              directory={tabDirectory}
              tab={tab}
              onClick={(path) => setTab(path)}
            />
            {tab === HomeScreenTab.HealthScores && (
              <ClusterHealthScoresFilterBtns
                selectedFilter={healthScoreRange}
                onSelect={setHealthScoreRange}
              />
            )}
            {tab === HomeScreenTab.Upgrades && (
              <ClusterUpgradesFilterBtns
                selectedFilter={upgradeFilterOption}
                onSelect={setUpgradeFilterOption}
                values={aggregateUpgradeStats(
                  upgradeData?.upgradeStatistics ?? {}
                )}
              />
            )}
          </Flex>
          <ClusterUpgradesChart
            selectedFilter={upgradeFilterOption}
            data={upgradeData}
            loading={upgradeLoading}
            error={upgradeError}
          />
        </WidthLimiterSC>
      </ChartSectionSC>
      <TableSectionSC>
        <WidthLimiterSC>
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
        </WidthLimiterSC>
      </TableSectionSC>
      {!onboarded && !isCloudSetupUnfinished && <GettingStartedPopup />}
    </Flex>
  )
}

const ChartSectionSC = styled.div(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  width: '100%',
  padding: theme.spacing.large,
  paddingBottom: theme.spacing.xxlarge,
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

const WidthLimiterSC = styled.div(({ theme }) => ({
  maxWidth: theme.breakpoints.desktopLarge,
  height: '100%',
  width: '100%',
}))

const tabDirectory: ButtonGroupDirectory = [
  {
    path: HomeScreenTab.HealthScores,
    label: HomeScreenTab.HealthScores,
    icon: <HealthHeartIcon />,
  },
  {
    path: HomeScreenTab.Upgrades,
    label: HomeScreenTab.Upgrades,
    icon: <UpdatesIcon />,
  },
]

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
