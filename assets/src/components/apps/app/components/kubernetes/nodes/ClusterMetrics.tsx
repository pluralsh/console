import { Flex } from 'honorable'

import { ClusterMetrics as Metrics } from '../constants'

import { ClusterGauges } from './ClusterGauges'
import { SaturationGraphs } from './SaturationGraphs'

export function ClusterMetrics({ nodes, usage }) {
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
