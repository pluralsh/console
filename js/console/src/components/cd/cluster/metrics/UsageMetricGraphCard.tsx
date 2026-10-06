import { EmptyState } from '@pluralsh/design-system'
import { ApolloError } from '@apollo/client'
import { GqlError } from 'components/utils/Alert'
import { Graph } from 'components/utils/Graph'
import { MetricsGraphCard } from 'components/utils/metrics/MetricsGraphCard'
import {
  METRIC_FORMATTERS,
  METRIC_TICK_BASES,
} from 'components/utils/metrics/metricFormats'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import type { TimeRangeState } from 'components/utils/timerange/useTimeRange'
import type { ClusterUsageMetricsFragment } from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useMemo } from 'react'

import type { ClusterMetricGraph } from './clusterMetricsGraphs'

/** Renders one usage graph; callers own fetching so cluster and service scopes can share it. */
export function UsageMetricGraphCard({
  graph: { title, tooltip, format, series },
  metrics,
  loading,
  error,
  timeRange,
}: {
  graph: ClusterMetricGraph
  metrics: Nullable<ClusterUsageMetricsFragment>
  loading: boolean
  error?: ApolloError
  timeRange: TimeRangeState
}) {
  const graphData = useMemo(
    () => (metrics ? series(metrics) : []),
    [metrics, series]
  )

  return (
    <MetricsGraphCard
      title={title}
      tooltip={tooltip}
    >
      {error ? (
        <GqlError error={error} />
      ) : !metrics && loading ? (
        <RectangleSkeleton
          $height="100%"
          $width="100%"
        />
      ) : isEmpty(graphData) ? (
        <EmptyState
          message="No data"
          description="Prometheus returned no series in the selected time range."
        />
      ) : (
        <Graph
          data={graphData}
          yFormat={METRIC_FORMATTERS[format]}
          yTickBase={METRIC_TICK_BASES[format]}
          timeWindow={timeRange.timeWindow}
          onRangeSelect={timeRange.selectWindow}
        />
      )}
    </MetricsGraphCard>
  )
}
