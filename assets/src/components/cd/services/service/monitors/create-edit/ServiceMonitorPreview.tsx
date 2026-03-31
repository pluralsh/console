import { ResponsiveLine } from '@nivo/line'
import { EmptyState } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { SliceTooltip } from 'components/utils/ChartTooltip'
import { dateFormat, useGraphTheme } from 'components/utils/Graph'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import {
  MonitorAttributes,
  useLogAggregationBucketsQuery,
} from 'generated/graphql'
import { isEmpty, isNil } from 'lodash'
import { useMemo } from 'react'
import styled, { useTheme } from 'styled-components'
import { useDebounce } from 'usehooks-ts'
import { COLORS } from 'utils/color'
import { toDateOrUndef } from 'utils/datetime'
import { isNonNullable } from 'utils/isNonNullable'

export function ServiceMonitorPreview({ state }: { state: MonitorAttributes }) {
  const { serviceId, query: q, threshold } = state
  const debouncedQ = useDebounce(q, 250)
  const {
    log: { query, bucketSize, duration, facets },
  } = debouncedQ
  const graphTheme = useGraphTheme()
  const { colors } = useTheme()

  const { data, loading, error } = useLogAggregationBucketsQuery({
    variables: {
      serviceId,
      query,
      time: { duration },
      aggregation: { bucketSize },
      facets,
    },
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
        margin={{ top: 20, right: 20, bottom: 60, left: 50 }}
        xScale={{ type: 'time', format: 'native' }}
        yScale={{ type: 'linear', min: 0, max: 'auto' }}
        xFormat={dateFormat}
        curve="monotoneX"
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
            legend: `Threshold (${threshold.aggregate} = ${threshold.value})`,
            legendPosition: 'top-left',
            textStyle: { fill: colors['border-danger'], fontSize: 12 },
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
