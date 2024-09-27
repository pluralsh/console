import { Card, EmptyState } from '@pluralsh/design-system'
import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { DURATIONS } from 'utils/time'
import { filesize } from 'filesize'
import { isNonNullable } from 'utils/isNonNullable'
import { useTheme } from 'styled-components'
import isEmpty from 'lodash/isEmpty'

import {
  MetricResponseFragment,
  useServiceDeploymentComponentMetricsQuery,
} from 'generated/graphql'

import RangePicker from 'components/utils/RangePicker'
import { Graph } from 'components/utils/Graph'
import GraphHeader from 'components/utils/GraphHeader'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import { format } from '../apps/app/dashboards/dashboard/misc'

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
          <GraphHeader
            title="Overall CPU Usage"
            tooltip="100% usage means that 1 vCore is fully used. Overall usage can exceed 100% if there are more vCores available."
          />
          <Graph
            data={[{ id: 'cpu', data: cpuValues }]}
            yFormat={(v) => format(v, 'percent')}
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
          <GraphHeader
            title="Pod CPU Usage"
            tooltip="100% usage means that 1 vCore is fully used. Overall usage can exceed 100% if there are more vCores available."
          />
          <Graph
            data={cpuGraph}
            yFormat={(v) => format(v, 'percent')}
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
  serviceId,
  componentId,
  name,
  namespace,
  regex,
  duration: { step, offset },
  cluster,
  ...props
}) {
  const theme = useTheme()
  // const stop = moment()
  // const start = stop.subtract({ hour: 2 })

  const { data } = useServiceDeploymentComponentMetricsQuery({
    variables: {
      id: serviceId,
      componentId,
      step,
      // stop: start.toISOString(),
      // start: `${moment().subtract({ hour: 2 }).toISOString()}`,
    },
    pollInterval: 60_000,
    fetchPolicy: 'cache-and-network',
  })

  const { cpu, mem, podCpu, podMem } = useMemo(() => {
    const { cpu, mem, podCpu, podMem } =
      data?.serviceDeployment?.componentMetrics || {}

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

const kindToRegex = {
  deployment: '-[a-z0-9]+-[a-z0-9]+',
  statefulset: '-[0-9]+',
}

export default function ComponentMetrics() {
  const theme = useTheme()
  const [duration, setDuration] = useState<any>(DURATIONS[0])
  const { component, cluster, serviceId } =
    useOutletContext<ComponentDetailsContext>()
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
        serviceId={serviceId}
        componentId={component?.id}
        regex={kindToRegex[componentKind]}
        duration={duration}
        cluster={cluster}
        maxHeight="100%"
        overflowY="auto"
      />
    </div>
  )
}
