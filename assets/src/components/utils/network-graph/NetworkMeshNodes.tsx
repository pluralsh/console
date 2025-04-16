import { Card } from '@pluralsh/design-system'
import { type Node, type NodeProps } from '@xyflow/react'

import {
  NetworkMeshStatisticsFragment,
  NetworkMeshWorkloadFragment,
} from 'generated/graphql.ts'
import styled from 'styled-components'

type MeshWorkloadNode = Node<NetworkMeshWorkloadFragment>
type MeshStatisticsNode = Node<NetworkMeshStatisticsFragment>

export function MeshWorkloadNode({ id, data }: NodeProps<MeshWorkloadNode>) {
  return (
    <Card id={id}>
      {data.name} {data.namespace} {data.service}
    </Card>
  )
}

export function MeshStatisticsNode({
  id,
  data,
}: NodeProps<MeshStatisticsNode>) {
  return (
    <StatisticsCardSC id={id}>
      {data.bytes} {data.packets} {data.connections}
    </StatisticsCardSC>
  )
}

const StatisticsCardSC = styled(Card)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  padding: `${theme.spacing.xxsmall}px ${theme.spacing.xsmall}px`,
  alignItems: 'center',
}))
