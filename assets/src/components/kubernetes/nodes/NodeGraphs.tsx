import React, { useCallback, useMemo } from 'react'
import { Box } from 'grommet'
import { memoryParser } from 'kubernetes-resource-parser'
import { filesize } from 'filesize'

import { cpuParser } from '../../../utils/kubernetes'
import { NodeMetrics } from '../constants'
import { podResources } from '../pods/Pod'

import { SaturationGraphs } from './SaturationGraphs'
import { cpuFmt, podContainers } from './Node'
import { LayeredGauge } from './ClusterGauges'

export function NodeGraphs({
  status: { capacity }, pods, name, usage,
}) {
  const { requests, limits } = useMemo(() => {
    const containers = podContainers(pods)
    const requests = podResources(containers, 'requests')
    const limits = podResources(containers, 'limits')

    return { requests, limits }
  }, [pods])
  const localize = useCallback(metric => metric.replaceAll('{instance}', name), [name])

  return (
    <Box
      flex={false}
      direction="row"
      gap="medium"
      align="center"
    >
      <LayeredGauge
        usage={cpuParser(usage.cpu)}
        requests={requests.cpu}
        limits={limits.cpu}
        total={cpuParser(capacity.cpu)}
        name="CPU"
        title="CPU Reservation"
        format={cpuFmt}
      />
      <LayeredGauge
        usage={memoryParser(usage.memory)}
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
