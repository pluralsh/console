import { Card, EmptyState } from '@pluralsh/design-system'
import { Graph } from 'components/utils/Graph'
import GraphHeader from 'components/utils/GraphHeader'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import RangePicker from 'components/utils/RangePicker'

import {
  MetricResponseFragment,
  useClusterKubernetesMetricsQuery,
} from 'generated/graphql'
import isEmpty from 'lodash/isEmpty'

import { dayjsExtended as dayjs, DURATIONS } from 'utils/datetime'
import { useMemo, useState } from 'react'
import { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'
import { Prometheus } from '../../../utils/prometheus.ts'
import { useMetricsEnabled } from 'components/contexts/DeploymentSettingsContext'
import { GqlError } from 'components/utils/Alert.tsx'
import { MetricsEmptyState } from '../../cd/cluster/ClusterMetrics.tsx'

const convertVals = (values) =>
  values.map(({ timestamp, value }) => ({
    x: new Date(timestamp * 1000),
    y: parseFloat(value),
  }))

function Graphs({
  cpu: [cpu],
  mem: [mem],
}: {
  cpu: MetricResponseFragment[]
  mem: MetricResponseFragment[]
}) {
  const theme = useTheme()

  const { cpuValues, memValues } = useMemo(
    () => ({
      cpuValues: cpu?.values ? convertVals(cpu?.values) : null,
      memValues: mem?.values ? convertVals(mem?.values) : null,
    }),
    [cpu, mem]
  )

  if (!memValues && !cpuValues) {
    return null
  }

  return (
    <div
      css={{
        display: 'flex',
        gap: theme.spacing.large,
        flexGrow: 1,
        height: 320,
        padding: theme.spacing.large,
      }}
    >
      {cpuValues && (
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
          }}
        >
          <GraphHeader title="Overall CPU Usage (cores)" />
          <Graph
            data={[{ id: 'cpu', data: cpuValues }]}
            yFormat={(v) => Prometheus.format(v, 'cpu')}
            tickRotation={undefined}
          />
        </div>
      )}
      {memValues && (
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
          }}
        >
          <GraphHeader title="Overall Memory Usage (bytes)" />
          <Graph
            data={[{ id: 'memory', data: memValues }]}
            yFormat={(v) => Prometheus.format(v, 'memory')}
            tickRotation={undefined}
          />
        </div>
      )}
    </div>
  )
}

function PodGraphs({
  cpu,
  mem,
}: {
  cpu: MetricResponseFragment[]
  mem: MetricResponseFragment[]
}) {
  const theme = useTheme()
  const { cpuGraph, memGraph } = useMemo(() => {
    const cpuGraph = cpu.map(({ metric, values }) => ({
      id: (metric as any)?.pod,
      data: convertVals(values),
    }))
    const memGraph = mem.map(({ metric, values }) => ({
      id: (metric as any)?.pod,
      data: convertVals(values),
    }))

    return { cpuGraph, memGraph }
  }, [cpu, mem])

  if (!memGraph && !cpuGraph) {
    return null
  }

  return (
    <div
      css={{
        display: 'flex',
        gap: theme.spacing.large,
        flexGrow: 1,
        height: 320,
        padding: theme.spacing.large,
      }}
    >
      {!isEmpty(cpuGraph) && (
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
          }}
        >
          <GraphHeader title="Pod CPU Usage (cores)" />
          <Graph
            data={cpuGraph}
            yFormat={(v) => Prometheus.format(v, 'cpu')}
            tickRotation={undefined}
          />
        </div>
      )}
      {!isEmpty(memGraph) && (
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
          }}
        >
          <GraphHeader title="Pod Memory Usage (bytes)" />
          <Graph
            data={memGraph}
            yFormat={(v) => Prometheus.format(v, 'memory')}
            tickRotation={undefined}
          />
        </div>
      )}
    </div>
  )
}

function Metric({
  clusterId,
  group,
  version,
  kind,
  name,
  namespace,
  duration: { step, offset },
  ...props
}: {
  clusterId: string
  group: string
  version: string
  kind: string
  name: string
  namespace: string
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
      <>
        <Graphs
          cpu={cpu}
          mem={mem}
        />
        <PodGraphs
          cpu={podCpu}
          mem={podMem}
        />
      </>
    )
  }

  if (loading && !data) return <LoadingIndicator />

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
        duration={duration}
      />
    </div>
  )
}
