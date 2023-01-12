import { Flex } from 'honorable'
import { Node } from 'generated/graphql'

import { ClusterMetrics as Metrics } from '../constants'

import { ClusterGauges } from './ClusterGauges'
import { ResourceUsage } from './Nodes'
import { SaturationGraphs } from './SaturationGraphs'

export function ClusterMetrics({
  nodes,
  usage,
}: {
  nodes: Node[]
  usage: ResourceUsage
}) {
  return (
    <Flex
      flex={false}
      direction="column"
      gap="xlarge"
      align="center"
    >
      <ClusterGauges
        nodes={nodes}
        usage={usage}
      />
      <SaturationGraphs
        cpu={Metrics.CPU}
        mem={Metrics.Memory}
      />
    </Flex>
  )
}
