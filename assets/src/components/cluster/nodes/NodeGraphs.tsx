import React, { useCallback, useMemo } from 'react'
import { filesize } from 'filesize'
import { Div, Flex } from 'honorable'

import { NodeStatus, NodeUsage, Pod } from 'generated/graphql'
import { cpuParser, memoryParser } from 'utils/kubernetes'

import { NodeMetrics } from '../constants'
import { podResources } from '../pods/Pod-old'

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
    <Flex
      flex={false}
      direction="column"
      gap="xlarge"
      align="center"
    >
      <Flex
        direction="row"
        gap="xlarge"
      >
        <LayeredGauge
          usage={cpuParser(usage?.cpu) ?? 0}
          requests={requests.cpu}
          limits={limits.cpu}
          total={cpuParser(capacity?.cpu) ?? 0}
          name="CPU"
          title="CPU Reservation"
          format={cpuFmt}
        />
        <LayeredGauge
          usage={memoryParser(usage?.memory) ?? 0}
          requests={requests.memory}
          limits={limits.memory}
          total={memoryParser(capacity.memory)}
          name="Mem"
          title="Memory Reservation"
          format={filesize}
        />
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
