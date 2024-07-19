import { usePrevious } from '@pluralsh/design-system'
import { ServiceDeploymentsRowFragment } from 'generated/graphql'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react'
import { useEdgesState, useNodesState, useReactFlow } from 'reactflow'
import 'reactflow/dist/style.css'
import { useTheme } from 'styled-components'

import {
  type DagreDirection,
  getLayoutedElements,
} from '../../cd/pipelines/utils/nodeLayouter'
import { ReactFlowGraph } from '../../utils/reactflow/graph'

import {
  ServicesTreeDiagramNodeType,
  nodeTypes,
} from './ServicesTreeDiagramNode'

function getNodesAndEdges(services: ServiceDeploymentsRowFragment[]) {
  return {
    nodes: services.map((service) => ({
      id: service.id,
      position: { x: 0, y: 0 },
      type: ServicesTreeDiagramNodeType,
      data: { ...service },
    })),
    edges: [], // TODO
  }
}

export function ServicesTreeDiagram({
  services,
}: {
  services: ServiceDeploymentsRowFragment[]
}) {
  const theme = useTheme()

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => getNodesAndEdges(services),
    [services]
  )
  const { setViewport, getViewport, viewportInitialized } = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes as any)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [needsLayout, setNeedsLayout] = useState(true)
  const prevState = usePrevious(services)
  const prevNodes = usePrevious(nodes)
  const prevEdges = usePrevious(edges)

  const layoutNodes = useCallback(
    (direction: DagreDirection = 'LR') => {
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
    // Don't run for initial value, only for changes
    if (prevState && prevState !== services) {
      const { nodes, edges } = getNodesAndEdges(services)

      setNodes(nodes)
      setEdges(edges)
      setNeedsLayout(true)
    }
  }, [services, prevState, setEdges, setNodes])

  return (
    <ReactFlowGraph
      allowFullscreen
      resetView={() => setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 500 })}
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      nodesDraggable
      nodesConnectable={false}
    />
  )
}
