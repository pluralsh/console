// similar to our Flyover component, but more basic and doesn't do a modal lock on the screen
import { usePrevious } from '@pluralsh/design-system'
import { ComponentPropsWithRef } from '@react-spring/web'
import styled from 'styled-components'

const ANIMATION_SPEED = '300ms'

export function SimpleFlyover({
  isOpen,
  zIndex = 0,
  children,
  ...props
}: {
  children: React.ReactNode
  isOpen: boolean
  zIndex?: number
} & ComponentPropsWithRef<typeof SimpleFlyoverSC>) {
  const prevOpen = usePrevious(isOpen)

  return (
    <SimpleFlyoverSC
      $shouldAnimate={!!isOpen !== !!prevOpen}
      data-state={isOpen ? 'open' : 'closed'}
      $zIndex={zIndex}
      {...props}
    >
      {children}
    </SimpleFlyoverSC>
  )
}

const SimpleFlyoverSC = styled.div<{
  $zIndex?: number
  $shouldAnimate?: boolean
}>(({ theme, $shouldAnimate, $zIndex = 0 }) => {
  const openState = { transform: 'translateX(0%)', opacity: 1 }
  const closedState = { transform: 'translateX(100%)', opacity: 0 }
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
    // that's also something to consider if we add other variants of this
    '@keyframes chatSlideOpen': {
      from: { ...closedState, opacity: 1 },
      to: openState,
    },
    '@keyframes chatSlideClose': {
      '0%': openState,
      // we want opacity zero when closed, but also to avoid a fade-out effect
      '99%': { ...closedState, opacity: 1 },
      '100%': closedState,
    },
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
