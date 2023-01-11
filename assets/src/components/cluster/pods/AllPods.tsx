import { useMemo } from 'react'
import { useQuery } from 'react-apollo'
import { sumBy } from 'lodash'

import { Flex } from 'honorable'
import { Card, LoopingLogo } from '@pluralsh/design-system'
import { ScrollablePage } from 'components/layout/ScrollablePage'

import type { Node, NodeMetric } from 'generated/graphql'
import { cpuParser, memoryParser } from 'utils/kubernetes'

import { PodsList } from './pods/PodsList'

export default function AllPods() {
  const { data, refetch } = useQuery<{
    nodes: Node[]
    nodeMetrics: NodeMetric[]
  }>(PODS_Q, {
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
    return <LoopingLogo />
  }

  return (
    <ScrollablePage heading="Nodes">
      <Flex
        direction="column"
        gap="xlarge"
      >
        <PodsList
          pods={data.pods}
          nodeMetrics={data.nodeMetrics}
          refetch={refetch}
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

