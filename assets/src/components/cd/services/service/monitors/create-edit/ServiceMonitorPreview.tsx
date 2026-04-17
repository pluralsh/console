import { ResponsiveLine } from '@nivo/line'
import { EmptyState } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { SliceTooltip } from 'components/utils/ChartTooltip'
import { dateFormat, useGraphTheme } from 'components/utils/Graph'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import {
  InputMaybe,
  LogQueryOperator,
  MonitorAttributes,
  useLogAggregationBucketsQuery,
} from 'generated/graphql'
import { isEmpty, isNil } from 'lodash'
import { useCallback, useMemo } from 'react'
import styled, { useTheme } from 'styled-components'
import { useDebounce } from 'usehooks-ts'
import { COLORS } from 'utils/color'
import { toDateOrUndef } from 'utils/datetime'
import { isNonNullable } from 'utils/isNonNullable'

export function ServiceMonitorPreview({ state }: { state: MonitorAttributes }) {
  const { serviceId, query: q, threshold } = state
  const debouncedQ = useDebounce(q, 250)
  const {
    log: { query, bucketSize, duration, facets, operator },
  } = debouncedQ
  const graphTheme = useGraphTheme()
  const { colors } = useTheme()

  const { data, loading, error } = useLogAggregationBucketsQuery({
    variables: {
      serviceId,
      query,
      time: { duration },
      aggregation: { bucketSize },
      operator: operator as InputMaybe<LogQueryOperator> | undefined,
      facets,
    },
    fetchPolicy: 'network-only', // caching kinda breaks on these because there's no ids to index on
  })

  const buckets = useMemo(
    () => data?.logAggregationBuckets?.filter(isNonNullable) ?? [],
    [data]
  )

  const graphData = useMemo(
    () => [
      {
        id: 'Log count',
        data: buckets
          .map((b) => ({ x: toDateOrUndef(b.timestamp), y: b.count }))
          .filter(
            (point): point is { x: Date; y: number } =>
              !isNil(point.x) && !isNil(point.y)
          ),
      },
    ],
    [buckets]
  )

  const thresholdLayer = useCallback(
    ({ yScale }: { yScale: (v: number) => number }) => {
      const y = yScale(threshold.value)
      const x = -40
      return (
        <text
          y={y}
          textAnchor="end"
          css={{ fill: colors['border-danger'], fontSize: 11 }}
        >
          <tspan
            x={x}
            dy="-0.5em"
          >
            Threshold
          </tspan>
          <tspan
            x={x}
            dy="1em"
          >
            ({threshold.aggregate} = {threshold.value})
          </tspan>
        </text>
      )
    },
    [colors, threshold.aggregate, threshold.value]
  )

  if (!data && loading)
    return (
      <RectangleSkeleton
        $height="100%"
        $width="100%"
      />
    )
  if (error)
    return (
      <GqlError
        margin="small"
        error={error}
      />
    )
  if (isEmpty(graphData[0].data))
    return <EmptyState message="No log data found for this query" />

  return (
    <GraphWrapperSC>
      <ResponsiveLine
        theme={graphTheme}
        data={graphData}
        tooltip={SliceTooltip}
        colors={COLORS}
        layers={[
          'grid',
          'axes',
          'areas',
          'crosshair',
          'lines',
          'markers',
          thresholdLayer,
          'points',
          'slices',
          'mesh',
          'legends',
        ]}
        margin={{ top: 20, right: 20, bottom: 60, left: 120 }}
        xScale={{ type: 'time', format: 'native' }}
        yScale={{ type: 'linear', min: 0, max: 'auto' }}
        xFormat={dateFormat}
        lineWidth={1}
        enablePoints={false}
        useMesh
        axisBottom={{ format: '%m/%d %H:%M', tickRotation: 20 }}
        axisLeft={{ legend: 'log count', legendOffset: -42 }}
        markers={[
          {
            axis: 'y',
            value: threshold.value,
            lineStyle: {
              stroke: colors['border-danger'],
              strokeDasharray: '6 4',
            },
          },
        ]}
      />
    </GraphWrapperSC>
  )
}

const GraphWrapperSC = styled.div((_) => ({
  height: '100%',
  width: '100%',
}))
