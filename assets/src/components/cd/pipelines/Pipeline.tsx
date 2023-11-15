import {
  Card,
  Chip,
  IconFrame,
  ReloadIcon,
  ThumbsUpIcon,
} from '@pluralsh/design-system'
import {
  GateType,
  PipelineFragment,
  PipelineGateFragment,
  PipelineStageFragment,
} from 'generated/graphql'
import { ReactNode, useCallback, useMemo } from 'react'
import ReactFlow, {
  Background,
  BackgroundVariant,
  type Edge,
  Handle,
  type NodeProps,
  Position,
  useEdges,
  useEdgesState,
  useNodes,
  useNodesState,
  useReactFlow,
} from 'reactflow'
import Dagre from '@dagrejs/dagre'

import 'reactflow/dist/style.css'
import styled, { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'

import chroma from 'chroma-js'

import isEmpty from 'lodash/isEmpty'

import upperFirst from 'lodash/upperFirst'

import { ServiceStatusChip } from '../services/ServiceStatusChip'

enum NodeType {
  Stage = 'stage',
  Gate = 'gate',
}
const nodeTypes = {
  [NodeType.Stage]: StageNode,
  [NodeType.Gate]: GateNode,
}

const dagre = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))

const getLayoutedElements = (nodes, edges, options) => {
  dagre.setGraph({ rankdir: options.direction })

  edges.forEach((edge) => dagre.setEdge(edge.source, edge.target))
  nodes.forEach((node) => dagre.setNode(node.id, node))

  Dagre.layout(dagre)

  return {
    nodes: nodes.map((node) => {
      const { x, y } = dagre.node(node.id)

      return { ...node, position: { x, y } }
    }),
    edges,
  }
}

export function Pipeline({ pipeline }: { pipeline: PipelineFragment }) {
  const theme = useTheme()
  const gridGap = theme.spacing.large
  const margin = gridGap * 1
  const { initialNodes, initialEdges } = useMemo(() => {
    const edges: Edge<any>[] = []
    const pipeStages = pipeline.stages?.filter(isNonNullable) ?? []
    const pipeEdges = pipeline.edges?.filter(isNonNullable) ?? []
    const gateNodes = pipeEdges?.flatMap((edge, i) => {
      console.log('edge', edge)
      if (edge && isEmpty(edge?.gates)) {
        edges.push({
          id: edge.id,
          source: edge.from.id,
          target: edge.to.id,
          data: edge,
        })
      }

      return (
        edge?.gates?.filter(isNonNullable)?.map((gate, j) => {
          console.log('gate', gate)
          if (gate) {
            if (edge?.to?.id) {
              edges.push({
                id: `${gate.id}->${edge.to.id}`,
                source: gate.id,
                target: edge.to.id,
              })
            }
            if (edge?.from?.id) {
              edges.push({
                id: `${edge.from.id}->${gate.id}`,
                source: edge.from.id,
                target: gate.id,
              })
            }
          }

          return {
            id: gate?.id,
            type: NodeType.Gate,
            position: {
              x: margin + i * gridGap * 10,
              y: margin + j * gridGap * 10,
            },
            data: gate,
          }
        }) ?? []
      )
    })

    return {
      initialNodes: [
        ...pipeStages.map((stage, i) => ({
          id: stage?.id,
          position: { x: margin + i * gridGap * 10, y: margin },
          type: NodeType.Stage,
          data: stage,
        })),
        ...gateNodes,
      ],
      initialEdges: edges,
    }
  }, [gridGap, margin, pipeline.edges, pipeline.stages])
  const { fitView, setViewport } = useReactFlow()
  const [nodes, setNodes, _onNodesChange] = useNodesState(initialNodes as any)
  const [edges, setEdges, _onEdgesChange] = useEdgesState(initialEdges)
  const _onLayout = useCallback(
    (direction) => {
      const layouted = getLayoutedElements(nodes, edges, { direction })

      setNodes([...layouted.nodes])
      setEdges([...layouted.edges])

      window.requestAnimationFrame(() => {
        fitView()
      })
    },
    [nodes, edges, setNodes, setEdges, fitView]
  )

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        // onNodesChange={onNodesChange}
        // onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        draggable
        nodesDraggable={false}
        edgesUpdatable={false}
        edgesFocusable={false}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={gridGap}
          size={1}
          color={`${chroma(theme.colors['border-fill-three']).alpha(1)}`}
        />
      </ReactFlow>
      <div
        css={{
          position: 'absolute',
          top: theme.spacing.xsmall,
          right: theme.spacing.xsmall,
        }}
      >
        <IconFrame
          clickable
          type="floating"
          icon={<ReloadIcon />}
          tooltip="Reset view"
          onClick={() => setViewport({ x: 0, y: 0, zoom: 1 })}
        >
          Reset view
        </IconFrame>
      </div>
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
  '.headerArea': {
    display: 'flex',
    gap: theme.spacing.small,
  },
  '.heading': {
    ...theme.partials.text.overline,
    color: theme.colors['text-light'],
  },
  '.name': {
    ...theme.partials.text.body1Bold,
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

export const useNodeEdges = () => {
  const edges = useEdges()
  const nodes = useNodes()

  return useMemo(
    () =>
      Object.fromEntries(
        nodes.map((node) => {
          const ret = [
            node.id,
            {
              source: edges.filter((e) => e.source === node.id),
              target: edges.filter((e) => e.target === node.id),
            },
          ]

          return ret
        })
      ),
    [edges, nodes]
  )
}

function StageNode({ data }: NodeProps<PipelineStageFragment>) {
  return (
    <StageNodeSC>
      <HandleSC
        type="target"
        position={Position.Left}
      />
      <h2 className="heading">STAGE</h2>
      <h3 className="name">{data.name}</h3>

      {!isEmpty(data.services) && (
        <div className="section">
          {/* <h4 className="subhead">Services</h4> */}

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
      )}
      <HandleSC
        type="source"
        position={Position.Right}
        id="a"
      />
    </StageNodeSC>
  )
}

const GateTypeHeaderSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.xxsmall,
}))
const gateTypeToIcon = {
  [GateType.Approval]: <ThumbsUpIcon />,
  [GateType.Window]: <ThumbsUpIcon />,
  [GateType.Job]: <ThumbsUpIcon />,
} as const satisfies Record<GateType, ReactNode>

function GateTypeHeading({ type }: { type: GateType }) {
  return (
    <GateTypeHeaderSC>
      {gateTypeToIcon[type]}
      {upperFirst(type.toLowerCase())}
    </GateTypeHeaderSC>
  )
}

function GateNode({ data }: NodeProps<PipelineGateFragment>) {
  return (
    <StageNodeSC>
      <HandleSC
        type="target"
        position={Position.Left}
      />
      <div className="headerArea">
        <h2 className="heading">{data.name}</h2>
        <Chip size="small">{upperFirst(data.state.toLowerCase())}</Chip>
      </div>
      {data.type && <GateTypeHeading type={data.type} />}
      {data.approver && <div>{data.approver.name}</div>}

      <HandleSC
        type="source"
        position={Position.Right}
        id="a"
      />
    </StageNodeSC>
  )
}
