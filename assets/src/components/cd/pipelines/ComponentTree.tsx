import {
  IconFrame,
  ReloadIcon,
  styledTheme,
  usePrevious,
} from '@pluralsh/design-system'
import { ComponentTreeFragment } from 'generated/graphql'
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
import { JobNode } from './nodes/JobNode'
import { type DagreDirection, getLayoutedElements } from './utils/nodeLayouter'
import { EdgeLineMarkerDefs, edgeTypes } from './EdgeLine'
import { NodeType, getTreeNodesAndEdges } from './utils/getTreeNodesAndEdges'

const nodeTypes = {
  [NodeType.Stage]: StageNode,
  [NodeType.Approval]: ApprovalNode,
  [NodeType.Job]: JobNode,
  [NodeType.Tests]: TestsNode,
}

export const COMPONENTTREE_GRID_GAP = styledTheme.spacing.large

export function ComponentTree({
  componenttree,
}: {
  componenttree: ComponentTreeFragment
}) {
  const theme = useTheme()
  const margin = COMPONENTTREE_GRID_GAP * 1
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => getNodesAndEdges(componenttree),
    [componenttree]
  )
  const { setViewport, getViewport, viewportInitialized } = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes as any)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [needsLayout, setNeedsLayout] = useState(true)
  const prevComponentTree = usePrevious(componenttree)
  const prevNodes = usePrevious(nodes)
  const prevEdges = usePrevious(edges)

  const layoutNodes = useCallback(
    (direction: DagreDirection = 'LR') => {
      const layouted = getLayoutedElements(nodes, edges, {
        direction,
        zoom: getViewport().zoom,
        gridGap: COMPONENTTREE_GRID_GAP,
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
    // Don't run for initial value of componenttree, only for changes
    if (prevComponentTree && prevComponentTree !== componenttree) {
      const { nodes, edges } = getNodesAndEdges(componenttree)

      setNodes(nodes)
      setEdges(edges)
      setNeedsLayout(true)
    }
  }, [componenttree, prevComponentTree, setEdges, setNodes])

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
          gap={COMPONENTTREE_GRID_GAP}
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
