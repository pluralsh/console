import React, { useCallback, useMemo } from 'react'
import { Flex } from 'honorable'

import { NodeStatus, NodeUsage, Pod } from 'generated/graphql'
import { cpuParser, memoryParser } from 'utils/kubernetes'

import { getPodResources } from '../pods/getPodResources'

import { NodeMetrics } from '../constants'
import { getAllContainersFromPods } from '../utils'
import { GaugeWrap, ResourceGauge } from '../Gauges'

import { SaturationGraphs } from './SaturationGraphs'

export function NodeGraphs({
  status,
  pods,
  name,
  usage,
}: {
  status?: NodeStatus
  pods?: Pod[]
  name?: string
  usage?: NodeUsage | null
}) {
  const { cpu: cpuReservations, memory: memoryReservations } = useMemo(() => {
    const allContainers = getAllContainersFromPods(pods)

    return getPodResources(allContainers)
  }, [pods])

  const localize = useCallback(metric => metric.replaceAll('{instance}', name),
    [name])
  const capacity
    = (status?.capacity as unknown as { cpu?: string; memory?: string }) ?? {}

  const chartData = useMemo(() => {
    const cpuTotal = cpuParser(capacity.cpu)
    const memTotal = memoryParser(capacity.memory)

    const cpuUsed = cpuParser(usage?.cpu) ?? undefined
    const memUsed = memoryParser(usage?.memory) ?? undefined

    return {
      cpu: cpuUsed !== undefined
        && cpuTotal !== undefined && {
        used: cpuUsed,
        total: cpuTotal,
        remainder: cpuTotal - cpuUsed || 0,
        ...cpuReservations,
      },
      memory: memUsed !== undefined
        && memTotal !== undefined && {
        used: memUsed,
        total: memTotal,
        remainder: memTotal - memUsed,
        ...memoryReservations,
      },
    }
  }, [
    capacity.cpu,
    capacity.memory,
    cpuReservations,
    memoryReservations,
    usage?.cpu,
    usage?.memory,
  ])

  if (!chartData) {
    return null
  }

  return (
    <Flex
      flex={false}
      flexDirection="row"
      align="center"
      justifyContent="center"
      width="100%"
      gap="medium"
      overflow="visible"
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
      <SaturationGraphs
        cpu={localize(NodeMetrics.CPU)}
        mem={localize(NodeMetrics.Memory)}
      />
    </Flex>
  )
}
