import { useMemo } from 'react'
import { useQuery } from '@apollo/client'
import { sumBy } from 'lodash'

import { Flex } from 'honorable'
import { Card, LoopingLogo } from '@pluralsh/design-system'

import type { Node, NodeMetric } from 'generated/graphql'
import { cpuParser, memoryParser } from 'utils/kubernetes'

import { ResponsivePageFullWidth } from 'components/utils/layout/ResponsivePageFullWidth'

import { POLL_INTERVAL } from '../constants'
import { NODES_Q } from '../queries'

import { ClusterMetrics } from './ClusterMetrics'
import { NodesList } from './NodesList'

export type ResourceUsage = {
  cpu: number
  mem: number
} | null

export default function Nodes() {
  const { data, refetch } = useQuery<{
    nodes: Node[]
    nodeMetrics: NodeMetric[]
  }>(NODES_Q, {
    pollInterval: POLL_INTERVAL,
    fetchPolicy: 'cache-and-network',
  })

  const usage: ResourceUsage = useMemo(() => {
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
    return <LoopingLogo />
  }

  return (
    <ResponsivePageFullWidth
      heading="Nodes"
    >
      <Flex
        direction="column"
        gap="xlarge"
      >
        <Card padding="xlarge">
          <ClusterMetrics
            nodes={data.nodes}
            usage={usage}
          />
        </Card>
        <NodesList
          nodes={data.nodes}
          nodeMetrics={data.nodeMetrics}
          refetch={refetch}
        />
      </Flex>
    </ResponsivePageFullWidth>
  )
}
