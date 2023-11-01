import { Card, EmptyState } from '@pluralsh/design-system'
import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { DURATIONS } from 'utils/time'
import { filesize } from 'filesize'
import { isNonNullable } from 'utils/isNonNullable'
import { useTheme } from 'styled-components'
import isEmpty from 'lodash/isEmpty'

import { MetricResponseFragment, useUsageQuery } from 'generated/graphql'

import RangePicker from 'components/utils/RangePicker'
import { Graph } from 'components/utils/Graph'
import GraphHeader from 'components/utils/GraphHeader'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import { POLL_INTERVAL } from '../cluster/constants'

import { ComponentDetailsContext } from './ComponentDetails'

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
          <GraphHeader title="Overall CPU Usage" />
          <Graph
            data={[{ id: 'cpu', data: cpuValues }]}
            yFormat={undefined}
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
          <GraphHeader title="Overall Memory Usage" />
          <Graph
            data={[{ id: 'memory', data: memValues }]}
            yFormat={filesize}
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
          <GraphHeader title="Pod CPU Usage" />
          <Graph
            data={cpuGraph}
            yFormat={undefined}
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
          <GraphHeader title="Pod Memory Usage" />
          <Graph
            data={memGraph}
            yFormat={filesize}
            tickRotation={undefined}
          />
        </div>
      )}
    </div>
  )
}

function Metric({
  name,
  namespace,
  regex,
  duration: { step, offset },
  ...props
}) {
  const { data } = useUsageQuery({
    variables: {
      cpu: `sum(rate(container_cpu_usage_seconds_total{namespace="${namespace}",pod=~"${name}${regex}"}[5m]))`,
      mem: `sum(container_memory_working_set_bytes{namespace="${namespace}",pod=~"${name}${regex}"})`,
      podCpu: `sum(rate(container_cpu_usage_seconds_total{namespace="${namespace}",pod=~"${name}${regex}"}[5m])) by (pod)`,
      podMem: `sum(container_memory_working_set_bytes{namespace="${namespace}",pod=~"${name}${regex}"}) by (pod)`,
      step,
      offset,
    },
    pollInterval: POLL_INTERVAL,
  })

  const { cpu, mem, podCpu, podMem } = useMemo(() => {
    const { cpu, mem, podCpu, podMem } = data || {}

    return {
      cpu: (cpu || []).filter(isNonNullable),
      mem: (mem || []).filter(isNonNullable),
      podCpu: (podCpu || []).filter(isNonNullable),
      podMem: (podMem || []).filter(isNonNullable),
    }
  }, [data])

  if (!data) return <LoadingIndicator />

  let content = <EmptyState message="No metrics available" />

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
  console.log('copntent', content)

  return (
    <Card
      overflow="auto"
      padding="medium"
      gap="small"
      {...props}
    >
      {content}
    </Card>
  )
}

const kindToRegex = {
  deployment: '-[a-z0-9]+-[a-z0-9]+',
  statefulset: '-[0-9]+',
}

export default function ComponentMetrics() {
  const theme = useTheme()
  const [duration, setDuration] = useState<any>(DURATIONS[0])
  const { component } = useOutletContext<ComponentDetailsContext>()
  const componentName = component.name?.toLowerCase()
  const componentKind = component.kind?.toLowerCase()
  const componentNamespace = component.namespace?.toLowerCase()

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
        position="sticky"
        top={0}
      />
      <Metric
        namespace={componentNamespace}
        name={componentName}
        regex={kindToRegex[componentKind]}
        duration={duration}
        maxHeight="100%"
        overflowY="auto"
      />
    </div>
  )
}
