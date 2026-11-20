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

import { useServiceDeploymentComponentMetricsQuery } from 'generated/graphql'

import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { ComponentDetailsContext } from './ComponentDetails'
import { getPodResourceReservations } from 'components/utils/metrics/podResourceReservations.ts'
import {
  type ResourceMetricGraph,
  resourceMetricGraphs,
} from 'components/utils/metrics/resourceMetricGraphs'
import { ComponentDetailsWithPodsT } from './useFetchComponentDetails.tsx'

function ComponentMetricGraphCard({
  serviceId,
  componentId,
  graph,
  timeRange,
}: {
  serviceId?: string
  componentId?: string
  graph: ResourceMetricGraph
  timeRange: TimeRangeState
}) {
  const {
    data: currentData,
    previousData,
    loading,
    error,
  } = useServiceDeploymentComponentMetricsQuery({
    variables: {
      id: serviceId,
      componentId: componentId ?? '',
      ...metricsQueryWindow(timeRange.timeWindow),
      ...usageFieldVariables(graph.fields),
    },
    skip: !serviceId || !componentId,
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
      metrics={data?.serviceDeployment?.componentMetrics}
      loading={loading}
      error={error}
      timeRange={timeRange}
    />
  )
}

export default function ComponentMetrics() {
  const theme = useTheme()
  const timeRange = useTimeRange()
  const { component, componentDetails, serviceId } =
    useOutletContext<ComponentDetailsContext>()

  const graphs = useMemo(
    () =>
      resourceMetricGraphs(
        getPodResourceReservations(
          (componentDetails as ComponentDetailsWithPodsT)?.pods
        )
      ),
    [componentDetails]
  )

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
            <ComponentMetricGraphCard
              key={graph.key}
              serviceId={serviceId}
              componentId={component?.id}
              graph={graph}
              timeRange={timeRange}
            />
          ))}
        </MetricsGraphGrid>
      </MetricsScrollSC>
    </div>
  )
}
