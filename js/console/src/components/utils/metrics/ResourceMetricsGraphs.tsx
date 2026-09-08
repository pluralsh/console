import { useMemo } from 'react'
import { useTheme } from 'styled-components'
import isEmpty from 'lodash/isEmpty'

import { MetricResponseFragment, MetricResult } from 'generated/graphql'
import { Prometheus } from 'utils/prometheus.ts'
import { Graph } from 'components/utils/Graph'
import GraphHeader from 'components/utils/GraphHeader'
import {
  PodResourceReservation,
  addPodResourceReservationSeries,
} from 'components/utils/metrics/podResourceReservations.ts'

type GraphSeries = {
  id: string
  data: { x: Date; y: number }[]
}

type MetricGraph = {
  data: GraphSeries[]
  format: 'cpu' | 'memory'
  title: string
}

function convertVals(
  values: Nullable<Nullable<MetricResult>[]> | undefined
): GraphSeries['data'] {
  return (values ?? []).flatMap((value) => {
    if (value?.timestamp == null || value.value == null) return []

    return [{ x: new Date(value.timestamp * 1000), y: parseFloat(value.value) }]
  })
}

function getMetricPod(metric: MetricResponseFragment['metric']): string {
  return typeof metric?.pod === 'string' ? metric.pod : ''
}

function MetricsRow({
  graphs,
  wrapLegend,
}: {
  graphs: MetricGraph[]
  wrapLegend?: boolean
}) {
  const theme = useTheme()
  const visibleGraphs = graphs.filter(({ data }) => !isEmpty(data))

  if (isEmpty(visibleGraphs)) return null

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
      {visibleGraphs.map(({ data, format, title }) => (
        <div
          key={title}
          css={{
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
          }}
        >
          <GraphHeader title={title} />
          <Graph
            data={data}
            yFormat={(v) => Prometheus.format(v, format)}
            tickRotation={undefined}
            wrapLegend={wrapLegend}
          />
        </div>
      ))}
    </div>
  )
}

export function ResourceMetricsGraphs({
  cpu,
  mem,
  podCpu,
  podMem,
  podReservations,
}: {
  cpu: MetricResponseFragment[]
  mem: MetricResponseFragment[]
  podCpu: MetricResponseFragment[]
  podMem: MetricResponseFragment[]
  podReservations?: PodResourceReservation[]
}) {
  const overallGraphs = useMemo(
    () => [
      {
        data: cpu[0]?.values
          ? [{ id: 'cpu', data: convertVals(cpu[0].values) }]
          : [],
        format: 'cpu' as const,
        title: 'Overall CPU Usage (cores)',
      },
      {
        data: mem[0]?.values
          ? [{ id: 'memory', data: convertVals(mem[0].values) }]
          : [],
        format: 'memory' as const,
        title: 'Overall Memory Usage (bytes)',
      },
    ],
    [cpu, mem]
  )
  const podGraphs = useMemo(() => {
    const cpuGraph = podCpu.map(({ metric, values }) => ({
      id: getMetricPod(metric),
      data: convertVals(values),
    }))
    const memGraph = podMem.map(({ metric, values }) => ({
      id: getMetricPod(metric),
      data: convertVals(values),
    }))

    return [
      {
        data: addPodResourceReservationSeries(cpuGraph, podReservations, 'cpu'),
        format: 'cpu' as const,
        title: 'Pod CPU Usage (cores)',
      },
      {
        data: addPodResourceReservationSeries(
          memGraph,
          podReservations,
          'memory'
        ),
        format: 'memory' as const,
        title: 'Pod Memory Usage (bytes)',
      },
    ]
  }, [podCpu, podMem, podReservations])

  return (
    <>
      <MetricsRow graphs={overallGraphs} />
      <MetricsRow
        graphs={podGraphs}
        wrapLegend
      />
    </>
  )
}
