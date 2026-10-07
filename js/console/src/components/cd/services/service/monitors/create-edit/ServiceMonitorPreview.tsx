import { EmptyState } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { Graph } from 'components/utils/Graph'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import {
  InputMaybe,
  LogQueryOperator,
  useLogAggregationBucketsQuery,
} from 'generated/graphql'
import { isEmpty, isNil } from 'lodash'
import { useMemo } from 'react'
import styled, { useTheme } from 'styled-components'
import { useDebounce } from '@react-hooks-library/core'
import { toDateOrUndef } from 'utils/datetime'
import { isNonNullable } from 'utils/isNonNullable'
import type { ServiceMonitorAttributes } from './ServiceMonitorCreateOrEdit'

export function ServiceMonitorPreview({
  state,
}: {
  state: ServiceMonitorAttributes
}) {
  const { serviceId, query: q, threshold } = state
  const debouncedQ = useDebounce(q, 250)
  const {
    log: { query, bucketSize, duration, facets, operator },
  } = debouncedQ
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
    fetchPolicy: 'cache-and-network',
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

  const markers = useMemo(
    () => [
      {
        axis: 'y' as const,
        value: threshold.value,
        legend: `threshold (${threshold.aggregate} = ${threshold.value})`,
        legendPosition: 'top-left' as const,
        lineStyle: {
          stroke: colors['border-danger'],
          strokeDasharray: '6 4',
        },
        textStyle: { fill: colors['border-danger'], fontSize: 11 },
      },
    ],
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
      <Graph
        data={graphData}
        yFormat={(v: number) => v.toLocaleString()}
        yTickBase="integer"
        markers={markers}
      />
    </GraphWrapperSC>
  )
}

const GraphWrapperSC = styled.div((_) => ({
  height: '100%',
  width: '100%',
}))
