import { usageFieldVariables } from 'components/cd/cluster/metrics/clusterMetricsGraphs'
import { UsageMetricGraphCard } from 'components/cd/cluster/metrics/UsageMetricGraphCard'
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

import { useClusterKubernetesMetricsQuery } from 'generated/graphql'

import { useMemo } from 'react'
import { useTheme } from 'styled-components'
import { useMetricsEnabled } from 'components/contexts/DeploymentSettingsContext'
import { MetricsEmptyState } from '../../cd/cluster/ClusterMetrics.tsx'
import {
  type ResourceMetricGraph,
  resourceMetricGraphs,
} from 'components/utils/metrics/resourceMetricGraphs'
import { useKubernetesPodResourceReservations } from 'components/utils/metrics/useKubernetesPodResourceReservations.ts'

type Resource = {
  clusterId: string
  group: string
  version: string
  kind: string
  name: string
  namespace: string
}

function KubernetesMetricGraphCard({
  resource,
  graph,
  timeRange,
}: {
  resource: Resource
  graph: ResourceMetricGraph
  timeRange: TimeRangeState
}) {
  const {
    data: currentData,
    previousData,
    loading,
    error,
  } = useClusterKubernetesMetricsQuery({
    variables: {
      ...resource,
      ...metricsQueryWindow(timeRange.timeWindow),
      ...usageFieldVariables(graph.fields),
    },
    skip: !resource.clusterId || !resource.name || !resource.namespace,
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
      metrics={data?.cluster?.componentMetrics}
      loading={loading}
      error={error}
      timeRange={timeRange}
    />
  )
}

export default function KubernetesMetrics({
  clusterId,
  group,
  version,
  kind,
  name,
  namespace,
}: Resource) {
  const theme = useTheme()
  const timeRange = useTimeRange()
  const metricsEnabled = useMetricsEnabled()
  const podReservations = useKubernetesPodResourceReservations({
    clusterId,
    enabled: metricsEnabled,
    kind,
    name,
    namespace,
  })
  const graphs = useMemo(
    () => resourceMetricGraphs(podReservations),
    [podReservations]
  )
  const resource = useMemo(
    () => ({ clusterId, group, version, kind, name, namespace }),
    [clusterId, group, version, kind, name, namespace]
  )

  if (!metricsEnabled) return <MetricsEmptyState />

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.medium,
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <MetricsTimeRangeControl timeRange={timeRange} />
      <MetricsScrollSC>
        <MetricsGraphGrid>
          {graphs.map((graph) => (
            <KubernetesMetricGraphCard
              key={graph.key}
              resource={resource}
              graph={graph}
              timeRange={timeRange}
            />
          ))}
        </MetricsGraphGrid>
      </MetricsScrollSC>
    </div>
  )
}
