import { useMemo } from 'react'
import { type Edge, useEdges, useNodes } from 'reactflow'

export const useNodeEdges = (nodeId: Nullable<string>) => {
  const edges = useEdges()
  const outgoers = useMemo(
    () => edges.filter((edge) => edge.source === nodeId),
    [edges, nodeId]
  )
  const incomers = useMemo(
    () => edges.filter((edge) => edge.target === nodeId),
    [edges, nodeId]
  )

  return useMemo(() => ({ outgoers, incomers }), [incomers, outgoers])
}

export const useEdgeNodes = (edge: Pick<Edge, 'source' | 'target'>) => {
  const nodes = useNodes()
  const source = useMemo(
    () => nodes.find((node) => node.id === edge.source),
    [nodes, edge.source]
  )
  const target = useMemo(
    () => nodes.find((node) => node.id === edge.target),
    [nodes, edge.target]
  )

  return useMemo(() => ({ source, target }), [source, target])
}
