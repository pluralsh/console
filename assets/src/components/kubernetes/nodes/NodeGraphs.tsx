import React, { useCallback, useMemo } from 'react'
import { Box } from 'grommet'
import { memoryParser } from 'kubernetes-resource-parser'
import { filesize } from 'filesize'

import { NodeStatus, NodeUsage, Pod } from 'generated/graphql'

import { cpuParser } from '../../../utils/kubernetes'
import { NodeMetrics } from '../constants'
import { podResources } from '../pods/Pod'

import { cpuFmt, podContainers } from '../utils'

import { SaturationGraphs } from './SaturationGraphs'
import { LayeredGauge } from './ClusterGauges'

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
  const { requests, limits } = useMemo(() => {
    const containers = podContainers(pods)
    const requests = podResources(containers, 'requests')
    const limits = podResources(containers, 'limits')

    return { requests, limits }
  }, [pods])
  const localize = useCallback(metric => metric.replaceAll('{instance}', name),
    [name])
  const capacity = ((status?.capacity as unknown as {cpu?: string, memory?:string}) ?? {})

  console.log('CAPACITY', capacity)

  return (
    <Box
      flex={false}
      direction="row"
      gap="medium"
      align="center"
    >
      <LayeredGauge
        usage={cpuParser(usage?.cpu)}
        requests={requests.cpu}
        limits={limits.cpu}
        total={cpuParser(capacity?.cpu)}
        name="CPU"
        title="CPU Reservation"
        format={cpuFmt}
      />
      <LayeredGauge
        usage={memoryParser(usage?.memory)}
        requests={requests.memory}
        limits={limits.memory}
        total={memoryParser(capacity.memory)}
        name="Mem"
        title="Memory Reservation"
        format={filesize}
      />
      <Box fill="horizontal">
        <SaturationGraphs
          cpu={localize(NodeMetrics.CPU)}
          mem={localize(NodeMetrics.Memory)}
        />
      </Box>
    </Box>
  )
}
