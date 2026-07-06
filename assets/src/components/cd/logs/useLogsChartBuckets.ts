import {
  LogFacetInput,
  LogQueryOperator,
  LogTimeRange,
  useLogAggregationBucketsQuery,
} from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useMemo } from 'react'
import {
  bucketDurationMs,
  bucketSizeForWindow,
  combineLogQuery,
  LOG_LEVEL_CHART_LAYERS,
  mergeStackedBuckets,
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
  const baseVars = {
    clusterId,
    serviceId,
    time,
    aggregation: { bucketSize },
    operator,
    facets,
  }
  const queryOpts = {
    fetchPolicy: 'cache-and-network' as const,
    pollInterval,
    skip,
  }

  const { data: totalData, loading } = useLogAggregationBucketsQuery({
    variables: { ...baseVars, query },
    ...queryOpts,
  })
  const { data: successData } = useLogAggregationBucketsQuery({
    variables: {
      ...baseVars,
      query: combineLogQuery(query, LOG_LEVEL_CHART_LAYERS[0].query),
    },
    ...queryOpts,
  })
  const { data: warnData } = useLogAggregationBucketsQuery({
    variables: {
      ...baseVars,
      query: combineLogQuery(query, LOG_LEVEL_CHART_LAYERS[1].query),
    },
    ...queryOpts,
  })
  const { data: errorData } = useLogAggregationBucketsQuery({
    variables: {
      ...baseVars,
      query: combineLogQuery(query, LOG_LEVEL_CHART_LAYERS[2].query),
    },
    ...queryOpts,
  })
  const { data: infoData } = useLogAggregationBucketsQuery({
    variables: {
      ...baseVars,
      query: combineLogQuery(query, LOG_LEVEL_CHART_LAYERS[3].query),
    },
    ...queryOpts,
  })

  const buckets = useMemo(() => {
    const total = parseAggregationBuckets(totalData)
    if (isEmpty(total)) return []
    return mergeStackedBuckets(total, [
      parseAggregationBuckets(successData),
      parseAggregationBuckets(warnData),
      parseAggregationBuckets(errorData),
      parseAggregationBuckets(infoData),
    ])
  }, [totalData, successData, warnData, errorData, infoData])

  return {
    buckets,
    bucketMs,
    initialLoading: loading && !totalData,
  }
}
