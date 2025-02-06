import {
  CloseIcon,
  IconFrame,
  LinkoutIcon,
  ReloadIcon,
} from '@pluralsh/design-system'
import { useKeyDown } from '@react-hooks-library/core'
import { useCallback, useLayoutEffect, useState } from 'react'
import FocusLock from 'react-focus-lock'
import ReactFlow, {
  Background,
  BackgroundVariant,
  Edge,
  ReactFlowProps,
  useReactFlow,
  type Node as FlowNode,
} from 'reactflow'
import styled, { useTheme } from 'styled-components'

import {
  DagreDirection,
  useLayoutNodes,
} from 'components/cd/pipelines/utils/nodeLayouter'
import { edgeTypes } from './edges'
import { MarkerDefs } from './markers'

const ReactFlowFullScreenWrapperSC = styled(FocusLock)<{
  $fullscreen?: boolean
}>(({ theme, $fullscreen }) => ({
  ...($fullscreen
    ? {
        position: 'fixed',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: theme.zIndexes.modal,
      }
    : { display: 'contents' }),
}))

const ReactFlowWrapperSC = styled.div<{ $hide?: boolean }>(({ $hide }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,

  '.react-flow__renderer': {
    opacity: $hide ? 0 : 1,
  },

  '.react-flow__edge': {
    pointerEvents: 'none',
    cursor: 'unset',
  },
}))

const ReactFlowAreaSC = styled.div<{ $fullscreen?: boolean }>(
  ({ theme, $fullscreen }) => ({
    backgroundColor:
      theme.mode === 'dark' ? theme.colors.grey[950] : theme.colors['fill-one'],
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',

    ...($fullscreen
      ? {}
      : {
          border: theme.borders.default,
          borderRadius: theme.borderRadiuses.large,
        }),
  })
)

const ReactFlowActionWrapperSC = styled.div(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing.xsmall,
  right: theme.spacing.xsmall,
  display: 'flex',
  gap: theme.spacing.xsmall,
}))

export function ReactFlowGraph({
  baseNodes,
  baseEdges,
  direction = 'LR',
  resetView,
  allowFullscreen = false,
  ...props
}: {
  baseNodes: FlowNode[]
  baseEdges: Edge[]
  direction?: DagreDirection
  resetView?: () => void
  allowFullscreen?: boolean
} & ReactFlowProps) {
  const theme = useTheme()
  const [fullscreen, setFullscreen] = useState(false)
  const { fitView } = useReactFlow()

  const defaultResetView = useCallback(
    () => fitView({ duration: 500 }),
    [fitView]
  )

  const { nodes, edges, layoutNodes } = useLayoutNodes({
    baseNodes,
    baseEdges,
    direction,
  })

  // initial layout
  useLayoutEffect(() => {
    layoutNodes()
  }, [layoutNodes, defaultResetView])

  useKeyDown('Escape', () => setFullscreen(false))

  return (
    <ReactFlowFullScreenWrapperSC
      disabled={!fullscreen} // controls focus lock
      $fullscreen={fullscreen}
    >
      <ReactFlowAreaSC $fullscreen={fullscreen}>
        <ReactFlowWrapperSC>
          <ReactFlow
            fitView
            draggable
            minZoom={0.08}
            edgeTypes={edgeTypes}
            edgesFocusable={false}
            edgesUpdatable={false}
            nodesDraggable={false}
            nodesConnectable={false}
            {...props}
            nodes={nodes}
            edges={edges}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={theme.spacing.large}
              size={1}
              color={theme.colors['border-fill-three']}
            />
            <MarkerDefs />
          </ReactFlow>
          <ReactFlowActionWrapperSC>
            {allowFullscreen && (
              <IconFrame
                clickable
                type="floating"
                icon={fullscreen ? <CloseIcon /> : <LinkoutIcon />}
                tooltip={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                onClick={() => setFullscreen(!fullscreen)}
              >
                Fullscreen
              </IconFrame>
            )}
            <IconFrame
              clickable
              type="floating"
              icon={<ReloadIcon />}
              tooltip="Reset view"
              onClick={resetView || defaultResetView}
            >
              Reset view
            </IconFrame>
          </ReactFlowActionWrapperSC>
        </ReactFlowWrapperSC>
      </ReactFlowAreaSC>
    </ReactFlowFullScreenWrapperSC>
  )
}
