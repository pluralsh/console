import React, { useCallback, useMemo } from 'react'
import { Div, Flex } from 'honorable'

import { NodeStatus, NodeUsage, Pod } from 'generated/graphql'
import { cpuParser, memoryParser } from 'utils/kubernetes'

import { NodeMetrics } from '../constants'
import { getPodResources } from '../pods/getPodResources'

import { getAllContainersFromPods } from '../utils'

import {
  CpuReservationGauge,
  CpuUsageGauge,
  MemoryReservationGauge,
  MemoryUsageGauge,
} from '../Gauges'

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
      cpuUsage: cpuUsed !== undefined
        && cpuTotal !== undefined && {
        used: cpuUsed,
        remainder: cpuTotal - cpuUsed || 0,
      },
      cpuReservation: cpuReservations,
      memoryUsage: memUsed !== undefined
        && memTotal !== undefined && {
        used: memUsed,
        remainder: memTotal - memUsed,
      },
      memoryReservation: memoryReservations,
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
      direction="column"
      gap="xlarge"
      align="center"
    >
      <Flex
        flex={false}
        flexDirection="row"
        align="center"
        justifyContent="center"
        width="100%"
        gap="medium"
        marginBottom="xlarge"
        overflow="visible"
      >
        <CpuUsageGauge {...chartData.cpuUsage} />
        <CpuReservationGauge {...chartData.cpuReservation} />
        <MemoryUsageGauge {...chartData.memoryUsage} />
        <MemoryReservationGauge {...chartData.memoryReservation} />
      </Flex>
      <Div width="100%">
        <SaturationGraphs
          cpu={localize(NodeMetrics.CPU)}
          mem={localize(NodeMetrics.Memory)}
        />
      </Div>
    </Flex>
  )
}
