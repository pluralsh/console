import { ReactNode, useMemo, useRef } from 'react'
import { AnimatedDiv } from '@pluralsh/design-system'
import { useTransition } from 'react-spring'

import { useTheme } from 'styled-components'
import { useClickOutside, useKeyDown } from '@react-hooks-library/core'

const getTransitionProps = (open: boolean) => ({
  from: { opacity: 0, scale: `65%` },
  enter: { opacity: 1, scale: '100%' },
  leave: { opacity: 0, scale: `65%` },
  config: open
    ? { mass: 0.6, tension: 280, velocity: 0.02 }
    : { mass: 0.6, tension: 600, velocity: 0.04, restVelocity: 0.1 },
})

export function AIPanelOverlay({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
}) {
  const theme = useTheme()
  const ref = useRef<any>()
  const transitionProps = useMemo(() => getTransitionProps(open), [open])
  const transitions = useTransition(open ? [true] : [], transitionProps)

  useKeyDown(['Escape'], onClose)
  useClickOutside(ref, onClose)

  return transitions((styles) => (
    <AnimatedDiv
      ref={ref}
      css={{
        display: 'flex',
        minHeight: 240,
        pointerEvents: 'none',
        position: 'absolute',
        right: 0,
        top: 32 + theme.spacing.small,
        width: 480,
        zIndex: theme.zIndexes.modal,
        '& > *': { pointerEvents: 'auto' },
      }}
      style={{
        transformOrigin: 'top right',
        ...styles,
      }}
    >
      {children}
    </AnimatedDiv>
  ))
}
