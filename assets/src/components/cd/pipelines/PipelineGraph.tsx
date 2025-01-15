import { usePrevious } from '@pluralsh/design-system'
import { PipelineFragment } from 'generated/graphql'
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

import { ReactFlowGraph } from '../../utils/reactflow/graph'

import { TestsNode } from './nodes/TestsNode'
import { StageNode } from './nodes/StageNode'
import { ApprovalNode } from './nodes/ApprovalNode'
import { JobNode } from './nodes/JobNode'
import { type DagreDirection, getLayoutedElements } from './utils/nodeLayouter'
import { NodeType, getNodesAndEdges } from './utils/getNodesAndEdges'

const nodeTypes = {
  [NodeType.Stage]: StageNode,
  [NodeType.Approval]: ApprovalNode,
  [NodeType.Job]: JobNode,
  [NodeType.Tests]: TestsNode,
}

export function Pipeline({ pipeline }: { pipeline: PipelineFragment }) {
  const theme = useTheme()
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => getNodesAndEdges(pipeline),
    [pipeline]
  )
  const { fitView, getViewport, viewportInitialized } = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes as any)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [needsLayout, setNeedsLayout] = useState(true)
  const prevPipeline = usePrevious(pipeline)
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
    // Don't run for initial value of pipeline, only for changes
    if (prevPipeline && prevPipeline !== pipeline) {
      const { nodes, edges } = getNodesAndEdges(pipeline)

      setNodes(nodes)
      setEdges(edges)
      setNeedsLayout(true)
    }
  }, [pipeline, prevPipeline, setEdges, setNodes])

  return (
    <ReactFlowGraph
      resetView={() => fitView({ duration: 500 })}
      onLoad={() => fitView()}
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
    />
  )
}
