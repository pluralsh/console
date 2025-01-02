import { AnimatedDiv, useResizeObserver } from '@pluralsh/design-system'
import { ReactNode, RefObject, useMemo, useRef, useState } from 'react'
import { useTransition } from 'react-spring'

import { useClickOutside, useKeyDown } from '@react-hooks-library/core'
import { useTheme } from 'styled-components'

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
  alwaysGrow = false,
  children,
}: {
  open: boolean
  onClose: () => void
  alwaysGrow?: boolean
  children: ReactNode
}) {
  const theme = useTheme()
  const ref = useRef<any>(undefined)
  const transitionProps = useMemo(() => getTransitionProps(open), [open])
  const transitions = useTransition(open ? [true] : [], transitionProps)
  const maxHeight = useOverlayMaxHeight(ref, 32)

  useKeyDown(['Escape'], onClose)
  useClickOutside(ref, onClose)

  return transitions((styles) => (
    <AnimatedDiv
      ref={ref}
      css={{
        display: 'flex',
        transition: 'max-height 0.2s ease-in-out, height 0.2s ease-in-out',
        pointerEvents: 'none',
        position: 'absolute',
        right: 0,
        top: 32 + theme.spacing.small,
        width: 600,
        zIndex: theme.zIndexes.modal,
        '& > *': { pointerEvents: 'auto' },
      }}
      style={{
        ...(alwaysGrow ? { height: maxHeight } : { maxHeight }),
        transformOrigin: 'top right',
        ...styles,
      }}
    >
      {children}
    </AnimatedDiv>
  ))
}

function useOverlayMaxHeight(
  ref: RefObject<HTMLElement | null>,
  padding: number,
  defaultValue: string = '300px'
) {
  const [maxHeight, setMaxHeight] = useState(defaultValue)

  useResizeObserver(ref, () => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    setMaxHeight(`calc(100vh - ${rect.top}px - ${padding}px)`)
  })

  return maxHeight
}
