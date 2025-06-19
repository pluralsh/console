import { ResponsiveRadialBar } from '@nivo/radial-bar'
import { ChartTooltip } from 'components/utils/ChartTooltip'
import {
  CHART_COLOR_MAP,
  createCenteredMetric,
} from 'components/utils/RadialBarChart'
import {
  UpgradeStatisticsFragment,
  UpgradeStatisticsQuery,
} from 'generated/graphql'

import { ChartSkeleton } from 'components/utils/SkeletonLoaders'

import { ApolloError } from '@apollo/client'
import { EmptyState, Flex } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert.tsx'
import styled from 'styled-components'
import { HomeFilterOptionCard } from '../HomeFilterOptionCard'

export enum UpgradeChartFilter {
  All = 'all',
  Upgradeable = 'Upgradeable',
  NotUpgradeable = 'Not upgradeable',
  Latest = 'Latest',
  Compliant = 'Compliant',
  NonCompliant = 'Non-compliant',
}

const selectableFilterOptions = Object.values(UpgradeChartFilter).filter(
  (option) => option !== UpgradeChartFilter.All
)

export function ClusterUpgradesChart({
  data,
  loading,
  error,
  selectedFilter,
}: {
  data: UpgradeStatisticsQuery | undefined
  loading: boolean
  error?: Nullable<ApolloError>
  selectedFilter: UpgradeChartFilter
}) {
  const chartData = getChartData(data?.upgradeStatistics ?? {})

  const CenterLabel = createCenteredMetric(
    `${data?.upgradeStatistics?.count ?? '-'}`,
    `Clusters`
  )

  if (error) return <GqlError error={error} />
  if (loading) return <ChartSkeleton scale={0.87} />
  if (!data?.upgradeStatistics)
    return <EmptyState message="Upgrade statistics not found." />

  return (
    <ChartContainerSC>
      <ResponsiveRadialBar
        colors={(item) => item.data.color}
        endAngle={360}
        cornerRadius={5}
        padAngle={2}
        padding={0.3}
        innerRadius={0.35}
        tooltip={(props) => (
          <ChartTooltip
            color={props.bar.color}
            value={props.bar.formattedValue}
            label={props.bar.category}
          />
        )}
        layers={['bars', CenterLabel]}
        data={chartData}
      />
    </ChartContainerSC>
  )
}

const ChartContainerSC = styled.div({
  flex: 1,
  maxWidth: 425,
  height: 240,
  [`@media (max-width: 1400px)`]: {
    height: 304,
  },
})

export function ClusterUpgradesFilterBtns({
  selectedFilter,
  onSelect,
  values,
}: {
  selectedFilter: UpgradeChartFilter
  onSelect: (filter: UpgradeChartFilter) => void
  values: Record<UpgradeChartFilter, number>
}) {
  return (
    <Flex
      gap="small"
      flexWrap="wrap"
    >
      {selectableFilterOptions.map((filter) => (
        <HomeFilterOptionCard
          key={filter}
          selected={selectedFilter === filter}
          onSelect={onSelect}
          onDeselect={() => onSelect(UpgradeChartFilter.All)}
          name={filter}
          value={values[filter]}
          color={filterToColor[filter]}
        />
      ))}
    </Flex>
  )
}

export const aggregateUpgradeStats = (
  data: UpgradeStatisticsFragment
): Record<UpgradeChartFilter, number> => {
  const { count, compliant, latest, upgradeable } = data
  return {
    [UpgradeChartFilter.All]: count ?? 0,
    [UpgradeChartFilter.Upgradeable]: upgradeable ?? 0,
    [UpgradeChartFilter.NotUpgradeable]: (count ?? 0) - (upgradeable ?? 0),
    [UpgradeChartFilter.Latest]: latest ?? 0,
    [UpgradeChartFilter.Compliant]: (compliant ?? 0) - (latest ?? 0),
    [UpgradeChartFilter.NonCompliant]: (count ?? 0) - (compliant ?? 0),
  }
}

const filterToColor: Record<UpgradeChartFilter, string> = {
  [UpgradeChartFilter.All]: CHART_COLOR_MAP.green,
  [UpgradeChartFilter.Upgradeable]: CHART_COLOR_MAP.green,
  [UpgradeChartFilter.NotUpgradeable]: CHART_COLOR_MAP.red,
  [UpgradeChartFilter.Latest]: CHART_COLOR_MAP['blue-light'],
  [UpgradeChartFilter.Compliant]: CHART_COLOR_MAP['purple-light'],
  [UpgradeChartFilter.NonCompliant]: CHART_COLOR_MAP['yellow-light'],
}

const getChartData = (data: UpgradeStatisticsFragment) => {
  const aggregatedStats = aggregateUpgradeStats(data)

  return [
    {
      id: 'version-compliant',
      data: [
        {
          color: filterToColor[UpgradeChartFilter.Latest],
          x: 'Latest',
          y: aggregatedStats[UpgradeChartFilter.Latest],
        },
        {
          color: filterToColor[UpgradeChartFilter.Compliant],
          x: 'Version compliant',
          y: aggregatedStats[UpgradeChartFilter.Compliant],
        },
        {
          color: filterToColor[UpgradeChartFilter.NonCompliant],
          x: 'Not version compliant',
          y: aggregatedStats[UpgradeChartFilter.NonCompliant],
        },
      ],
    },
    {
      id: 'upgradeable',
      data: [
        {
          color: filterToColor[UpgradeChartFilter.Upgradeable],
          x: 'Upgradeable',
          y: aggregatedStats[UpgradeChartFilter.Upgradeable],
        },
        {
          color: filterToColor[UpgradeChartFilter.NotUpgradeable],
          x: 'Not upgradeable',
          y: aggregatedStats[UpgradeChartFilter.NotUpgradeable],
        },
      ],
    },
  ]
}
