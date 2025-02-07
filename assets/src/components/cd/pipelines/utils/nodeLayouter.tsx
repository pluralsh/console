import Dagre, { GraphLabel } from '@dagrejs/dagre'
import { useCallback, useState } from 'react'
import { Edge, type Node as FlowNode } from 'reactflow'

export type DagreDirection = 'LR' | 'RL' | 'TB' | 'BT'
export type DagreGraphOptions = GraphLabel & {
  rankdir?: DagreDirection
}

const DEFAULT_NODE_WIDTH = 240
const DEFAULT_NODE_HEIGHT = 80

const DEFAULT_DAGRE_OPTIONS: DagreGraphOptions = {
  rankdir: 'LR',
  nodesep: 25,
  ranksep: 25,
  edgesep: 10,
  ranker: 'tight-tree',
}

export const getLayoutedElements = (
  nodes: FlowNode[],
  edges: Edge[],
  options: DagreGraphOptions = {}
) => {
  const dagreGraph = new Dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))

  dagreGraph.setGraph({
    ...DEFAULT_DAGRE_OPTIONS,
    ...options,
  })

  // add nodes and edges to dagre
  edges.forEach((edge) => dagreGraph.setEdge(edge.source, edge.target))
  nodes.forEach((node) => dagreGraph.setNode(node.id, measureNode(node)))

  Dagre.layout(dagreGraph)

  const positionedNodes = nodes.map((node) => {
    const { x, y, width, height } = dagreGraph.node(node.id)
    return {
      ...node,
      position: {
        x: x - width / 2,
        y: y - height / 2,
      },
    }
  })

  return { nodes: positionedNodes, edges }
}

export function useLayoutNodes({
  baseNodes,
  baseEdges,
  options,
}: {
  baseNodes: FlowNode[]
  baseEdges: Edge[]
  options?: DagreGraphOptions
}) {
  const [nodes, setNodes] = useState(baseNodes)
  const [edges, setEdges] = useState(baseEdges)

  const layoutNodes = useCallback(() => {
    const { nodes, edges } = getLayoutedElements(baseNodes, baseEdges, options)
    setNodes(nodes)
    setEdges(edges)
  }, [baseNodes, baseEdges, options])

  return { nodes, edges, layoutNodes }
}

// useful for initially fitting the view after layouts
// default fitView on React Flow seems to fire too early in some cases
export function runAfterLayout(fn: () => void) {
  // double requestAnimationFrame ensures all browser layout calculations are completed before executing
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fn()
    })
  })
}

function measureNode(node: FlowNode) {
  const element = document.querySelector(
    `[data-id="${CSS.escape(node.id)}"]`
  ) as HTMLElement
  // using offsetWidth/offsetHeight since they're independent of CSS transform scaling
  const width = element?.offsetWidth ?? DEFAULT_NODE_WIDTH
  const height = element?.offsetHeight ?? DEFAULT_NODE_HEIGHT
  return {
    ...node,
    width,
    height,
  }
}
