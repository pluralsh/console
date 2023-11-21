import { IconFrame, ReloadIcon } from '@pluralsh/design-system'
import { PipelineFragment } from 'generated/graphql'
import { useCallback, useLayoutEffect, useMemo } from 'react'
import ReactFlow, {
  Background,
  BackgroundVariant,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from 'reactflow'
import chroma from 'chroma-js'

import 'reactflow/dist/style.css'
import styled, { useTheme } from 'styled-components'

import { TestsNode } from './nodes/TestsNode'
import { StageNode } from './nodes/StageNode'
import { ApprovalNode } from './nodes/ApprovalNode'
import { DagreDirection, getLayoutedElements } from './utils/nodeLayouter'
import { EdgeLineMarkerDefs, edgeTypes } from './EdgeLine'
import { NodeType, getNodesEdges } from './utils/getNodesEdges'

const nodeTypes = {
  [NodeType.Stage]: StageNode,
  [NodeType.Approval]: ApprovalNode,
  [NodeType.Tests]: TestsNode,
}

export function Pipeline({ pipeline }: { pipeline: PipelineFragment }) {
  const theme = useTheme()
  const gridGap = theme.spacing.large
  const margin = gridGap * 1
  const { initialNodes, initialEdges } = useMemo(
    () => getNodesEdges(pipeline),
    [pipeline]
  )
  const { setViewport, getViewport, viewportInitialized } = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes as any)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const layoutNodes = useCallback(
    (direction: DagreDirection = 'LR') => {
      const layouted = getLayoutedElements(nodes, edges, {
        direction,
        zoom: getViewport().zoom,
        gridGap,
        margin,
      })

      setNodes([...layouted.nodes])
      setEdges([...layouted.edges])
    },
    [nodes, edges, getViewport, gridGap, margin, setNodes, setEdges]
  )

  useLayoutEffect(() => {
    if (viewportInitialized) {
      layoutNodes()
    }
    // Only run on first render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewportInitialized])

  return (
    <ReactFlowWrapperSC>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        draggable
        nodesDraggable={false}
        edgesUpdatable={false}
        edgesFocusable={false}
        nodesConnectable={false}
        edgeTypes={edgeTypes}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={gridGap}
          size={1}
          color={`${chroma(theme.colors['border-fill-three']).alpha(1)}`}
        />
        <EdgeLineMarkerDefs />
      </ReactFlow>
      <div
        css={{
          position: 'absolute',
          top: theme.spacing.xsmall,
          right: theme.spacing.xsmall,
          display: 'flex',
          gap: theme.spacing.xsmall,
        }}
      >
        <IconFrame
          clickable
          type="floating"
          icon={<ReloadIcon />}
          tooltip="Reset view"
          onClick={() =>
            setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 500 })
          }
        >
          Reset view
        </IconFrame>
      </div>
    </ReactFlowWrapperSC>
  )
}

const ReactFlowWrapperSC = styled.div<{ $hide?: boolean }>(({ $hide }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  '.react-flow__renderer': {
    opacity: $hide ? 0 : 1,
  },
}))
