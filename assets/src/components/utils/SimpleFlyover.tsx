// similar to our Flyover component, but more basic and doesn't do a modal lock on the screen
import { usePrevious } from '@pluralsh/design-system'
import styled from 'styled-components'

const ANIMATION_SPEED = '300ms'

export function SimpleFlyover({
  isOpen,
  zIndex = 0,
  children,
}: {
  children: React.ReactNode
  isOpen: boolean
  zIndex?: number
}) {
  const prevOpen = usePrevious(isOpen)

  return (
    <SimpleFlyoverSC
      $shouldAnimate={!!isOpen !== !!prevOpen}
      data-state={isOpen ? 'open' : 'closed'}
      $zIndex={zIndex}
    >
      {children}
    </SimpleFlyoverSC>
  )
}

const SimpleFlyoverSC = styled.div<{
  $zIndex?: number
  $shouldAnimate: boolean
}>(({ theme, $shouldAnimate, $zIndex = 0 }) => {
  const openState = { transform: 'translateX(0%)' }
  const closedState = { transform: 'translateX(100%)' }
  return {
    position: 'absolute',
    top: 0,
    right: '100%',
    zIndex: $zIndex,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: 320,
    background: theme.colors['fill-accent'],
    outline: theme.borders.default,
    // important that these use different names than the Flyover ones to avoid conflicts
    // that's also something to consider if we add other variants
    '@keyframes chatSlideOpen': { from: closedState, to: openState },
    '@keyframes chatSlideClose': { from: openState, to: closedState },
    '&[data-state="open"]': {
      ...($shouldAnimate && {
        animation: `chatSlideOpen ${ANIMATION_SPEED} ease-out`,
      }),
      ...openState,
    },
    '&[data-state="closed"]': {
      ...($shouldAnimate && {
        animation: `chatSlideClose ${ANIMATION_SPEED} ease-out`,
      }),
      ...closedState,
    },
  }
})
