import { useOutsideClick } from 'honorable'
import {
  MutableRefObject,
  PropsWithChildren,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { UseTransitionProps, animated, useTransition } from 'react-spring'

import styled, { useTheme } from 'styled-components'

import usePrevious from '../hooks/usePrevious'

const DIRECTIONS = ['up', 'down', 'left', 'right'] as const

type Direction = typeof DIRECTIONS[number]

type TransitionType = 'slide' | 'fade' | 'scale'
type GetTransitionProps = {
  isOpen: boolean
  type: TransitionType
  direction: Direction
}

type AnimationType =
  | 'fade'
  | 'scale'
  | 'slide'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'slide-horizontal'
  | 'slide-vertical'

const DEFAULT_DIRECTION: Direction = 'down' as const
const DEFAULT_TRANSITION_TYPE: TransitionType = 'slide' as const
const isDirection = (direction: string | null | undefined): direction is Direction => DIRECTIONS.includes(direction as any)

const getTransitionProps = ({
  isOpen,
  type,
  direction,
}: GetTransitionProps) => {
  if (type !== 'slide') {
    direction = undefined
  }

  const from = {
    opacity: 0,
    translateX:
      direction === 'right' ? '-100%' : direction === 'left' ? '100%' : '0%',
    translateY:
      direction === 'down' ? '-100%' : direction === 'up' ? '100%' : '0%',
    scale: type === 'scale' ? '10%' : '100%',
  }

  const to = {
    opacity: 1,
    translateX: '0%',
    translateY: '0%',
    scale: '100%',
  }

  return {
    from,
    enter: to,
    leave: { ...from, opacity: type === 'fade' ? 0 : -1.5 },
    config: isOpen
      ? {
        mass: 0.6,
        tension: 280,
        velocity: 0.02,
      }
      : {
        mass: 0.6,
        tension: 375,
        velocity: 0.02,
        restVelocity: 0.1,
      },
  }
}

export type LayerPositionType =
  | 'bottom'
  | 'bottom-left'
  | 'bottom-right'
  | 'center'
  | 'hidden'
  | 'left'
  | 'right'
  | 'top'
  | 'top-left'
  | 'top-right'

type SimpleMarginType = {
  top?: string | number | undefined | null
  bottom?: string | number | undefined | null
  left?: string | number | undefined | null
  right?: string | number | undefined | null
}

export type MarginType = (SimpleMarginType & {
  vertical?: string | number | undefined | null
  horizontal?: string | number | undefined | null
}) | string | number

const LayerWrapper = styled.div<{
  position: LayerPositionType
  margin: SimpleMarginType
}>(({ position, margin }) => ({
  display: 'flex',
  position: 'absolute',
  pointerEvents: 'none',
  '& > *': {
    pointerEvents: 'auto',
  },
  overflow: 'hidden',
  alignItems: position.startsWith('top')
    ? 'start'
    : position.startsWith('bottom')
      ? 'end'
      : 'center',
  justifyContent: position.endsWith('left')
    ? 'start'
    : position.endsWith('right')
      ? 'end'
      : 'center',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  paddingLeft: margin.left,
  paddingRight: margin.right,
  paddingTop: margin.top,
  paddingBottom: margin.bottom,
}))

function LayerRef({
  position,
  animation = 'slide',
  margin,
  children,
  onClickOutside,
  onClose,
  onCloseComplete,
  open,
}: PropsWithChildren<{
    open: boolean
    position: LayerPositionType
    animation?: AnimationType
    margin?: MarginType
    onClose?: () => void | null | undefined
    onCloseComplete?: () => void | null | undefined
    onClickOutside?: () => void | null | undefined
  }>,
ref: MutableRefObject<HTMLDivElement>) {
  const theme = useTheme()
  const internalRef = useRef<HTMLDivElement>()
  const finalRef = ref || internalRef
  const [closeComplete, setCloseComplete] = useState(!open)
  const prevOpen = usePrevious(open)

  const visible = open || !closeComplete

  useEffect(() => {
    if (open) {
      setCloseComplete(false)
    }
  }, [open])

  useEffect(() => {
    if (!open && prevOpen) {
      onClose?.()
    }
  }, [onClose, open, prevOpen])

  useOutsideClick(finalRef, () => {
    onClickOutside?.()
  })
  const onDestroyed = useCallback(() => {
    if (!open) {
      setCloseComplete(true)
    }
    onCloseComplete?.()
  }, [onCloseComplete, open])

  if (typeof margin === 'string' || typeof margin === 'number') {
    margin = {
      vertical: margin,
      horizontal: margin,
    }
  }
  if (typeof margin === 'object') {
    margin = {
      ...(margin.top ? { top: margin.top } : {}),
      ...(margin.bottom ? { bottom: margin.bottom } : {}),
      ...(margin.left ? { left: margin.left } : {}),
      ...(margin.right ? { right: margin.right } : {}),
      ...(margin.vertical
        ? {
          top: margin.vertical,
          bottom: margin.vertical,
        }
        : {}),
      ...(margin.horizontal
        ? {
          left: margin.horizontal,
          right: margin.horizontal,
        }
        : {}),
    }
  }
  else {
    margin = {}
  }
  for (const [key, value] of Object.entries(margin)) {
    margin[key] = theme.spacing[value] || value
  }
  let transitionDirection: GetTransitionProps['direction'] = DEFAULT_DIRECTION
  let transitionType: GetTransitionProps['type'] = DEFAULT_TRANSITION_TYPE

  if (animation.startsWith('fade')) {
    transitionType = 'fade'
    transitionDirection = undefined
  }
  else if (animation === 'scale') {
    transitionType = 'scale'
    transitionDirection = undefined
  }
  else if (animation === 'slide') {
    if (position === 'center') {
      transitionType = 'scale'
      transitionDirection = undefined
    }
    else {
      transitionType = 'slide'
      transitionDirection = position.startsWith('top')
        ? 'down'
        : position.startsWith('bottom')
          ? 'up'
          : position.endsWith('left')
            ? 'right'
            : position.endsWith('right')
              ? 'left'
              : DEFAULT_DIRECTION
    }
  }
  else if (animation.startsWith('slide')) {
    transitionType = 'slide'
    const tempDirection = animation.split('-')[1]

    if (isDirection(tempDirection)) {
      transitionDirection = tempDirection as Direction
    }
    if (tempDirection === 'horizontal') {
      transitionDirection = position.endsWith('right') ? 'left' : 'right'
    }
    else if (tempDirection === 'vertical') {
      transitionDirection = position.endsWith('bottom') ? 'up' : 'down'
    }
  }

  const transitionProps: UseTransitionProps = {
    ...getTransitionProps({
      isOpen: open,
      direction: transitionDirection,
      type: transitionType,
    }),
    onDestroyed,
  }
  const transitions = useTransition(open ? [true] : [], transitionProps)

  const portalElt
    = document?.getElementById(theme.portals.default.id) ?? document?.body

  if (!visible || position === 'hidden' || !portalElt) {
    return null
  }

  const portalContent = (
    <LayerWrapper
      position={position}
      margin={margin}
    >
      {transitions(styles => (
        <animated.div
          className="animated"
          ref={finalRef}
          style={{ ...styles }}
        >
          {children}
        </animated.div>
      ))}
    </LayerWrapper>
  )

  return createPortal(portalContent, portalElt)
}

const Layer = forwardRef(LayerRef)

export default Layer
