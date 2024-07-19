import { usePrevious } from '@pluralsh/design-system'
import { ServiceTreeNodeFragment } from 'generated/graphql'
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
} from '../pipelines/utils/nodeLayouter'
import { ReactFlowGraph } from '../../utils/reactflow/graph'

import { EdgeType } from '../../utils/reactflow/edges'

import {
  ServicesTreeDiagramNodeType,
  nodeTypes,
} from './ServicesTreeDiagramNode'

function getNodesAndEdges(services: ServiceTreeNodeFragment[]) {
  return {
    nodes: services
      .filter((service) => service.name !== 'deploy-operator')
      .map((service) => ({
        id: service.id,
        position: { x: 0, y: 0 },
        type: ServicesTreeDiagramNodeType,
        data: { ...service },
      })),
    edges: services
      .filter((service) => service.parent?.id)
      .map((service) => ({
        type: EdgeType.Smooth,
        updatable: false,
        id: `${service.id}${service.parent?.id}`,
        source: service.id,
        target: service.parent?.id ?? '',
      })),
    // TODO: Add invisible edges to position disconnected nodes.
    // TODO: Switch edge type?
    // TODO: Add global services.
  }
}

export function ServicesTreeDiagram({
  services,
}: {
  services: ServiceTreeNodeFragment[]
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
      resetView={() => setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 500 })}
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      nodesDraggable
    />
  )
}
