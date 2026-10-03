import { EmptyState } from '@pluralsh/design-system'
import isEmpty from 'lodash/isEmpty'
import { useMemo } from 'react'
import { useOutletContext, useParams } from 'react-router-dom'
import styled from 'styled-components'

import { MetricsEmptyState } from 'components/cd/cluster/ClusterMetrics'
import { useMetricsEnabled } from 'components/contexts/DeploymentSettingsContext'
import { GqlError } from 'components/utils/Alert'
import { MetricsCard } from 'components/utils/metrics/MetricsCard'
import { Graph } from 'components/utils/Graph'
import GraphHeader from 'components/utils/GraphHeader'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { MetricsTimeRangeControl } from 'components/utils/timerange/MetricsTimeRangeControl'
import { metricsQueryWindow } from 'components/utils/timerange/timeRange'
import {
  useRangeQueryData,
  useTimeRange,
} from 'components/utils/timerange/useTimeRange'
import { usePodMetricsQuery } from 'generated/graphql'

import {
  POD_METRIC_FORMATTERS,
  POD_METRIC_TICK_BASES,
  buildPodMetricGraphs,
} from './podMetricsGraphs'

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
      <GridSC>
        {graphs.map(({ key, title, tooltip, format, data }) => (
          <GraphCardSC key={key}>
            <GraphHeader
              title={title}
              tooltip={tooltip}
            />
            <div css={{ flex: 1, minHeight: 0 }}>
              <Graph
                data={data}
                yFormat={POD_METRIC_FORMATTERS[format]}
                yTickBase={POD_METRIC_TICK_BASES[format]}
                timeWindow={timeRange.timeWindow}
                onRangeSelect={timeRange.selectWindow}
              />
            </div>
          </GraphCardSC>
        ))}
      </GridSC>
    )

  return (
    <WrapperSC>
      <MetricsTimeRangeControl timeRange={timeRange} />
      {content}
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
  paddingBottom: theme.spacing.large,
}))

const GraphCardSC = styled(MetricsCard)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  height: 340,
  padding: theme.spacing.medium,
}))

const GridSC = styled.div(({ theme }) => ({
  display: 'grid',
  gap: theme.spacing.medium,
  gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))',
}))
