import {
  IconFrame,
  ReloadIcon,
  styledTheme,
  usePrevious,
} from '@pluralsh/design-system'
import { PipelineFragment } from 'generated/graphql'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react'
import ReactFlow, {
  Background,
  BackgroundVariant,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from 'reactflow'
import chroma from 'chroma-js'

import 'reactflow/dist/style.css'
import styled, { useTheme } from 'styled-components'

import { TestsNode } from './nodes/TestsNode'
import { StageNode } from './nodes/StageNode'
import { ApprovalNode } from './nodes/ApprovalNode'
import { DagreDirection, getLayoutedElements } from './utils/nodeLayouter'
import { EdgeLineMarkerDefs, edgeTypes } from './EdgeLine'
import { NodeType, getNodesAndEdges } from './utils/getNodesAndEdges'

const nodeTypes = {
  [NodeType.Stage]: StageNode,
  [NodeType.Approval]: ApprovalNode,
  [NodeType.Tests]: TestsNode,
}

export const PIPELINE_GRID_GAP = styledTheme.spacing.large

export function Pipeline({ pipeline }: { pipeline: PipelineFragment }) {
  const theme = useTheme()
  const margin = PIPELINE_GRID_GAP * 1
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => getNodesAndEdges(pipeline),
    [pipeline]
  )
  const { setViewport, getViewport, viewportInitialized } = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes as any)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [needsLayout, setNeedsLayout] = useState(true)
  const prevPipeline = usePrevious(pipeline)
  const prevNodes = usePrevious(nodes)
  const prevEdges = usePrevious(edges)

  const layoutNodes = useCallback(
    (direction: DagreDirection = 'LR') => {
      const layouted = getLayoutedElements(nodes, edges, {
        direction,
        zoom: getViewport().zoom,
        gridGap: PIPELINE_GRID_GAP,
        margin,
      })

      setNodes([...layouted.nodes])
      setEdges([...layouted.edges])
      setNeedsLayout(false)
    },
    [nodes, edges, getViewport, margin, setNodes, setEdges]
  )

  useLayoutEffect(() => {
    if (viewportInitialized && needsLayout) {
      layoutNodes()
      requestAnimationFrame(() => {
        layoutNodes()
      })
    }
  }, [
    viewportInitialized,
    needsLayout,
    nodes,
    prevNodes,
    edges,
    prevEdges,
    layoutNodes,
  ])

  useEffect(() => {
    // Don't run for initial value of pipeline, only for changes
    if (prevPipeline && prevPipeline !== pipeline) {
      const { nodes, edges } = getNodesAndEdges(pipeline)

      setNodes(nodes)
      setEdges(edges)
      setNeedsLayout(true)
    }
  }, [pipeline, prevPipeline, setEdges, setNodes])

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
          gap={PIPELINE_GRID_GAP}
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
  '.react-flow__edge': {
    pointerEvents: 'none',
    cursor: 'unset',
  },
}))
