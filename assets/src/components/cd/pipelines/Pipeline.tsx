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
  useEdgesState,
  useNodesState,
  useReactFlow,
} from 'reactflow'
import Dagre from '@dagrejs/dagre'
import chroma from 'chroma-js'
import isEmpty from 'lodash/isEmpty'

import 'reactflow/dist/style.css'
import styled, { useTheme } from 'styled-components'
import { isNonNullable } from 'utils/isNonNullable'

import { groupBy } from 'lodash'

import {
  ApprovalNode,
  StageNode,
  StageStatus,
  TestsNode,
  getStageStatus,
} from './PipelineNodes'
import { reduceGateStatuses } from './reduceGateStatuses'
import { FAKE_GATES } from './FAKE_GATES'
import { EdgeLineMarkerDefs, edgeTypes } from './EdgeLine'

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

    domNode = document.querySelector(selector)
  } catch (e) {
    return
  }

  const rect = domNode?.getBoundingClientRect()

  const ret = {
    ...node,
    width: (rect?.width || 200) / zoom,
    height: (rect?.height || 200) / zoom,
  }

  return ret
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
    align: 'UL',
    marginx: margin,
    marginy: margin,
    nodesep: gridGap * 1,
    ranksep: gridGap * 4,
  })

  edges.forEach((edge) => dagre.setEdge(edge.source, edge.target))
  nodes.forEach((node) => {
    const measuredNode = measureNode(node, zoom)

    if (measuredNode) {
      dagre.setNode(node.id, measuredNode)
    }
  })

  Dagre.layout(dagre)

  return {
    nodes: nodes.map((node) => {
      const { x, y, width, height } = dagre.node(node.id)

      // Dagre returns center of node, but react-flow expects top/left
      return { ...node, position: { x: x - width / 2, y: y - height / 2 } }
    }),
    edges,
  }
}

export function Pipeline({ pipeline }: { pipeline: PipelineFragment }) {
  const theme = useTheme()
  const gridGap = theme.spacing.large
  const margin = gridGap * 1
  const { initialNodes, initialEdges } = useMemo(
    () => getNodesEdges(pipeline),
    [pipeline]
  )
  const { setViewport, getViewport, viewportInitialized } = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes as any)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const layoutNodes = useCallback(
    (direction: DagreDirection = 'LR') => {
      const layouted = getLayoutedElements(nodes, edges, {
        direction,
        zoom: getViewport().zoom,
        gridGap,
        margin,
      })

      setNodes([...layouted.nodes])
      setEdges([...layouted.edges])
    },
    [nodes, edges, getViewport, gridGap, margin, setNodes, setEdges]
  )

  useLayoutEffect(() => {
    if (viewportInitialized) {
      layoutNodes()
    }
    // Only run on first render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewportInitialized])

  return (
    <ReactFlowWrapperSC>
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
        nodesConnectable={false}
        edgeTypes={edgeTypes}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={gridGap}
          size={1}
          color={`${chroma(theme.colors['border-fill-three']).alpha(1)}`}
        />
        <EdgeLineMarkerDefs />
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
            layoutNodes()
          }}
        >
          Reset view
        </IconFrame>
      </div>
    </ReactFlowWrapperSC>
  )
}

const ReactFlowWrapperSC = styled.div<{ $hide?: boolean }>(({ $hide }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  '.react-flow__renderer': {
    opacity: $hide ? 0 : 1,
  },
}))

const baseEdgeProps = {
  type: 'custom-edge',
}

const TYPE_SORT_VALS = Object.fromEntries(
  [NodeType.Stage, NodeType.Approval, NodeType.Tests].map((val, i) => [val, i])
)

function getNodesEdges(pipeline: PipelineFragment) {
  const edges: Edge<any>[] = []
  const pipeStages = pipeline.stages?.filter(isNonNullable) ?? []
  const pipeEdges = pipeline.edges?.filter(isNonNullable) ?? []
  const gateNodes = pipeEdges?.flatMap((e) => {
    let edge = { ...e }

    if (DEBUG_MODE) {
      // @ts-ignore
      edge = { ...edge, gates: FAKE_GATES }
    }
    if (edge && isEmpty(edge?.gates)) {
      edges.push({
        ...baseEdgeProps,
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

    return (
      Object.entries(groupedGates)
        // Order of edges matters to Dagre layout, so sort by type ahead of time
        .sort(
          ([aType], [bType]) => TYPE_SORT_VALS[bType] - TYPE_SORT_VALS[aType]
        )
        .flatMap(([type, gates]) => {
          const nodeId =
            type === NodeType.Approval
              ? `${edge.id}-${gates?.[0]?.id}`
              : edge.id

          if (!gates || !nodeId) {
            return []
          }

          if (edge?.to?.id) {
            edges.push({
              ...baseEdgeProps,
              id: `${nodeId}->${edge.to.id}`,
              source: nodeId,
              target: edge.to.id,
            })
          }
          if (edge?.from?.id) {
            edges.push({
              ...baseEdgeProps,
              id: `${edge.from.id}->${nodeId}`,
              source: edge.from.id,
              target: nodeId,
            })
          }
          const state = reduceGateStatuses(gates)

          return {
            id: nodeId,
            type,
            position: { x: 0, y: 0 },
            data: { ...edge, gates, meta: { state } },
          }
        })
    )
  })

  return {
    initialNodes: [
      ...pipeStages.map((stage) => {
        const stageStatus = getStageStatus(stage)

        return {
          id: stage?.id,
          position: { x: 0, y: 0 },
          type: NodeType.Stage,
          data: {
            ...stage,
            meta: {
              stageStatus,
              state:
                stageStatus === StageStatus.Complete
                  ? GateState.Open
                  : GateState.Pending,
            },
          },
        }
      }),
      ...gateNodes,
    ],
    initialEdges: edges,
  }
}
