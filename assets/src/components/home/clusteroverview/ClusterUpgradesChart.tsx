import { ResponsiveRadialBar } from '@nivo/radial-bar'
import { ChartTooltip } from 'components/utils/ChartTooltip'
import { createCenteredMetric } from 'components/utils/RadialBarChart'
import {
  UpgradeStatisticsFragment,
  UpgradeStatisticsQuery,
} from 'generated/graphql'

import { ChartSkeleton } from 'components/utils/SkeletonLoaders'

import { ApolloError } from '@apollo/client'
import { Flex } from '@pluralsh/design-system'
import chroma from 'chroma-js'
import { GqlError } from 'components/utils/Alert.tsx'
import { isEmpty } from 'lodash'
import { HOME_CHARTS_COLORS } from 'components/home/HomeFilterOptionCard'
import { HomeFilterOptionCard } from '../HomeFilterOptionCard'
import { ClusterUpgradesChartEmpty } from './ClusterUpgradesChartEmpty'

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
  onClick,
}: {
  data: UpgradeStatisticsQuery | undefined
  loading: boolean
  error?: Nullable<ApolloError>
  selectedFilter: UpgradeChartFilter
  onClick: (filter: UpgradeChartFilter) => void
}) {
  const chartData = getChartData(data?.upgradeStatistics ?? {})

  const CenterLabel = createCenteredMetric(
    `${data?.upgradeStatistics?.count ?? '-'}`,
    `Clusters`
  )

  if (error) return <GqlError error={error} />
  if (isEmpty(data?.upgradeStatistics) || data?.upgradeStatistics.count === 0)
    return (
      <div css={{ width: 'fit-content', margin: 'auto' }}>
        {loading ? (
          <ChartSkeleton scale={0.87} />
        ) : (
          <ClusterUpgradesChartEmpty />
        )}
      </div>
    )

  return (
    <div
      css={{
        height: '100%',
        width: '100%',
        '& svg *': { transition: 'fill 0.3s ease-in-out' },
      }}
    >
      <ResponsiveRadialBar
        colors={(item) =>
          chroma(item.data.color)
            .alpha(
              selectedFilter === UpgradeChartFilter.All ||
                item.data.x === selectedFilter
                ? 1
                : 0.6
            )
            .hex()
        }
        endAngle={360}
        cornerRadius={3}
        padAngle={1}
        padding={0.32}
        innerRadius={0.38}
        onClick={(bar) =>
          onClick(
            bar.data.x === selectedFilter ? UpgradeChartFilter.All : bar.data.x
          )
        }
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
    </div>
  )
}

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
    <Flex gap="xsmall">
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
  [UpgradeChartFilter.All]: HOME_CHARTS_COLORS.green,
  [UpgradeChartFilter.Upgradeable]: HOME_CHARTS_COLORS.green,
  [UpgradeChartFilter.NotUpgradeable]: HOME_CHARTS_COLORS.red,
  [UpgradeChartFilter.Latest]: HOME_CHARTS_COLORS.blue,
  [UpgradeChartFilter.Compliant]: HOME_CHARTS_COLORS.purple,
  [UpgradeChartFilter.NonCompliant]: HOME_CHARTS_COLORS.yellow,
}

const getChartData = (data: UpgradeStatisticsFragment) => {
  const aggregatedStats = aggregateUpgradeStats(data)

  return [
    {
      id: 'version-compliant',
      data: [
        {
          x: UpgradeChartFilter.Latest,
          y: aggregatedStats[UpgradeChartFilter.Latest],
          color: filterToColor[UpgradeChartFilter.Latest],
        },
        {
          x: UpgradeChartFilter.Compliant,
          y: aggregatedStats[UpgradeChartFilter.Compliant],
          color: filterToColor[UpgradeChartFilter.Compliant],
        },
        {
          x: UpgradeChartFilter.NonCompliant,
          y: aggregatedStats[UpgradeChartFilter.NonCompliant],
          color: filterToColor[UpgradeChartFilter.NonCompliant],
        },
      ],
    },
    {
      id: 'upgradeable',
      data: [
        {
          x: UpgradeChartFilter.Upgradeable,
          y: aggregatedStats[UpgradeChartFilter.Upgradeable],
          color: filterToColor[UpgradeChartFilter.Upgradeable],
        },
        {
          x: UpgradeChartFilter.NotUpgradeable,
          y: aggregatedStats[UpgradeChartFilter.NotUpgradeable],
          color: filterToColor[UpgradeChartFilter.NotUpgradeable],
        },
      ],
    },
  ]
}
