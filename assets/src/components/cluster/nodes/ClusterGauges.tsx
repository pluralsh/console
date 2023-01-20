import { useMemo } from 'react'
import { Flex } from 'honorable'
import { useQuery } from '@apollo/client'
import { memoryParser } from 'kubernetes-resource-parser'
import { sumBy } from 'lodash'

import { MetricResponse, Node } from 'generated/graphql'
import { cpuParser } from 'utils/kubernetes'

import RadialBarChart from 'components/utils/RadialBarChart'

import { ClusterMetrics as Metrics } from '../constants'
import { NODE_METRICS_Q } from '../queries'

import { GaugeWrap, ResourceGauge } from '../Gauges'

import { ResourceUsage } from './Nodes'

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
      cpu: cpuUsed !== undefined && {
        used: cpuUsed,
        total: cpuTotal,
        requests: cpuRequests,
        limits: cpuLimits,
      },
      memory: memUsed !== undefined && {
        used: memUsed,
        total: memTotal,
        requests: memRequests || 0,
        limits: memLimits,
      },
      pods: {
        used: podsUsed || 0,
        total: podsTotal,
        remainder: podsTotal - (podsUsed || 0),
      },
    }
  }, [data, nodes, usage])

  if (!chartData) {
    return null
  }

  return (
    <Flex
      flex={false}
      flexDirection="row"
      alignItems="stretch"
      justifyContent="center"
      width="100%"
      gap="xsmall"
      marginBottom="xlarge"
      overflow="visible"
      wrap="wrap"
    >
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
          centerVal={`${Math.round((chartData.pods.used / chartData.pods.total) * 100)}%`}
        />
      </GaugeWrap>
    </Flex>
  )
}
