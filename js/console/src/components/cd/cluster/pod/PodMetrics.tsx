import { useOutletContext, useParams } from 'react-router-dom'
import styled from 'styled-components'

import { MetricsEmptyState } from 'components/cd/cluster/ClusterMetrics'
import { usageFieldVariables } from 'components/cd/cluster/metrics/clusterMetricsGraphs'
import { UsageMetricGraphCard } from 'components/cd/cluster/metrics/UsageMetricGraphCard'
import { useMetricsEnabled } from 'components/contexts/DeploymentSettingsContext'
import {
  MetricsGraphGrid,
  MetricsScrollSC,
} from 'components/utils/metrics/MetricsGraphCard'
import { MetricsTimeRangeControl } from 'components/utils/timerange/MetricsTimeRangeControl'
import { metricsQueryWindow } from 'components/utils/timerange/timeRange'
import {
  type TimeRangeState,
  useRangeQueryData,
  useTimeRange,
} from 'components/utils/timerange/useTimeRange'
import { usePodMetricsQuery } from 'generated/graphql'

import { POD_METRIC_GRAPHS, type PodMetricGraph } from './podMetricsGraphs'

type PodScope = { clusterId: string } | { serviceId: string }

function PodMetricGraphCard({
  scope,
  name,
  namespace,
  graph,
  timeRange,
}: {
  scope: PodScope
  name: string
  namespace: string
  graph: PodMetricGraph
  timeRange: TimeRangeState
}) {
  const {
    data: currentData,
    previousData,
    loading,
    error,
  } = usePodMetricsQuery({
    variables: {
      name,
      namespace,
      ...scope,
      ...metricsQueryWindow(timeRange.timeWindow),
      ...usageFieldVariables(graph.fields),
    },
    // every graph selects different fields of one un-normalized object, so
    // caching makes each response re-diff every other graph's series
    fetchPolicy: 'no-cache',
  })
  const data = useRangeQueryData(
    { data: currentData, previousData },
    timeRange.revision
  )

  return (
    <UsageMetricGraphCard
      graph={graph}
      metrics={data?.pod?.metrics}
      loading={loading}
      error={error}
      timeRange={timeRange}
    />
  )
}

export function PodMetrics({
  clusterId,
  serviceId,
  name,
  namespace,
}: {
  clusterId?: Nullable<string>
  serviceId?: Nullable<string>
  name: string
  namespace: string
}) {
  const metricsEnabled = useMetricsEnabled()
  const timeRange = useTimeRange()
  const scope = serviceId ? { serviceId } : clusterId ? { clusterId } : null

  if (!metricsEnabled) return <MetricsEmptyState />

  return (
    <WrapperSC>
      <MetricsTimeRangeControl timeRange={timeRange} />
      <MetricsScrollSC>
        {scope && name && namespace && (
          <MetricsGraphGrid>
            {POD_METRIC_GRAPHS.map((graph) => (
              <PodMetricGraphCard
                key={graph.key}
                scope={scope}
                name={name}
                namespace={namespace}
                graph={graph}
                timeRange={timeRange}
              />
            ))}
          </MetricsGraphGrid>
        )}
      </MetricsScrollSC>
    </WrapperSC>
  )
}

/** Route element for CD pod pages (cluster, service and flow scoped). */
export function PodMetricsTab() {
  const { clusterId, serviceId } = useParams()
  const { pod } = useOutletContext() as {
    pod: { metadata: { name: string; namespace?: Nullable<string> } }
  }

  return (
    <PodMetrics
      clusterId={clusterId}
      serviceId={serviceId}
      name={pod.metadata.name}
      namespace={pod.metadata.namespace ?? ''}
    />
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  height: '100%',
  minHeight: 0,
}))
