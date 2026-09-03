import { Card, EmptyState } from '@pluralsh/design-system'

import RangePicker from 'components/utils/RangePicker'

import { useClusterKubernetesMetricsQuery } from 'generated/graphql'
import isEmpty from 'lodash/isEmpty'

import { dayjsExtended as dayjs, DURATIONS } from 'utils/datetime'
import { useMemo, useState } from 'react'
import { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import { useMetricsEnabled } from 'components/contexts/DeploymentSettingsContext'
import { GqlError } from 'components/utils/Alert.tsx'
import { MetricsEmptyState } from '../../cd/cluster/ClusterMetrics.tsx'
import { RectangleSkeleton } from '../../utils/SkeletonLoaders.tsx'
import { PodResourceReservation } from 'components/utils/metrics/podResourceReservations.ts'
import { ResourceMetricsGraphs } from 'components/utils/metrics/ResourceMetricsGraphs.tsx'
import { useKubernetesPodResourceReservations } from 'components/utils/metrics/useKubernetesPodResourceReservations.ts'

function Metric({
  clusterId,
  group,
  version,
  kind,
  name,
  namespace,
  podReservations,
  duration: { step, offset },
  ...props
}: {
  clusterId: string
  group: string
  version: string
  kind: string
  name: string
  namespace: string
  podReservations?: PodResourceReservation[]
  duration: { step: string; offset: number }
}) {
  const theme = useTheme()
  const start = useMemo(
    () => dayjs().subtract(offset, 'second').toISOString(),
    [offset]
  )
  const { data, loading, error } = useClusterKubernetesMetricsQuery({
    variables: {
      clusterId,
      group,
      version,
      kind,
      name,
      namespace,
      step,
      start,
    },
    skip: !clusterId || !name || !namespace,
    pollInterval: 60_000,
    fetchPolicy: 'cache-and-network',
  })

  const { cpu, mem, podCpu, podMem } = useMemo(() => {
    const { cpu, mem, podCpu, podMem } = data?.cluster?.componentMetrics || {}

    return {
      cpu: (cpu || []).filter(isNonNullable),
      mem: (mem || []).filter(isNonNullable),
      podCpu: (podCpu || []).filter(isNonNullable),
      podMem: (podMem || []).filter(isNonNullable),
    }
  }, [data])

  let content = <EmptyState message="No metrics available" />

  if (error) {
    return <GqlError error={error} />
  }

  if (!isEmpty(cpu) || !isEmpty(mem) || !isEmpty(podCpu) || !isEmpty(podMem)) {
    content = (
      <ResourceMetricsGraphs
        cpu={cpu}
        mem={mem}
        podCpu={podCpu}
        podMem={podMem}
        podReservations={podReservations}
      />
    )
  }

  if (loading && !data)
    return (
      <RectangleSkeleton
        $height="100%"
        $width="100%"
      />
    )

  return (
    <Card
      css={{
        padding: theme.spacing.medium,
        overflow: 'auto',
        gap: theme.spacing.small,
      }}
      {...props}
    >
      {content}
    </Card>
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
  const [duration, setDuration] = useState<any>(DURATIONS[0])
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
      <RangePicker
        duration={duration}
        setDuration={setDuration}
      />
      <Metric
        clusterId={clusterId}
        group={group}
        version={version}
        kind={kind}
        name={name}
        namespace={namespace}
        podReservations={podReservations}
        duration={duration}
      />
    </div>
  )
}
