import {
  LogFacetInput,
  LogQueryOperator,
  LogTimeRange,
  useLogAggregationBucketsQuery,
} from 'generated/graphql'
import { useMemo } from 'react'
import {
  bucketDurationMs,
  bucketSizeForWindow,
  parseAggregationBuckets,
} from './logsMetricsUtils'

export function useLogsChartBuckets({
  clusterId,
  serviceId,
  query,
  time,
  operator,
  facets,
  sinceSeconds,
  pollInterval = 0,
}: {
  clusterId?: string
  serviceId?: string
  query: string
  time: LogTimeRange
  operator: LogQueryOperator
  facets: LogFacetInput[]
  sinceSeconds: number
  pollInterval?: number
}) {
  const bucketSize = bucketSizeForWindow(sinceSeconds)
  const bucketMs = bucketDurationMs(bucketSize)
  const skip = !(clusterId || serviceId)

  const { data, loading } = useLogAggregationBucketsQuery({
    variables: {
      clusterId,
      serviceId,
      query,
      time,
      aggregation: { bucketSize },
      operator,
      facets,
    },
    fetchPolicy: 'cache-and-network',
    pollInterval,
    skip,
  })

  const buckets = useMemo(() => parseAggregationBuckets(data), [data])

  return {
    buckets,
    bucketMs,
    initialLoading: loading && !data,
  }
}
