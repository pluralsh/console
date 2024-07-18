import { usePrevious } from '@pluralsh/design-system'
import { StackState } from 'generated/graphql'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react'
import {
  type Edge,
  type Node,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useTheme } from 'styled-components'

import {
  type DagreDirection,
  getLayoutedElements,
} from '../../cd/pipelines/utils/nodeLayouter'
import { NodeType } from '../../cd/pipelines/utils/getNodesAndEdges'
import { isNonNullable } from '../../../utils/isNonNullable'
import { ReactFlowGraph } from '../../utils/ReactFlow'
import { SMOOTH_STEP_EDGE_NAME, edgeTypes } from '../../utils/ReactFlowEdges'

import { StackStateGraphNode } from './StackStateGraphNode'

const nodeTypes = {
  [NodeType.Stage]: StackStateGraphNode,
}

export function getNodesAndEdges(state: StackState) {
  const nodes: Node[] = []
  const edges: Edge[] = []

  state?.state?.filter(isNonNullable).forEach((stage) => {
    nodes.push({
      id: stage.identifier,
      position: { x: 0, y: 0 },
      type: NodeType.Stage,
      data: { ...stage },
    })

    edges.push(
      ...(stage.links ?? []).filter(isNonNullable).map((link) => ({
        type: SMOOTH_STEP_EDGE_NAME,
        updatable: false,
        id: `${stage.identifier}${link}`,
        source: stage.identifier,
        target: link,
      }))
    )
  })

  return { nodes, edges }
}

export function StackStateGraph({ state }: { state: StackState }) {
  const theme = useTheme()

  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => getNodesAndEdges(state),
    [state]
  )
  const { setViewport, getViewport, viewportInitialized } = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes as any)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [needsLayout, setNeedsLayout] = useState(true)
  const prevState = usePrevious(state)
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
    if (prevState && prevState !== state) {
      const { nodes, edges } = getNodesAndEdges(state)

      setNodes(nodes)
      setEdges(edges)
      setNeedsLayout(true)
    }
  }, [state, prevState, setEdges, setNodes])

  return (
    <ReactFlowGraph
      allowFullscreen
      resetView={() => setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 500 })}
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      draggable
      nodesDraggable
      edgesUpdatable={false}
      edgesFocusable={false}
      nodesConnectable={false}
      edgeTypes={edgeTypes}
    />
  )
}
