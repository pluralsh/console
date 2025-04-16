import Dagre, { GraphLabel } from '@dagrejs/dagre'
import {
  Edge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Node as FlowNode,
} from '@xyflow/react'
import { useCallback, useLayoutEffect, useState } from 'react'

export type DagreDirection = 'LR' | 'RL' | 'TB' | 'BT'
export type DagreGraphOptions = GraphLabel & {
  rankdir?: DagreDirection
}

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
  nodes.forEach((node) =>
    dagreGraph.setNode(node.id, {
      ...node,
      width: node.measured?.width ?? 0,
      height: node.measured?.height ?? 0,
    })
  )

  Dagre.layout(dagreGraph)

  const positionedNodes = nodes.map((node) => {
    const { x, y } = dagreGraph.node(node.id)
    return {
      ...node,
      position: {
        x: x - (node.measured?.width ?? 0) / 2,
        y: y - (node.measured?.height ?? 0) / 2,
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
  const { fitView } = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState(baseNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(baseEdges)
  const [shouldLayout, setShouldLayout] = useState(false)
  const [isLayouting, setIsLayouting] = useState(false)

  // react flow injects this after the nodes are first rendered
  const hasMeasurements = !!nodes[0]?.measured
  // we basically want to force a reset of the nodes if their parent changes
  useLayoutEffect(() => {
    setNodes(baseNodes)
    setEdges(baseEdges)
    setShouldLayout(true)
  }, [baseNodes, baseEdges, setNodes, setEdges])

  useLayoutEffect(() => {
    if (shouldLayout) {
      if (!hasMeasurements) return
      setIsLayouting(true)
      const layouted = getLayoutedElements(nodes, edges, options)
      setNodes(layouted.nodes)
      setEdges(layouted.edges)
      setShouldLayout(false)
      runAfterBrowserLayout(() => {
        fitView()
        setIsLayouting(false)
      })
    }
  }, [
    baseNodes,
    baseEdges,
    options,
    shouldLayout,
    nodes,
    edges,
    setNodes,
    setEdges,
    fitView,
    hasMeasurements,
  ])

  const layoutNodes = useCallback(() => {
    setShouldLayout(true)
  }, [])

  return {
    nodes,
    edges,
    showGraph: hasMeasurements && !isLayouting,
    layoutNodes,
    onNodesChange,
    onEdgesChange,
  }
}

// useful for initially fitting the view after layouts
// default fitView on React Flow seems to fire too early in some cases
export function runAfterBrowserLayout(fn: () => void) {
  // double requestAnimationFrame ensures all browser layout calculations are completed before executing
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fn()
    })
  })
}
