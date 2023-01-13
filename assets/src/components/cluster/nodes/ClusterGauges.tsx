import { useMemo } from 'react'
import { Flex } from 'honorable'
import { useQuery } from '@apollo/client'
import { memoryParser } from 'kubernetes-resource-parser'
import { sumBy } from 'lodash'
import { Chart } from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'

import { MetricResponse, Node } from 'generated/graphql'
import { cpuParser } from 'utils/kubernetes'

import RadialBarChart from 'components/utils/RadialBarChart'

import { ClusterMetrics as Metrics } from '../constants'
import { NODE_METRICS_Q } from '../queries'

import {
  CpuReservationGauge,
  CpuUsageGauge,
  MemoryReservationGauge,
  MemoryUsageGauge,
  UsageGauge,
} from '../Gauges'

import { ResourceUsage } from './Nodes'

Chart.register(ChartDataLabels)

type Capacity = { cpu?: string; pods?: string; memory?: string } | undefined

const datum = (data: MetricResponse[]) => (data[0]?.values?.[0]?.value ? parseFloat(data[0].values[0].value) : undefined)

export function ClusterGauges({
  nodes,
  usage,
}: {
  nodes: Node[]
  usage: ResourceUsage
}) {
  const { data } = useQuery<{
    cpuRequests: MetricResponse[]
    cpuLimits: MetricResponse[]
    memRequests: MetricResponse[]
    memLimits: MetricResponse[]
    pods: MetricResponse[]
  }>(NODE_METRICS_Q, {
    variables: {
      cpuRequests: Metrics.CPURequests,
      cpuLimits: Metrics.CPULimits,
      memRequests: Metrics.MemoryRequests,
      memLimits: Metrics.MemoryLimits,
      pods: Metrics.Pods,
      offset: 5 * 60,
    },
    fetchPolicy: 'network-only',
    pollInterval: 5000,
  })

  const chartData = useMemo(() => {
    if (!data) {
      return null
    }
    const cpuRequests = datum(data.cpuRequests)
    const cpuLimits = datum(data.cpuLimits)
    const memRequests = datum(data.memRequests)
    const memLimits = datum(data.memLimits)
    const podsUsed = datum(data.pods)

    const cpuTotal = sumBy(nodes,
      n => cpuParser((n?.status?.capacity as Capacity)?.cpu) ?? 0)
    const memTotal = sumBy(nodes, n => memoryParser((n?.status?.capacity as Capacity)?.memory))
    const podsTotal = sumBy(nodes, n => {
      const pods = (n?.status?.capacity as Capacity)?.pods

      return pods ? parseInt(pods) ?? 0 : 0
    })
    const { cpu: cpuUsed, mem: memUsed } = usage || {}

    return {
      cpuUsage: cpuUsed !== undefined && {
        used: cpuUsed,
        remainder: cpuTotal - cpuUsed || 0,
      },
      cpuReservation: cpuLimits !== undefined
        && cpuRequests !== undefined && {
        requests: cpuRequests,
        remainder: cpuLimits - cpuRequests,
      },
      memoryUsage: memUsed !== undefined && {
        used: memUsed,
        remainder: memTotal - memUsed,
      },
      memoryReservation: memRequests !== undefined
        && memLimits !== undefined && {
        requests: memRequests || 0,
        remainder: memLimits - memRequests,
      },
      podUsage: {
        used: podsUsed || 0,
        remainder: (podsTotal || 0) - (podsUsed || 0),
      },
    }
  }, [data, nodes, usage])

  if (!chartData) {
    return null
  }

  return (
    <>
      <Flex
        flex={false}
        flexDirection="row"
        align="center"
        justifyContent="center"
        width="100%"
        gap="xsmall"
        marginBottom="xlarge"
        overflow="visible"
      >
        <RadialBarChart />
      </Flex>
      <Flex
        flex={false}
        flexDirection="row"
        align="center"
        justifyContent="center"
        width="100%"
        gap="xsmall"
        marginBottom="xlarge"
        overflow="visible"
      >
        <CpuUsageGauge {...chartData.cpuUsage} />
        <CpuReservationGauge {...chartData.cpuReservation} />
        <MemoryUsageGauge {...chartData.memoryUsage} />
        <MemoryReservationGauge {...chartData.memoryReservation} />
        <UsageGauge
          title="Pod Usage"
          {...chartData.podUsage}
          usedLabel="Pods used"
          remainderLabel="Pods available"
        />
      </Flex>
      ¸
    </>
  )
}
