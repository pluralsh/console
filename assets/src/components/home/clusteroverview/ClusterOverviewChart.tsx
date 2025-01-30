import { RadialBar } from '@nivo/radial-bar'
import { ChartTooltip } from 'components/utils/ChartTooltip'
import {
  CHART_COLOR_MAP,
  createCenteredMetric,
} from 'components/utils/RadialBarChart'
import { UpgradeStatisticsQuery } from 'generated/graphql'

import { ChartSkeleton } from 'components/utils/SkeletonLoaders'

import { ClusterIcon } from '@pluralsh/design-system'
import { CustomLegend } from '../CustomLegend'
import { HomeCard } from '../HomeCard.tsx'
import { ApolloError } from '@apollo/client'
import { GqlError } from 'components/utils/Alert.tsx'

const CHART_SIZE = 240

export function ClusterOverviewChart({
  data,
  loading,
  error,
}: {
  data: UpgradeStatisticsQuery | undefined
  loading: boolean
  error?: Nullable<ApolloError>
}) {
  const chartData = getChartData(data || {})

  const CenterLabel = createCenteredMetric(
    `${data?.upgradeStatistics?.count ?? '-'}`,
    `Clusters`
  )

  return (
    <HomeCard
      icon={<ClusterIcon />}
      title="Cluster Overview"
      tooltip={<CustomLegend data={chartData.toReversed()} />}
    >
      {error && <GqlError error={error} />}
      {data?.upgradeStatistics ? (
        <RadialBar
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
          height={CHART_SIZE}
          width={CHART_SIZE}
        />
      ) : loading ? (
        <ChartSkeleton scale={0.87} />
      ) : null}
    </HomeCard>
  )
}

const getChartData = (data: UpgradeStatisticsQuery) => {
  const { count, compliant, latest, upgradeable } = data.upgradeStatistics || {}

  return [
    {
      id: 'version-compliant',
      data: [
        { color: CHART_COLOR_MAP['blue-light'], x: 'Latest', y: latest || 0 },
        {
          color: CHART_COLOR_MAP['purple-light'],
          x: 'Version compliant',
          y: (compliant || 0) - (latest || 0),
        },
        {
          color: CHART_COLOR_MAP['yellow-light'],
          x: 'Not version compliant',
          y: (count || 0) - (compliant || 0),
        },
      ],
    },
    {
      id: 'upgradeable',
      data: [
        {
          color: CHART_COLOR_MAP.green,
          x: 'Upgradeable',
          y: upgradeable || 0,
        },
        {
          color: CHART_COLOR_MAP.red,
          x: 'Not upgradeable',
          y: (count || 0) - (upgradeable || 0),
        },
      ],
    },
  ]
}
