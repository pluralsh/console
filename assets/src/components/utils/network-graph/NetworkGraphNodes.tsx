import { Card, Flex, IconFrame, MoreIcon } from '@pluralsh/design-system'
import { Position, type Node, type NodeProps } from '@xyflow/react'

import { NetworkMeshWorkloadFragment } from 'generated/graphql.ts'
import styled from 'styled-components'
import { NodeHandleSC } from '../reactflow/nodes'
import { TRUNCATE } from '../truncate'

type MeshWorkloadNode = Node<NetworkMeshWorkloadFragment>

export function MeshWorkloadNode({ id, data }: NodeProps<MeshWorkloadNode>) {
  return (
    <Card
      id={id}
      css={{ overflow: 'hidden', maxWidth: 160 }}
    >
      <NodeHandleSC
        type="target"
        position={Position.Left}
      />
      <Flex>
        <WorkloadNameSC>{data.name}</WorkloadNameSC>
        <IconFrame
          css={{ flexShrink: 0 }}
          tooltip={
            <Flex direction="column">
              <span>
                <strong>Name:</strong> {data.name}
              </span>
              <span>
                <strong>Namespace:</strong> {data.namespace}
              </span>
              <span>
                <strong>Service:</strong> {data.service}
              </span>
            </Flex>
          }
          icon={<MoreIcon />}
        />
      </Flex>
      <NodeHandleSC
        type="source"
        position={Position.Right}
      />
    </Card>
  )
}

const WorkloadNameSC = styled.span(({ theme }) => ({
  ...TRUNCATE,
  padding: theme.spacing.xsmall,
  borderRight: theme.borders.input,
  background: theme.colors['fill-one'],
}))
