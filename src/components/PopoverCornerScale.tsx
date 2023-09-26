import styled, { useTheme } from 'styled-components'
import { animated, useTransition } from 'react-spring'

import {
  FloatingPortal,
  type Placement,
  type UseFloatingReturn,
} from '@floating-ui/react-dom-interactions'

import { type ReactNode } from 'react'

import { Popover, type PopoverProps } from './ReactAriaPopover'

type PopoverCornerScaleProps = {
  floating: UseFloatingReturn<any>
  children: ReactNode
} & Pick<PopoverProps, 'isOpen' | 'onClose' | 'popoverRef'>

export const PopoverWrapper = styled.div<{
  $isOpen: boolean
  $placement: Placement
}>(({ theme, $placement: placement }) => ({
  position: 'absolute',
  display: 'flex',
  pointerEvents: 'none',
  zIndex: theme.zIndexes.selectPopover,
  '.popover': {
    justifyContent: placement.endsWith('start') ? 'start' : 'end',
  },
}))

const Animated = styled(animated.div)<any>((_) => ({
  display: 'flex',
}))

function PopoverCornerScale({
  isOpen,
  onClose,
  popoverRef,
  floating,
  children,
}: PopoverCornerScaleProps) {
  const theme = useTheme()

  const placementToTransformOrigin = {
    'bottom-end': 'top right',
    'right-end': 'top right',
    //
    'bottom-start': 'top left',
    'left-end': 'top left',
    //
    'top-end': 'bottom right',
    'right-start': 'bottom right',
    //
    'top-start': 'bottom left',
    'left-start': 'bottom left',
    //
    bottom: 'top center',
    top: 'bottom center',
    left: 'right center',
    right: 'left center',
  } as const satisfies Record<Placement, string>
  const transformOrigin = placementToTransformOrigin[floating.placement]

  const outProps = {
    opacity: 0,
    scale: 0.5,
  }

  const inProps = {
    opacity: 1,
    scale: 1,
  }

  const transitions = useTransition(isOpen ? [true] : [], {
    from: { ...outProps, delay: 1000 },
    enter: inProps,
    leave: outProps,
    config: isOpen
      ? {
          mass: 0.6,
          tension: 280,
          velocity: 0.02,
        }
      : {
          mass: 0.6,
          tension: 400,
          velocity: 0.02,
          restVelocity: 0.1,
        },
  })

  const portalProps = {}

  return transitions((styles) => (
    <FloatingPortal
      id={theme.portals.default.id}
      {...portalProps}
    >
      <PopoverWrapper
        $isOpen={isOpen}
        $placement={floating.placement}
        className="popoverWrapper"
        ref={floating.floating}
        style={{
          // ...floating.style,
          position: floating.strategy,
          left: floating.x ?? 0,
          top: floating.y ?? 0,
        }}
      >
        <Animated
          style={{
            ...styles,
            transformOrigin,
          }}
        >
          <Popover
            popoverRef={popoverRef}
            isOpen={isOpen}
            onClose={onClose}
          >
            {children}
          </Popover>
        </Animated>
      </PopoverWrapper>
    </FloatingPortal>
  ))
}

export type { PopoverProps as PopoverCalendarProps }
export { PopoverCornerScale as PopoverCalendar }
