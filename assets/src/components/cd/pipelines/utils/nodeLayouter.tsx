import { type Node as FlowNode } from 'reactflow'
import Dagre from '@dagrejs/dagre'

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
  nodes,
  edges,
  options: {
    direction: DagreDirection
    zoom: number
    gridGap: number
    margin: number
  }
) => {
  const dagre = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))
  const { direction, zoom, gridGap, margin } = options

  dagre.setGraph({
    rankdir: direction,
    align: 'UL',
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
