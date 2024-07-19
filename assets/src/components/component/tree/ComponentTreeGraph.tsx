import { usePrevious } from '@pluralsh/design-system'
import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { useEdgesState, useNodesState, useReactFlow } from 'reactflow'

import 'reactflow/dist/style.css'

import { useTheme } from 'styled-components'

import {
  type DagreDirection,
  getLayoutedElements,
} from '../../cd/pipelines/utils/nodeLayouter'

import { ReactFlowGraph } from '../../utils/reactflow/graph'

import { ComponentTreeNode } from './ComponentTreeNode'

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
        gridGap: theme.spacing.large,
        margin: theme.spacing.large,
      })

      setNodes([...layouted.nodes])
      setEdges([...layouted.edges])
      setNeedsLayout(false)
    },
    [nodes, edges, getViewport, theme.spacing.large, setNodes, setEdges]
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
    <ReactFlowGraph
      resetView={() => setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 500 })}
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
    />
  )
}
