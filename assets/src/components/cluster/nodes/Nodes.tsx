import { useMemo } from 'react'
import { useQuery } from 'react-apollo'
import { sumBy } from 'lodash'

import { Flex } from 'honorable'
import { Card } from '@pluralsh/design-system'
import { ScrollablePage } from 'components/layout/ScrollablePage'

import type { Node, NodeMetric } from 'generated/graphql'
import { cpuParser, memoryParser } from 'utils/kubernetes'
import { LoopingLogo } from 'components/utils/AnimatedLogo'

import { POLL_INTERVAL } from '../constants'
import { NODES_Q } from '../queries'

import { ClusterMetrics } from './ClusterMetrics'
import { NodesList } from './NodesList'

export default function Nodes() {
  const { data } = useQuery<{
    nodes: Node[]
    nodeMetrics: NodeMetric[]
  }>(NODES_Q, {
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })

  const usage = useMemo(() => {
    if (!data) {
      return null
    }
    const cpu = sumBy(data.nodeMetrics,
      metrics => cpuParser(metrics?.usage?.cpu) ?? 0)
    const mem = sumBy(data.nodeMetrics,
      metrics => memoryParser((metrics as any)?.usage?.memory) ?? 0)

    return { cpu, mem }
  }, [data])

  if (!data) {
    return <LoopingLogo dark />
  }

  return (
    <ScrollablePage heading="Nodes">
      <Flex
        direction="column"
        gap="xlarge"
      >
        <NodesList
          nodes={data.nodes}
          nodeMetrics={data.nodeMetrics}
        />
        <Card padding="xlarge">
          <ClusterMetrics
            nodes={data.nodes}
            usage={usage}
          />
        </Card>
      </Flex>
    </ScrollablePage>
  )
}

