import {
  Edge,
  useNodesInitialized,
  useReactFlow,
  type Node,
} from '@xyflow/react'
import type {
  ElkExtendedEdge,
  ElkNode,
  ELK as ElkType,
  LayoutOptions,
} from 'elkjs'
import { produce } from 'immer'
import { useEffect } from 'react'

let elkInstance: ElkType | null = null

async function getElkInstance() {
  if (elkInstance) return elkInstance
  const ELKConstructor = (await import('elkjs/lib/elk.bundled.js')).default
  elkInstance = new ELKConstructor()
  return elkInstance
}

async function getLayoutedElements(
  nodes: Node[],
  edges: Edge[],
  layoutOptions?: LayoutOptions
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  const elk = await getElkInstance()
  const elkGraph = {
    id: 'root',
    layoutOptions,
    children: nodes.map((node) => ({
      id: node.id,
      width: node.measured?.width ?? 0,
      height: node.measured?.height ?? 0,
      properties: {
        ...defaultNodeProperties,
        ...(node.data.elkProperties ?? {}),
      },
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  }

  // this mutates the graph object
  await elk.layout(elkGraph)

  const nodeIdToElkNode = new Map<string, ElkNode>()
  const edgeIdToElkEdge = new Map<string, ElkExtendedEdge>()
  for (const node of elkGraph.children ?? []) nodeIdToElkNode.set(node.id, node)
  for (const edge of elkGraph.edges ?? []) edgeIdToElkEdge.set(edge.id, edge)

  const layoutedNodes = produce(nodes, (draftNodes) => {
    for (const node of draftNodes) {
      const elkNode = nodeIdToElkNode.get(node.id)
      node.position = { x: elkNode?.x ?? 0, y: elkNode?.y ?? 0 }
    }
  })
  const layoutedEdges = produce(edges, (draftEdges) => {
    for (const edge of draftEdges)
      edge.data = {
        ...edge.data,
        elkPathData: edgeIdToElkEdge.get(edge.id)?.sections,
      }
  })

  return { nodes: layoutedNodes, edges: layoutedEdges }
}

// automatically layout nodes whenever they change (and they have measurements)
export function useAutoLayout({
  options,
  setIsLayouting,
  setError,
}: {
  options?: LayoutOptions
  setIsLayouting?: (isLayouting: boolean) => void
  setError?: (error: boolean) => void
}) {
  const { getNodes, getEdges, setNodes, setEdges, fitView } = useReactFlow()
  const hasMeasurements = useNodesInitialized()

  useEffect(() => {
    if (!hasMeasurements) return
    setError?.(false)
    setIsLayouting?.(true)
    getLayoutedElements(getNodes(), getEdges(), options)
      .then(({ nodes, edges }) => {
        setNodes(nodes)
        setEdges(edges)
        fitView()
      })
      .catch((error) => {
        console.error('Error laying out nodes', error)
        setError?.(true)
      })
      .finally(() => setIsLayouting?.(false))
  }, [
    setNodes,
    setEdges,
    hasMeasurements,
    options,
    getNodes,
    getEdges,
    fitView,
    setError,
    setIsLayouting,
  ])
}

const defaultNodeProperties = {
  'elk.portAlignment.default': 'CENTER',
}
