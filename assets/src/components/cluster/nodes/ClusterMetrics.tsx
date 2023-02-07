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
        />
        <SaturationGraphs
          cpu={Metrics.CPU}
          mem={Metrics.Memory}
        />
      </Flex>
    </Flex>
  )
}
