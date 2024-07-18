import {
  IconFrame,
  ReloadIcon,
  styledTheme,
  usePrevious,
} from '@pluralsh/design-system'
import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
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

import {
  type DagreDirection,
  getLayoutedElements,
} from '../../cd/pipelines/utils/nodeLayouter'

import { PipelineEditAreaSC } from '../../cd/pipelines/PipelineDetails'

import { EdgeMarkerDefs, edgeTypes } from '../../utils/reactflow/edges'

import { ComponentTreeNode } from './ComponentTreeNode'

export const COMPONENTTREE_GRID_GAP = styledTheme.spacing.large

const nodeTypes = {
  component: ComponentTreeNode,
}

export function ComponentTreeGraph({
  nodes: nodesProp,
  edges: edgesProp,
}: {
  nodes: any[]
  edges: any[]
}) {
  const theme = useTheme()
  const margin = COMPONENTTREE_GRID_GAP * 1

  const { setViewport, getViewport, viewportInitialized } = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState(nodesProp)
  const [edges, setEdges, onEdgesChange] = useEdgesState(edgesProp)
  const [needsLayout, setNeedsLayout] = useState(true)
  const prevNodes = usePrevious(nodes)
  const prevEdges = usePrevious(edges)

  const prevNodesProp = usePrevious(nodesProp)
  const prevEdgesProp = usePrevious(edgesProp)

  const layoutNodes = useCallback(
    (direction: DagreDirection = 'LR') => {
      // if (isEmpty(nodes)) return

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
    // Don't run for initial values of nodes and edges, only for changes
    if (prevNodesProp !== nodesProp || prevEdgesProp !== edgesProp) {
      setNodes(nodesProp)
      setEdges(edgesProp)
      setNeedsLayout(true)
    }
  }, [nodesProp, prevNodesProp, edgesProp, prevEdgesProp, setEdges, setNodes])

  return (
    <PipelineEditAreaSC>
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
          <EdgeMarkerDefs />
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
    </PipelineEditAreaSC>
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
