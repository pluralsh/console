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
  dashed?: boolean
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
  cpuRequests,
  memRequests,
  cpuLimits,
  memLimits,
  podCpuRequests,
  podMemRequests,
  podCpuLimits,
  podMemLimits,
  podReservations,
}: {
  cpu: MetricResponseFragment[]
  mem: MetricResponseFragment[]
  podCpu: MetricResponseFragment[]
  podMem: MetricResponseFragment[]
  cpuRequests?: MetricResponseFragment[]
  memRequests?: MetricResponseFragment[]
  cpuLimits?: MetricResponseFragment[]
  memLimits?: MetricResponseFragment[]
  podCpuRequests?: MetricResponseFragment[]
  podMemRequests?: MetricResponseFragment[]
  podCpuLimits?: MetricResponseFragment[]
  podMemLimits?: MetricResponseFragment[]
  podReservations?: PodResourceReservation[]
}) {
  const overallGraphs = useMemo(() => {
    const toOverallSeries = (
      usage: MetricResponseFragment[],
      requests: MetricResponseFragment[] | undefined,
      limits: MetricResponseFragment[] | undefined,
      usageId: string
    ): GraphSeries[] => {
      const series: GraphSeries[] = []
      const usageData = usage[0]?.values
        ? convertVals(usage[0].values)
        : ([] as GraphSeries['data'])

      if (usageData.length > 0) series.push({ id: usageId, data: usageData })

      const requestsData = requests?.[0]?.values
        ? convertVals(requests[0].values)
        : []

      if (requestsData.length > 0)
        series.push({ id: 'requests', data: requestsData, dashed: true })

      const limitsData = limits?.[0]?.values
        ? convertVals(limits[0].values)
        : []

      if (limitsData.length > 0)
        series.push({ id: 'limits', data: limitsData, dashed: true })

      return series
    }

    return [
      {
        data: toOverallSeries(cpu, cpuRequests, cpuLimits, 'cpu'),
        format: 'cpu' as const,
        title: 'Overall CPU Usage (cores)',
      },
      {
        data: toOverallSeries(mem, memRequests, memLimits, 'memory'),
        format: 'memory' as const,
        title: 'Overall Memory Usage (bytes)',
      },
    ]
  }, [cpu, mem, cpuRequests, memRequests, cpuLimits, memLimits])
  const podGraphs = useMemo(() => {
    const toPodGraph = (metrics: MetricResponseFragment[]): GraphSeries[] =>
      metrics.map(({ metric, values }) => ({
        id: getMetricPod(metric),
        data: convertVals(values),
      }))

    const cpuGraph = toPodGraph(podCpu)
    const memGraph = toPodGraph(podMem)

    return [
      {
        data: addPodResourceReservationSeries(
          cpuGraph,
          podReservations,
          'cpu',
          podCpuRequests ? toPodGraph(podCpuRequests) : undefined,
          podCpuLimits ? toPodGraph(podCpuLimits) : undefined
        ),
        format: 'cpu' as const,
        title: 'Pod CPU Usage (cores)',
      },
      {
        data: addPodResourceReservationSeries(
          memGraph,
          podReservations,
          'memory',
          podMemRequests ? toPodGraph(podMemRequests) : undefined,
          podMemLimits ? toPodGraph(podMemLimits) : undefined
        ),
        format: 'memory' as const,
        title: 'Pod Memory Usage (bytes)',
      },
    ]
  }, [
    podCpu,
    podMem,
    podCpuRequests,
    podMemRequests,
    podCpuLimits,
    podMemLimits,
    podReservations,
  ])

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
