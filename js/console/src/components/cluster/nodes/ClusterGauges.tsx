import { memo, useMemo } from 'react'

import { MetricResult } from 'generated/graphql'
import RadialBarChart from 'components/utils/RadialBarChart'

import { GaugeWrap, ResourceGauge } from '../Gauges'
import { Prometheus } from '../../../utils/prometheus'

export type CPUClusterMetrics = {
  usage: Array<MetricResult>
  requests: Array<MetricResult>
  limits: Array<MetricResult>
  total: number
}

export type MemoryClusterMetrics = {
  usage: Array<MetricResult>
  requests: Array<MetricResult>
  limits: Array<MetricResult>
  total: number
}

export type PodsClusterMetrics = {
  used: Array<MetricResult>
  total: number
}

export const ClusterGauges = memo(
  ({
    cpu,
    memory,
    pods,
  }: {
    cpu: CPUClusterMetrics
    memory: MemoryClusterMetrics
    pods: PodsClusterMetrics
  }) => {
    const hasCPUMetrics =
      !!cpu?.usage && !!cpu?.limits && !!cpu?.requests && cpu?.total > 0
    const hasMemoryMetrics =
      !!memory?.usage &&
      !!memory?.limits &&
      !!memory?.requests &&
      memory?.total > 0
    const hasPodMetrics = !!pods?.used && pods?.total > 0

    const chartData = useMemo(() => {
      if (!hasCPUMetrics || !hasMemoryMetrics || !hasPodMetrics) {
        return null
      }

      return {
        cpu: {
          used: Prometheus.avg(cpu.usage),
          total: cpu.total,
          requests: Prometheus.avg(cpu.requests),
          limits: Prometheus.avg(cpu.limits),
        },
        memory: {
          used: Prometheus.avg(memory.usage),
          total: memory.total,
          requests: Prometheus.avg(memory.requests),
          limits: Prometheus.avg(memory.limits),
        },
        pods: {
          used: Prometheus.pods(pods.used),
          total: pods.total,
          remainder: pods.total - Prometheus.pods(pods.used),
        },
      }
    }, [cpu, memory, pods, hasCPUMetrics, hasMemoryMetrics, hasPodMetrics])

    if (!chartData) return null

    return (
      <>
        <GaugeWrap
          heading="CPU Reservation"
          width="auto"
          height="auto"
        >
          <ResourceGauge
            {...chartData.cpu}
            type="cpu"
          />
        </GaugeWrap>
        <GaugeWrap
          heading="Memory Reservation"
          width="auto"
          height="auto"
        >
          <ResourceGauge
            {...chartData.memory}
            type="memory"
          />
        </GaugeWrap>
        <GaugeWrap
          heading="Pods"
          width="auto"
          height="auto"
        >
          <RadialBarChart
            data={[
              {
                id: 'Pod usage',
                data: [
                  {
                    x: 'Pods used',
                    y: chartData.pods.used,
                  },
                  {
                    x: 'Pods available',
                    y: chartData.pods.remainder,
                  },
                ],
              },
            ]}
            centerLabel="Used"
            centerVal={`${Math.round(
              (chartData.pods.used / chartData.pods.total) * 100
            )}%`}
          />
        </GaugeWrap>
      </>
    )
  }
)
