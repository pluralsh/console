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

const ReactFlowFullScreenWrapperSC = styled.div((_) => ({
  position: 'absolute',
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
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

const ReactFlowAreaSC = styled.div(({ theme }) => ({
  backgroundColor:
    theme.mode === 'dark' ? theme.colors.grey[950] : theme.colors['fill-one'],
  border: theme.borders.default,
  width: '100%',
  height: '100%',
  borderRadius: theme.borderRadiuses.large,
  position: 'relative',
  overflow: 'hidden',
}))

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
      <ReactFlowAreaSC>
        <ReactFlowWrapperSC>
          <ReactFlow {...props}>
            <Background
              variant={BackgroundVariant.Dots}
              gap={theme.spacing.large}
              size={1}
              color={`${chroma(theme.colors['border-fill-three']).alpha(1)}`}
            />
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
