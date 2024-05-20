import { RadialBar } from '@nivo/radial-bar'
import { ChartTooltip } from 'components/utils/ChartTooltip'
import {
  COLOR_MAP,
  createCenteredMetric,
} from 'components/utils/RadialBarChart'
import { UpgradeStatisticsQuery } from 'generated/graphql'
import styled from 'styled-components'

import { useMemo } from 'react'

import { ChartSkeleton } from 'components/utils/SkeletonLoaders'

import { CustomLegend } from './CustomLegend'

const CHART_SIZE = 275

export function ClusterOverviewChart({
  data,
}: {
  data: UpgradeStatisticsQuery | undefined
}) {
  const chartColors = {
    green: COLOR_MAP.green,
    red: COLOR_MAP.red,
    blue: COLOR_MAP['blue-light'],
    purple: COLOR_MAP['purple-light'],
    yellow: COLOR_MAP['yellow-light'],
  }
  const { chartData, legendData } = useChartData(data || {}, chartColors)

  if (!data?.upgradeStatistics) {
    return <ChartSkeleton />
  }

  const CenterLabel = createCenteredMetric(
    `${data.upgradeStatistics.count}`,
    `Clusters`
  )

  return (
    <ViewWrapperSC>
      <RadialBar
        colors={(item) => chartColors[item.data.color]}
        endAngle={360}
        cornerRadius={5}
        padAngle={1}
        padding={0.6}
        innerRadius={0.4}
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
      {legendData.map((legend, index) => (
        <CustomLegend
          key={index}
          data={legend}
        />
      ))}
    </ViewWrapperSC>
  )
}

const ViewWrapperSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  height: '100%',
})

const useChartData = (
  data: UpgradeStatisticsQuery,
  colorMap: Record<string, string>
) => {
  const { count, compliant, latest, upgradeable } = data.upgradeStatistics || {}

  return useMemo(() => {
    const chartData = [
      {
        id: 'version-compliant',
        data: [
          { color: 'blue', x: 'Latest', y: latest || 0 },
          { color: 'purple', x: 'Version Compliant', y: compliant || 0 },
          {
            color: 'yellow',
            x: 'Not Version Compliant',
            y: (count || 0) - (latest || 0) - (compliant || 0),
          },
        ],
      },
      {
        id: 'upgradeable',
        data: [
          { color: 'green', x: 'Upgradeable', y: upgradeable || 0 },
          {
            color: 'red',
            x: 'Not Upgradeable',
            y: (count || 0) - (upgradeable || 0),
          },
        ],
      },
    ]
    const legendData = chartData
      .map((legend) =>
        legend.data.map((val) => ({
          label: val.x,
          color: colorMap[val.color],
        }))
      )
      .reverse()

    return { chartData, legendData }
  }, [upgradeable, count, compliant, latest, colorMap])
}
