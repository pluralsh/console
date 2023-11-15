import { Card } from '@pluralsh/design-system'
import { PipelineFragment, PipelineStageFragment } from 'generated/graphql'
import { useCallback, useMemo } from 'react'
import ReactFlow, {
  Handle,
  Position,
  useEdgesState,
  useNodesState,
} from 'reactflow'

import 'reactflow/dist/style.css'
import styled, { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'

import { ServiceStatusChip } from '../services/ServiceStatusChip'

enum NodeType {
  Stage = 'stage',
}
const nodeTypes = { [NodeType.Stage]: StageNode }

export function Pipeline({ pipeline }: { pipeline: PipelineFragment }) {
  const theme = useTheme()
  const margin = theme.spacing.large
  const { initialNodes, initialEdges } = useMemo(
    () => ({
      initialNodes:
        pipeline.stages?.filter(isNonNullable).map((stage, i) => ({
          id: stage?.id,
          position: { x: margin + i * 200, y: margin },
          type: NodeType.Stage,
          data: stage,
        })) ?? [],
      initialEdges:
        pipeline.edges?.filter(isNonNullable).map((edge) => ({
          id: edge.id,
          source: edge?.from.id,
          target: edge?.to.id,
        })) ?? [],
    }),
    [margin, pipeline]
  )

  const [nodes, _setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, _setEdges, onEdgesChange] = useEdgesState(initialEdges)

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <ReactFlow
        nodes={nodes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edges={edges}
        draggable
        nodesDraggable={false}
        edgesUpdatable={false}
        edgesFocusable={false}
      />
    </div>
  )
}

const StageNodeSC = styled(Card)(({ theme }) => ({
  '&&': {
    position: 'relative',
    padding: theme.spacing.small,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.small,
    ul: {
      ...theme.partials.reset.list,
    },
    li: {
      ...theme.partials.reset.li,
    },
  },
  '.serviceList': {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xsmall,
  },
  '.section': {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xsmall,
  },
  '.heading': {
    ...theme.partials.text.overline,
    color: theme.colors['text-light'],
  },
  '.subhead': {
    ...theme.partials.text.caption,
    color: theme.colors['text-light'],
  },
}))
const ServiceCardSC = styled(Card)(({ theme }) => ({
  '&&': {
    ...theme.partials.text.body2,
    color: theme.colors['text-light'],
    padding: `${theme.spacing.xsmall}px ${theme.spacing.small}px`,
    display: 'flex',
    gap: theme.spacing.xsmall,
    alignItems: 'center',
  },
}))
const HANDLE_SIZE = 10
const HandleSC = styled(Handle).attrs(() => ({
  isConnectable: false,
}))(({ theme }) => ({
  '&&': {
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderColor: theme.colors['border-secondary'],
    borderWidth: theme.borderWidths.default,
    '&.react-flow__handle-left': {
      left: -HANDLE_SIZE / 2,
    },
    '&.react-flow__handle-right': {
      right: -HANDLE_SIZE / 2,
    },
  },
}))

function StageNode({ data, ...props }: { data: PipelineStageFragment }) {
  console.log('props', props)

  return (
    <StageNodeSC>
      <HandleSC
        type="target"
        position={Position.Left}
      />
      <h3 className="heading">{data.name}</h3>

      {data.promotion?.services && (
        <div className="section">
          <h4 className="subhead">Promotion Services</h4>
          <ul className="serviceList">
            {data.promotion?.services?.map((service) => (
              <li>
                <ServiceCardSC>
                  <div>{service?.service?.name}</div>
                  <ServiceStatusChip status={service?.service?.status} />
                </ServiceCardSC>{' '}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="section">
        <h4 className="subhead">Services</h4>

        <ul className="serviceList">
          {data.services?.map((service) => (
            <li>
              <ServiceCardSC>
                <div>{service?.service?.name}</div>
                <ServiceStatusChip status={service?.service?.status} />
              </ServiceCardSC>
            </li>
          ))}
        </ul>
      </div>
      <HandleSC
        type="source"
        position={Position.Right}
        id="a"
      />
    </StageNodeSC>
  )
}
