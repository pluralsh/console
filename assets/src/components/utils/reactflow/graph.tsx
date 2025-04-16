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
  useReactFlow,
  type Node as FlowNode,
} from '@xyflow/react'
import { createContext, useCallback, useMemo, useState } from 'react'
import FocusLock from 'react-focus-lock'
import styled, { useTheme } from 'styled-components'

import {
  DagreGraphOptions,
  runAfterBrowserLayout,
  useLayoutNodes,
} from 'components/cd/pipelines/utils/nodeLayouter'
import { edgeTypes } from './edges'
import { MarkerDefs } from './markers'

import '@xyflow/react/dist/style.css'

export const GraphLayoutCtx = createContext<
  (DagreGraphOptions & { triggerLayout: () => void }) | undefined
>(undefined)

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
  dagreOptions,
  resetView,
  allowFullscreen = false,
  ...props
}: {
  baseNodes: FlowNode[]
  baseEdges: Edge[]
  dagreOptions?: DagreGraphOptions // this needs to be memoized before being passed in, otherwise will cause infinite render loop
  resetView?: () => void
  allowFullscreen?: boolean
} & ReactFlowProps) {
  const theme = useTheme()
  const [fullscreen, setFullscreen] = useState(false)
  const { fitView } = useReactFlow()
  const { nodes, edges, showGraph, onNodesChange, onEdgesChange, layoutNodes } =
    useLayoutNodes({
      baseNodes,
      baseEdges,
      options: dagreOptions,
    })

  const defaultResetView = useCallback(() => {
    fitView({ duration: 500 })
  }, [fitView])

  const toggleFullscreen = useCallback(() => {
    setFullscreen(!fullscreen)
    runAfterBrowserLayout(() => fitView({ duration: 500 }))
  }, [fitView, fullscreen])

  useKeyDown('Escape', () => fullscreen && toggleFullscreen())

  const ctx = useMemo(
    () => ({ ...dagreOptions, triggerLayout: layoutNodes }),
    [dagreOptions, layoutNodes]
  )

  return (
    <GraphLayoutCtx value={ctx}>
      <ReactFlowFullScreenWrapperSC
        disabled={!fullscreen} // controls focus lock
        $fullscreen={fullscreen}
      >
        <ReactFlowAreaSC $fullscreen={fullscreen}>
          <ReactFlowWrapperSC style={{ opacity: showGraph ? 1 : 0 }}>
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
    </GraphLayoutCtx>
  )
}
