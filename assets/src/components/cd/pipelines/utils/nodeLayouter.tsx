import Dagre from '@dagrejs/dagre'
import { useCallback, useEffect, useState } from 'react'
import {
  Edge,
  FitViewOptions,
  useReactFlow,
  type Node as FlowNode,
} from 'reactflow'
import { useTheme } from 'styled-components'

function measureNode(node: FlowNode, zoom) {
  let domNode

  try {
    domNode = document.querySelector(`[data-id="${CSS.escape(node.id)}"]`)
  } catch (e) {
    console.error(e)

    return
  }

  const rect = domNode?.getBoundingClientRect()

  return {
    ...node,
    width: (rect?.width || 200) / zoom,
    height: (rect?.height || 200) / zoom,
  }
}
export type DagreDirection = 'LR' | 'RL' | 'TB' | 'BT'
export const getLayoutedElements = (
  nodes: FlowNode[],
  edges: Edge[],
  options?: {
    direction?: DagreDirection
    zoom?: number
    gridGap?: number
    margin?: number
  }
) => {
  const dagre = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))
  const {
    direction = 'LR',
    zoom = 1,
    gridGap = 24,
    margin = 24,
  } = options ?? {}
  dagre.setGraph({
    rankdir: direction,
    // align: 'UL',
    marginx: margin,
    marginy: margin,
    nodesep: gridGap,
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
      const dagreNode = dagre.node(node.id)

      if (!dagreNode) return node

      const { x, y, width, height } = dagreNode

      // Dagre returns center of node, but react-flow expects top/left
      return { ...node, position: { x: x - width / 2, y: y - height / 2 } }
    }),
    edges,
  }
}

export function useLayoutNodes({
  baseNodes,
  baseEdges,
  direction = 'LR',
}: {
  baseNodes: FlowNode[]
  baseEdges: Edge[]
  direction?: DagreDirection
}) {
  const theme = useTheme()
  const { getViewport } = useReactFlow()
  const [nodes, setNodes] = useState(baseNodes)
  const [edges, setEdges] = useState(baseEdges)

  const layoutNodes = useCallback(() => {
    const { nodes, edges } = getLayoutedElements(baseNodes, baseEdges, {
      direction,
      zoom: getViewport().zoom,
      gridGap: theme.spacing.large,
      margin: theme.spacing.large,
    })
    setNodes(nodes)
    setEdges(edges)
  }, [baseNodes, baseEdges, direction, getViewport, theme.spacing.large])

  return { nodes, edges, layoutNodes }
}

// for cases where the fitView done on initial load seems to be too early
export function useFitViewAfterLayout(options?: FitViewOptions) {
  const { fitView } = useReactFlow()
  useEffect(() => {
    // double requestAnimationFrame ensures all layout calculations are completed before refitting
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        fitView(options)
      })
    })
  }, [fitView, options])
}
