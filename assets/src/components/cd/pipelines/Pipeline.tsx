import { AppsIcon, IconFrame, ReloadIcon } from '@pluralsh/design-system'
import {
  GateState,
  GateType,
  PipelineFragment,
  PipelineGateFragment,
} from 'generated/graphql'
import { useCallback, useLayoutEffect, useMemo } from 'react'
import ReactFlow, {
  Background,
  BackgroundVariant,
  type Edge,
  type Node as FlowNode,
  MarkerType,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from 'reactflow'
import Dagre from '@dagrejs/dagre'
import chroma from 'chroma-js'
import isEmpty from 'lodash/isEmpty'

import 'reactflow/dist/style.css'
import styled, { DefaultTheme, useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'

import { groupBy } from 'lodash'

import { ApprovalNode, StageNode, TestsNode } from './PipelineNodes'

const DEBUG_MODE = true

enum NodeType {
  Stage = 'stage',
  Tests = 'tests',
  Approval = 'approval',
}
const nodeTypes = {
  [NodeType.Stage]: StageNode,
  [NodeType.Approval]: ApprovalNode,
  [NodeType.Tests]: TestsNode,
}

const dagre = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))

function measureNode(node: FlowNode, zoom) {
  let domNode

  try {
    const selector = `[data-id="${node.id}"]`

    console.log('selector', selector)
    domNode = document.querySelector(selector)
  } catch (e) {
    console.log('caught', e)

    return
  }

  console.log('domNode', domNode)

  const rect = domNode?.getBoundingClientRect()

  console.log('rect', rect)

  return {
    ...node,
    width: (rect?.width || 100) / zoom,
    height: (rect?.height || 100) / zoom,
  }
}
type DagreDirection = 'LR' | 'RL' | 'TB' | 'BT'
const getLayoutedElements = (
  nodes,
  edges,
  options: {
    direction: DagreDirection
    zoom: number
    gridGap: number
    margin: number
  }
) => {
  const { direction, zoom, gridGap, margin } = options

  dagre.setGraph({
    rankdir: direction,
    marginx: margin,
    marginy: margin,
    nodesep: gridGap * 1,
    ranksep: gridGap * 4,
  })

  edges.forEach((edge) => dagre.setEdge(edge.source, edge.target))
  nodes.forEach((node) => {
    console.log('measure', node)
    const measuredNode = measureNode(node, zoom)

    if (measuredNode) {
      dagre.setNode(node.id, measuredNode)
    }
  })

  Dagre.layout(dagre)

  return {
    nodes: nodes.map((node) => {
      const { x, y } = dagre.node(node.id)

      console.log({ x, y })

      return { ...node, position: { x, y } }
    }),
    edges,
  }
}

const FAKE_GATES: Partial<PipelineGateFragment>[] = [
  {
    id: '1',
    name: 'An approval',
    type: GateType.Approval,
    state: GateState.Closed,
  },
  {
    id: '2',
    name: 'A window',
    type: GateType.Window,
    state: GateState.Open,
  },
  {
    id: '3',
    name: 'A job',
    type: GateType.Job,
    state: GateState.Pending,
  },
]

export function Pipeline({ pipeline }: { pipeline: PipelineFragment }) {
  const theme = useTheme()
  const gridGap = theme.spacing.large
  const margin = gridGap * 1
  const { initialNodes, initialEdges } = useMemo(
    () => getNodesEdges(pipeline),
    [pipeline]
  )
  const {
    fitView: _fitView,
    setViewport,
    getViewport,
    viewportInitialized,
  } = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes as any)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onLayout = useCallback(
    (direction: DagreDirection = 'LR') => {
      const layouted = getLayoutedElements(nodes, edges, {
        direction,
        zoom: getViewport().zoom,
        gridGap,
        margin,
      })

      setNodes([...layouted.nodes])
      setEdges([...layouted.edges])

      window.requestAnimationFrame(() => {
        // fitView()
      })
    },
    [nodes, edges, getViewport, gridGap, margin, setNodes, setEdges]
  )

  useLayoutEffect(() => {
    if (viewportInitialized) {
      onLayout()
    }
    // Only run on first render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewportInitialized])

  return (
    <ReactFlowWrapperSC $hide={!viewportInitialized}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
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
          display: 'flex',
          gap: theme.spacing.xsmall,
        }}
      >
        <IconFrame
          clickable
          type="floating"
          icon={<ReloadIcon />}
          tooltip="Reset view"
          onClick={() =>
            setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 500 })
          }
        >
          Reset view
        </IconFrame>
        <IconFrame
          clickable
          type="floating"
          icon={<AppsIcon />}
          tooltip="Auto-layout"
          onClick={() => {
            onLayout()
          }}
        >
          Reset view
        </IconFrame>
      </div>
    </ReactFlowWrapperSC>
  )
}

const ReactFlowWrapperSC = styled.div<{ $hide }>(({ theme, $hide }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  '.react-flow__renderer': {
    display: $hide ? 'none' : 'block',
  },
}))

const getEdgeProps = (theme: DefaultTheme) => ({
  type: 'smoothstep',
  color: theme.colors['border-secondary'],
  style: {
    stroke: theme.colors['border-secondary'],
    strokeWidth: 1,
  },
  markerEnd: {
    type: MarkerType.Arrow,
    width: 24,
    height: 24,
    color: theme.colors['border-secondary'],
  },
})

function getNodesEdges(pipeline: PipelineFragment) {
  const theme = useTheme()
  const edges: Edge<any>[] = []
  const pipeStages = pipeline.stages?.filter(isNonNullable) ?? []
  const pipeEdges = pipeline.edges?.filter(isNonNullable) ?? []
  const gateNodes = pipeEdges?.flatMap((e) => {
    let edge = { ...e }

    console.log('edge', edge)
    if (DEBUG_MODE) {
      // @ts-ignore
      edge = { ...edge, gates: FAKE_GATES }
    }
    if (edge && isEmpty(edge?.gates)) {
      edges.push({
        ...getEdgeProps(theme),
        id: edge.id,
        source: edge.from.id,
        target: edge.to.id,
        data: edge,
      })
    }

    const groupedGates = groupBy(edge?.gates, (gate) => {
      switch (gate?.type) {
        case GateType.Approval:
          return NodeType.Approval
        default:
          return NodeType.Tests
      }
    }) as Record<NodeType, PipelineGateFragment[]>

    console.log('groupedGates', groupedGates)

    return (
      Object.entries(groupedGates).flatMap(([type, gates]) => {
        const nodeId =
          type === NodeType.Approval ? `${edge.id}-${gates?.[0]?.id}` : edge.id

        console.log('entries', [type, gates])
        console.log('entries nodeId', nodeId)

        if (!gates || !nodeId) {
          return []
        }

        if (edge?.to?.id) {
          edges.push({
            ...getEdgeProps(theme),
            id: `${nodeId}->${edge.to.id}`,
            source: nodeId,
            target: edge.to.id,
          })
        }
        if (edge?.from?.id) {
          edges.push({
            ...getEdgeProps(theme),
            id: `${edge.from.id}->${nodeId}`,
            source: edge.from.id,
            target: nodeId,
          })
        }

        return {
          id: nodeId,
          type,
          position: { x: 0, y: 0 },
          data: type === NodeType.Approval ? gates?.[0] : { ...edge, gates },
        }
      }) ?? []
    )
  })

  return {
    initialNodes: [
      ...pipeStages.map((stage) => ({
        id: stage?.id,
        position: { x: 0, y: 0 },
        type: NodeType.Stage,
        data: stage,
      })),
      ...gateNodes,
    ],
    initialEdges: edges,
  }
}
