import { ApolloError } from '@apollo/client'
import { ResponsiveLine } from '@nivo/line'
import { EmptyState } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import { COLORS } from 'utils/color'

import { SliceTooltip, useGraphTheme } from 'components/utils/Graph'
import { ProjectUsageHistoryFragment } from 'generated/graphql'
import { useMemo } from 'react'
import { formatDateTime } from 'utils/datetime'
import { ProjectUsageMetric } from './CostManagementChartView'

export function ProjectUsageTimeSeries({
  data,
  metric,
  projectId,
  loading,
  error,
}: {
  data: ProjectUsageHistoryFragment[]
  metric: ProjectUsageMetric
  projectId: string
  loading: boolean
  error?: Nullable<ApolloError>
}) {
  const graphTheme = useGraphTheme()
  const graphData = useMemo(
    () => getGraphData(data, metric, projectId),
    [data, metric, projectId]
  )

  if (error) return <GqlError error={error} />
  if (!graphData)
    return loading ? (
      <LoadingIndicator />
    ) : (
      <EmptyState message="No data found- try adjusting your filters." />
    )

  return (
    <ResponsiveLine
      theme={graphTheme}
      data={graphData}
      tooltip={SliceTooltip}
      colors={COLORS}
      margin={{ top: 8, right: 96, bottom: 24, left: 64 }}
      xScale={{ type: 'point' }}
      yScale={{
        type: 'linear',
        min: 'auto',
        max: 'auto',
      }}
      curve="basis"
      axisBottom={{
        format: (value) => formatDateTime(value, 'MMM DD, YYYY'),
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legend: 'time',
        legendOffset: 36,
        legendPosition: 'middle',
        truncateTickAt: 0,
      }}
      axisLeft={{
        format: (value) => `$${value}`,
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legend: 'cost',
        legendOffset: -40,
        legendPosition: 'middle',
        truncateTickAt: 0,
      }}
      xFormat={(value) => formatDateTime(value, 'MMM DD, YYYY')}
      pointSize={0}
      pointColor={{ theme: 'background' }}
      pointBorderWidth={2}
      pointBorderColor={{ from: 'serieColor' }}
      enableTouchCrosshair
      useMesh
      legends={[
        {
          anchor: 'bottom-right',
          direction: 'column',
          justify: false,
          translateX: 100,
          translateY: 0,
          itemsSpacing: 0,
          itemDirection: 'left-to-right',
          itemWidth: 80,
          itemHeight: 32,
          itemOpacity: 0.75,
          symbolSize: 12,
          symbolShape: 'circle',
          itemTextColor: 'white',
          effects: [
            {
              on: 'hover',
              style: {
                itemBackground: 'rgba(0, 0, 0, .03)',
                itemOpacity: 1,
              },
            },
          ],
        },
      ]}
    />
  )
}

type GraphData = {
  id: string
  data: {
    x: string
    y: number | null
  }[]
}
const getGraphData = (
  history: ProjectUsageHistoryFragment[],
  metric: ProjectUsageMetric,
  projectId: string
) => {
  const cpuData: GraphData = {
    id: 'CPU',
    data: [],
  }
  const memoryData: GraphData = {
    id: 'Memory',
    data: [],
  }
  const storageData: GraphData = {
    id: 'Storage',
    data: [],
  }

  const timestamps = new Set()
  history.forEach((point) => {
    if (!timestamps.has(point.timestamp)) {
      cpuData.data.push({
        x: point.timestamp,
        y: point.cpu ?? null,
      })
      memoryData.data.push({
        x: point.timestamp,
        y: point.memory ?? null,
      })
      storageData.data.push({
        x: point.timestamp,
        y: point.gpu ? point.gpu : null,
      })

      timestamps.add(point.timestamp)
    }
  })

  const data = [cpuData, memoryData, storageData]

  // return null instead of empty arrays if there's no data at all
  return data.some((obj) => obj.data.length > 0) ? data : null
}
