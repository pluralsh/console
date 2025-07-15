import { ApolloError } from '@apollo/client'
import { ResponsiveLine } from '@nivo/line'
import { EmptyState } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import { COLORS } from 'utils/color'

import { useProjectsContext } from 'components/contexts/ProjectsContext'
import { SliceTooltip, useGraphTheme } from 'components/utils/Graph'
import {
  ForecastingLayer,
  LineGraphData,
  ValidLineGraphDatum,
  calculateLinearRegression,
  getYScale,
} from 'components/utils/NivoLineForecastingLayer'
import { ProjectUsageHistoryFragment } from 'generated/graphql'
import { groupBy, isEmpty, isNil, pick } from 'lodash'
import { useMemo } from 'react'
import { addDays, formatDateTime } from 'utils/datetime'
import { METRIC_OPTIONS, ProjectUsageMetric } from './CostManagementChartView'
import {
  formatCpu,
  formatMemory,
} from './details/recommendations/ClusterScalingRecsTableCols'

export function ProjectUsageTimeSeries({
  data,
  metric,
  projectId,
  loading,
  error,
  forecastingEnabled,
  forecastingDays,
}: {
  data: ProjectUsageHistoryFragment[]
  metric: ProjectUsageMetric
  projectId: string
  loading: boolean
  error?: Nullable<ApolloError>
  forecastingEnabled: boolean
  forecastingDays: Nullable<number>
}) {
  const { projects } = useProjectsContext()
  const graphTheme = useGraphTheme()

  const { graphData, trendLineData, yScale } = useMemo(() => {
    const groupedData = groupBy(data, 'projectId')
    const filteredData =
      projectId !== 'all' ? pick(groupedData, projectId) : groupedData
    let trendLineData: ValidLineGraphDatum[] = []

    const graphDataArr = Object.entries(filteredData).flatMap(
      ([projectId, points], i) => {
        const timestamps = new Set() // for avoiding duplicates
        const newLineData: LineGraphData = {
          id: projects.find((p) => p.id === projectId)?.name ?? `Unknown-${i}`,
          data: [],
        }
        points.forEach((point) => {
          const value = point[metric]
          if (!timestamps.has(point.timestamp) && !isNil(value)) {
            newLineData.data.push({
              x: new Date(point.timestamp),
              y: value,
            })
            timestamps.add(point.timestamp)
          }
        })
        if (isEmpty(newLineData.data)) return [] // this gets removed entirely by 'flatMap'
        return newLineData
      }
    )

    const shouldCalculateTrend =
      forecastingEnabled && !!forecastingDays && graphDataArr.length === 1
    const originalData = graphDataArr[0]?.data ?? []

    if (shouldCalculateTrend) {
      trendLineData = calculateLinearRegression(originalData, forecastingDays)
      // add the last point of the trend line to the original data so the graph expands to fit
      const trendLineEndDate = addDays(originalData.at(-1)?.x, forecastingDays)
      if (trendLineEndDate)
        originalData.push({
          x: trendLineEndDate,
          y: null,
        })
    }

    // return null if all the arrays are empty
    return {
      graphData: graphDataArr.every((obj) => isEmpty(obj))
        ? null
        : graphDataArr,
      trendLineData,
      yScale: getYScale(forecastingEnabled, originalData, trendLineData),
    }
  }, [data, metric, projectId, projects, forecastingEnabled, forecastingDays])

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
      margin={{ top: 32, right: 96, bottom: 56, left: 78 }}
      yFormat={(value) => formatByMetric(value, metric)}
      xScale={{ type: 'time' }}
      yScale={yScale}
      curve="natural"
      axisBottom={{
        format: (value) => formatDateTime(value, 'M/DD'),
        legend: 'date',
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legendOffset: 36,
        legendPosition: 'middle',
        truncateTickAt: 0,
      }}
      axisLeft={{
        format: (value) => formatByMetric(value, metric),
        legend: METRIC_OPTIONS[metric]?.label ?? '',
        tickValues: 5,
        tickSize: 5,
        tickPadding: 5,
        tickRotation: 0,
        legendOffset: -60,
        legendPosition: 'middle',
      }}
      layers={[
        'mesh',
        'grid',
        'axes',
        'lines',
        ({ xScale, yScale, data }) =>
          forecastingEnabled && !isEmpty(trendLineData) ? (
            <ForecastingLayer
              xScale={xScale}
              yScale={yScale}
              originalData={data[0]?.data ?? []}
              trendLineData={trendLineData}
            />
          ) : null,
        'crosshair',
        'legends',
      ]}
      xFormat={(value) => formatDateTime(value, 'MMM DD, YYYY')}
      pointSize={0}
      enableTouchCrosshair
      useMesh
      legends={[
        {
          anchor: 'bottom-right',
          direction: 'column',
          justify: false,
          translateX: 100,
          itemWidth: 80,
          itemHeight: 32,
          itemOpacity: 0.75,
          symbolSize: 12,
          symbolShape: 'circle',
          itemTextColor: 'white',
          effects: [
            {
              on: 'hover',
              style: { itemBackground: 'rgba(0, 0, 0, .03)', itemOpacity: 1 },
            },
          ],
        },
      ]}
    />
  )
}

const formatByMetric = (
  value: number | null,
  metric: ProjectUsageMetric
): string => {
  if (isNil(value)) return '--'
  switch (metric) {
    case 'cpu':
    case 'gpu':
      return formatCpu(value)
    case 'memory':
      return formatMemory(value)
    case 'storageCost':
      return `$${value.toFixed(2)}`
  }
}
