import { Flex } from 'honorable'
import { ClusterFragment, Node } from 'generated/graphql'

import { ClusterMetrics as Metrics } from '../constants'

import { ClusterGauges } from './ClusterGauges'
import { ResourceUsage } from './Nodes'
import { SaturationGraphs } from './SaturationGraphs'

export function replaceMetric(metric, cluster) {
  if (!cluster) return metric

  return metric.replace(`cluster=""`, `cluster="${cluster}"`)
}

export function ClusterMetrics({
  nodes,
  usage,
  cluster,
}: {
  nodes: Node[]
  usage: ResourceUsage
  cluster?: ClusterFragment
}) {
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
        alignItems="stretch"
        justifyContent="center"
        width="100%"
        gap="xsmall"
        overflow="visible"
        wrap="wrap"
      >
        <ClusterGauges
          nodes={nodes}
          usage={usage}
          cluster={cluster}
        />
        <SaturationGraphs
          clusterId={cluster?.id}
          cpu={replaceMetric(
            cluster ? Metrics.CPUCD : Metrics.CPU,
            cluster?.handle
          )}
          mem={replaceMetric(
            cluster ? Metrics.MemoryCD : Metrics.Memory,
            cluster?.handle
          )}
        />
      </Flex>
    </Flex>
  )
}
