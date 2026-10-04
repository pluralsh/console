import { EmptyState } from '@pluralsh/design-system'
import isEmpty from 'lodash/isEmpty'
import { useMemo } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import styled from 'styled-components'

import { MetricsEmptyState } from 'components/cd/cluster/ClusterMetrics'
import { useMetricsEnabled } from 'components/contexts/DeploymentSettingsContext'
import { GqlError } from 'components/utils/Alert'
import {
  MetricsGraphCard,
  MetricsGraphGrid,
  MetricsScrollSC,
} from 'components/utils/metrics/MetricsGraphCard'
import { Graph } from 'components/utils/Graph'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { MetricsTimeRangeControl } from 'components/utils/timerange/MetricsTimeRangeControl'
import { metricsQueryWindow } from 'components/utils/timerange/timeRange'
import {
  useRangeQueryData,
  useTimeRange,
} from 'components/utils/timerange/useTimeRange'
import { usePodMetricsQuery } from 'generated/graphql'

import {
  METRIC_FORMATTERS,
  METRIC_TICK_BASES,
} from 'components/utils/metrics/metricFormats'
import { buildPodMetricGraphs } from './podMetricsGraphs'

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
    },
    skip: !metricsEnabled || !scope || !name || !namespace,
    fetchPolicy: 'cache-and-network',
  })
  const data = useRangeQueryData(
    { data: currentData, previousData },
    timeRange.revision
  )
  const graphs = useMemo(
    () =>
      buildPodMetricGraphs(data?.pod?.metrics).filter(
        ({ data }) => !isEmpty(data)
      ),
    [data]
  )

  if (!metricsEnabled) return <MetricsEmptyState />

  let content = (
    <EmptyState
      message="No metrics available"
      description="Prometheus returned no series for this pod in the selected time range."
    />
  )

  if (error) content = <GqlError error={error} />
  else if (loading && !data)
    content = (
      <RectangleSkeleton
        $height={640}
        $width="100%"
      />
    )
  else if (!isEmpty(graphs))
    content = (
      <MetricsGraphGrid>
        {graphs.map(({ key, title, tooltip, format, data }) => (
          <MetricsGraphCard
            key={key}
            title={title}
            tooltip={tooltip}
          >
            <Graph
              data={data}
              yFormat={METRIC_FORMATTERS[format]}
              yTickBase={METRIC_TICK_BASES[format]}
              timeWindow={timeRange.timeWindow}
              onRangeSelect={timeRange.selectWindow}
            />
          </MetricsGraphCard>
        ))}
      </MetricsGraphGrid>
    )

  return (
    <WrapperSC>
      <MetricsTimeRangeControl timeRange={timeRange} />
      <MetricsScrollSC>{content}</MetricsScrollSC>
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
