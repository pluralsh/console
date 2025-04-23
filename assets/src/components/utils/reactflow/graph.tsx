import {
  CloseIcon,
  IconFrame,
  LinkoutIcon,
  ReloadIcon,
} from '@pluralsh/design-system'
import { useKeyDown } from '@react-hooks-library/core'
import {
  Background,
  BackgroundVariant,
  Edge,
  ReactFlow,
  ReactFlowProps,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Node,
} from '@xyflow/react'
import { useCallback, useEffect, useState } from 'react'
import FocusLock from 'react-focus-lock'
import styled, { useTheme } from 'styled-components'

import { edgeTypes } from './edges'
import { MarkerDefs } from './markers'

import '@xyflow/react/dist/style.css'
import { useAutoLayout } from 'components/cd/pipelines/utils/nodeLayouter'
import { LayoutOptions } from 'elkjs'
import { runAfterBrowserLayout } from 'utils/runAfterBrowserLayout'
import { GqlError } from '../Alert'
import LoadingIndicator from '../LoadingIndicator'

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
  elkOptions,
  resetView,
  allowFullscreen = false,
  ...props
}: {
  baseNodes: Node[]
  baseEdges: Edge[]
  elkOptions: LayoutOptions // this needs to be memoized before being passed in, otherwise will cause infinite render loop
  resetView?: () => void
  allowFullscreen?: boolean
} & ReactFlowProps) {
  const theme = useTheme()
  const [fullscreen, setFullscreen] = useState(false)
  const [isLayouting, setIsLayouting] = useState(false)
  const [hasLayoutError, setHasLayoutError] = useState(false)

  const { fitView } = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState(baseNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(baseEdges)

  useAutoLayout({
    options: elkOptions,
    setIsLayouting,
    setError: setHasLayoutError,
  })

  // forces the graph to recreate if parent data changes
  useEffect(() => {
    setNodes(baseNodes)
    setEdges(baseEdges)
  }, [baseNodes, baseEdges, setNodes, setEdges])

  const defaultResetView = useCallback(
    () => fitView({ duration: 500 }),
    [fitView]
  )
  const toggleFullscreen = useCallback(() => {
    setFullscreen(!fullscreen)
    runAfterBrowserLayout(defaultResetView)
  }, [defaultResetView, fullscreen])

  useKeyDown('Escape', () => fullscreen && toggleFullscreen())

  if (hasLayoutError)
    return (
      <ErrorWrapperSC>
        <GqlError error="Error generating graph, check logs for details." />
      </ErrorWrapperSC>
    )

  return (
    <ReactFlowFullScreenWrapperSC
      disabled={!fullscreen} // controls focus lock
      $fullscreen={fullscreen}
    >
      <ReactFlowAreaSC $fullscreen={fullscreen}>
        {isLayouting && <LoadingIndicator />}
        <ReactFlowWrapperSC $hide={isLayouting}>
          <ReactFlow
            fitView
            draggable
            minZoom={0.08}
            edgeTypes={edgeTypes}
            edgesFocusable={false}
            edgesReconnectable={false}
            nodesDraggable={false}
            nodesConnectable={false}
            {...props}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            proOptions={{ hideAttribution: true }}
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
                onClick={toggleFullscreen}
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

const ErrorWrapperSC = styled.div({
  height: '100%',
  width: '100%',
})
