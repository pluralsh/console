import styled from 'styled-components'

export const ReactFlowWrapperSC = styled.div<{ $hide?: boolean }>(
  ({ $hide }) => ({
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
  })
)

export const ReactFlowFullScreenWrapperSC = styled.div((_) => ({
  position: 'absolute',
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
}))
