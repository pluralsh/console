import { EmptyState } from '@pluralsh/design-system'
import { MetricsCard } from 'components/utils/metrics/MetricsCard'
import { MetricsScrollSC } from 'components/utils/metrics/MetricsGraphCard'

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
import { isNonNullable } from 'utils/isNonNullable'
import { useMetricsEnabled } from 'components/contexts/DeploymentSettingsContext'
import { GqlError } from 'components/utils/Alert.tsx'
import { MetricsEmptyState } from '../../cd/cluster/ClusterMetrics.tsx'
import { RectangleSkeleton } from '../../utils/SkeletonLoaders.tsx'
import { PodResourceReservation } from 'components/utils/metrics/podResourceReservations.ts'
import {
  ResourceMetricsGraphs,
  hasResourceMetrics,
} from 'components/utils/metrics/ResourceMetricsGraphs.tsx'
import { useKubernetesPodResourceReservations } from 'components/utils/metrics/useKubernetesPodResourceReservations.ts'

function Metric({
  clusterId,
  group,
  version,
  kind,
  name,
  namespace,
  podReservations,
  timeRange,
}: {
  clusterId: string
  group: string
  version: string
  kind: string
  name: string
  namespace: string
  podReservations?: PodResourceReservation[]
  timeRange: TimeRangeState
}) {
  const theme = useTheme()
  const {
    data: currentData,
    previousData,
    loading,
    error,
  } = useClusterKubernetesMetricsQuery({
    variables: {
      clusterId,
      group,
      version,
      kind,
      name,
      namespace,
      ...metricsQueryWindow(timeRange.timeWindow),
    },
    skip: !clusterId || !name || !namespace,
    fetchPolicy: 'cache-and-network',
  })
  const data = useRangeQueryData(
    { data: currentData, previousData },
    timeRange.revision
  )

  const {
    cpu,
    mem,
    podCpu,
    podMem,
    cpuRequests,
    memRequests,
    cpuLimits,
    memLimits,
    podCpuRequests,
    podMemRequests,
    podCpuLimits,
    podMemLimits,
  } = useMemo(() => {
    const {
      cpu,
      mem,
      podCpu,
      podMem,
      cpuRequests,
      memRequests,
      cpuLimits,
      memLimits,
      podCpuRequests,
      podMemRequests,
      podCpuLimits,
      podMemLimits,
    } = data?.cluster?.componentMetrics || {}

    return {
      cpu: (cpu || []).filter(isNonNullable),
      mem: (mem || []).filter(isNonNullable),
      podCpu: (podCpu || []).filter(isNonNullable),
      podMem: (podMem || []).filter(isNonNullable),
      cpuRequests: (cpuRequests || []).filter(isNonNullable),
      memRequests: (memRequests || []).filter(isNonNullable),
      cpuLimits: (cpuLimits || []).filter(isNonNullable),
      memLimits: (memLimits || []).filter(isNonNullable),
      podCpuRequests: (podCpuRequests || []).filter(isNonNullable),
      podMemRequests: (podMemRequests || []).filter(isNonNullable),
      podCpuLimits: (podCpuLimits || []).filter(isNonNullable),
      podMemLimits: (podMemLimits || []).filter(isNonNullable),
    }
  }, [data])

  if (error) {
    return <GqlError error={error} />
  }

  if (loading && !data)
    return (
      <RectangleSkeleton
        $height="100%"
        $width="100%"
      />
    )

  if (
    !hasResourceMetrics({
      cpu,
      mem,
      podCpu,
      podMem,
      cpuRequests,
      memRequests,
      cpuLimits,
      memLimits,
      podCpuRequests,
      podMemRequests,
      podCpuLimits,
      podMemLimits,
    })
  )
    return (
      <MetricsCard css={{ padding: theme.spacing.medium }}>
        <EmptyState message="No metrics available" />
      </MetricsCard>
    )

  return (
    <ResourceMetricsGraphs
      cpu={cpu}
      mem={mem}
      podCpu={podCpu}
      podMem={podMem}
      cpuRequests={cpuRequests}
      memRequests={memRequests}
      cpuLimits={cpuLimits}
      memLimits={memLimits}
      podCpuRequests={podCpuRequests}
      podMemRequests={podMemRequests}
      podCpuLimits={podCpuLimits}
      podMemLimits={podMemLimits}
      podReservations={podReservations}
      timeWindow={timeRange.timeWindow}
      onRangeSelect={timeRange.selectWindow}
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
}: {
  clusterId: string
  group: string
  version: string
  kind: string
  name: string
  namespace: string
}) {
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
        <Metric
          clusterId={clusterId}
          group={group}
          version={version}
          kind={kind}
          name={name}
          namespace={namespace}
          podReservations={podReservations}
          timeRange={timeRange}
        />
      </MetricsScrollSC>
    </div>
  )
}
