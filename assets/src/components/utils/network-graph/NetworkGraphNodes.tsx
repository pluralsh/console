import { Card, Flex, IconFrame, MoreIcon } from '@pluralsh/design-system'
import { Position, type Node, type NodeProps } from '@xyflow/react'

import { filesize } from 'filesize'
import {
  NetworkMeshStatisticsFragment,
  NetworkMeshWorkloadFragment,
} from 'generated/graphql.ts'
import { round } from 'lodash'
import styled from 'styled-components'
import { NodeHandleSC } from '../reactflow/nodes'
import { CaptionP } from '../typography/Text'

type MeshWorkloadNode = Node<NetworkMeshWorkloadFragment>
type MeshStatisticsNode = Node<NetworkMeshStatisticsFragment>

export function MeshWorkloadNode({ id, data }: NodeProps<MeshWorkloadNode>) {
  return (
    <Card
      id={id}
      css={{ overflow: 'hidden' }}
    >
      <NodeHandleSC
        type="target"
        position={Position.Left}
      />
      <Flex>
        <WorkloadNameSC>{data.name}</WorkloadNameSC>
        <IconFrame
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

export function MeshStatisticsNode({
  id,
  data,
}: NodeProps<MeshStatisticsNode>) {
  return (
    <StatisticsCardSC id={id}>
      <NodeHandleSC
        type="target"
        position={Position.Left}
      />
      <Statistic
        value={filesize(data.bytes ?? 0)}
        suffix="sent"
      />
      <Statistic
        value={data.packets}
        suffix="packets"
      />
      <Statistic
        value={data.connections}
        suffix="tcp connections"
      />
      <Statistic
        value={data.http200}
        suffix="http 200s"
      />
      <Statistic
        value={data.http400}
        suffix="http 400s"
      />
      <Statistic
        value={data.http500}
        suffix="http 500s"
      />
      {data.httpClientLatency && (
        <Statistic
          value={round(data.httpClientLatency, 2)}
          suffix="ms latency"
        />
      )}
      <NodeHandleSC
        type="source"
        position={Position.Right}
      />
    </StatisticsCardSC>
  )
}

const WorkloadNameSC = styled.span(({ theme }) => ({
  padding: theme.spacing.xsmall,
  borderRight: theme.borders.input,
  background: theme.colors['fill-one'],
}))

const StatisticsCardSC = styled(Card)(({ theme }) => ({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  padding: `${theme.spacing.xxsmall}px ${theme.spacing.xsmall}px`,
}))

function Statistic({
  value,
  suffix,
  precision = 2,
}: {
  value: Nullable<number | string>
  suffix: string
  precision?: number
}) {
  const displayValue =
    typeof value === 'string' ? value : round(value ?? 0, precision)

  return (
    <span>
      <CaptionP
        as="span"
        $color="text"
      >
        {displayValue}
      </CaptionP>{' '}
      <CaptionP
        as="span"
        $color="text-xlight"
      >
        {suffix}
      </CaptionP>
    </span>
  )
}
