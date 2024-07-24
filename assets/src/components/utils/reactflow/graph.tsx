import styled, { useTheme } from 'styled-components'
import ReactFlow, {
  Background,
  BackgroundVariant,
  ReactFlowProps,
} from 'reactflow'
import {
  CloseIcon,
  IconFrame,
  LinkoutIcon,
  ReloadIcon,
  WrapWithIf,
} from '@pluralsh/design-system'
import chroma from 'chroma-js'
import { useState } from 'react'
import { useKeyDown } from '@react-hooks-library/core'

import { MarkerDefs } from './markers'
import { edgeTypes } from './edges'

const ReactFlowFullScreenWrapperSC = styled.div(({ theme }) => ({
  position: 'fixed',
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: theme.zIndexes.modal,
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
  resetView,
  allowFullscreen = false,
  ...props
}: {
  resetView?: () => void
  allowFullscreen?: boolean
} & ReactFlowProps) {
  const theme = useTheme()
  const [fullscreen, setFullscreen] = useState(false)

  useKeyDown('Escape', () => setFullscreen(false))

  return (
    <WrapWithIf
      condition={fullscreen}
      wrapper={<ReactFlowFullScreenWrapperSC />}
    >
      <ReactFlowAreaSC $fullscreen={fullscreen}>
        <ReactFlowWrapperSC>
          <ReactFlow
            edgeTypes={edgeTypes}
            draggable
            edgesFocusable={false}
            edgesUpdatable={false}
            nodesDraggable={false}
            nodesConnectable={false}
            {...props}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={theme.spacing.large}
              size={1}
              color={`${chroma(theme.colors['border-fill-three']).alpha(1)}`}
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
            {resetView && (
              <IconFrame
                clickable
                type="floating"
                icon={<ReloadIcon />}
                tooltip="Reset view"
                onClick={resetView}
              >
                Reset view
              </IconFrame>
            )}
          </ReactFlowActionWrapperSC>
        </ReactFlowWrapperSC>
      </ReactFlowAreaSC>
    </WrapWithIf>
  )
}
