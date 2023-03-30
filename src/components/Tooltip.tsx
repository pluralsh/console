// Tooltip Library docs: https://floating-ui.com/docs/react-dom
import { ReactNode, cloneElement, useMemo, useRef, useState } from 'react'
import {
  FloatingPortal,
  Placement,
  arrow,
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
} from '@floating-ui/react-dom-interactions'
import { mergeRefs } from 'react-merge-refs'
import { Div, DivProps } from 'honorable'
import { CSSTransition } from 'react-transition-group'
import styled, { useTheme } from 'styled-components'

import createIcon from './icons/createIcon'
import WrapWithIf from './WrapWithIf'

type TooltipProps = {
  label: ReactNode
  placement?: Placement
  children?: JSX.Element
  displayOn?: 'hover' | 'click' | 'focus' | 'manual' | 'none'
  arrowProps?: DivProps
  manualOpen?: boolean
  strategy?: 'absolute' | 'fixed'
  arrow?: boolean
  dismissable?: boolean
  portal?: boolean
  portalProps?: any
  onOpenChange?: (open: boolean) => unknown
} & DivProps

const Tip = styled(Div)`
  &.enter {
    opacity: 0;
    transform: scale(0.5);
  }
  &.enter-active,
  &.enter-done {
    opacity: 1;
    transform: scale(1);
    visibility: visible;
  }
  &.enter-active {
    transition: transform 0.15s cubic-bezier(0.37, 1.4, 0.62, 1),
      opacity 0.1s linear;
  }
  &.exit {
    opacity: 1;
    transform: scale(1);
  }
  &.exit-active,
  &.exit-done {
    opacity: 0;
    transform: scale(0.3);
  }
  &.exit-active {
    transition: transform 0.05s ease-in, opacity 0.05s linear;
  }
`

const TooltipArrow = createIcon(({ size, color }) => (
  <svg
    width={size}
    viewBox="0 0 7 5"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g fill={color}>
      <path d="m3.89468 3.99256c-.20018.25737-.58918.25737-.78936 0l-3.10531961-3.99256h6.99999961z" />
    </g>
  </svg>
))

const ARROW_LENGTH = 5
const ARROW_WIDTH = 7

const DEFAULT_OFFSET = 4

function Tooltip({
  children,
  label,
  placement = 'right',
  displayOn = 'hover',
  manualOpen = null,
  arrowProps = {},
  strategy = 'fixed',
  arrow: showArrow = true,
  dismissable = true,
  offset: tipOffset,
  portal = true,
  portalProps = {},
  onOpenChange,
  ...props
}: TooltipProps) {
  const theme = useTheme()
  const [open, setOpen] = useState(false)
  const arrowRef = useRef()
  const isOpen =
    displayOn === 'none' ? false : displayOn === 'manual' ? manualOpen : open

  const totalOffset =
    (showArrow ? ARROW_LENGTH : 0) +
    (typeof tipOffset === 'number' ? tipOffset : DEFAULT_OFFSET)

  const {
    x,
    y,
    reference,
    floating,
    strategy: finalStrategy,
    context,
    placement: finalPlacement,
    middlewareData,
  } = useFloating({
    placement,
    open: isOpen,
    strategy,
    onOpenChange: (open) => {
      setOpen(open)
      if (onOpenChange) onOpenChange(open)
    },
    middleware: [
      offset(totalOffset),
      flip(),
      shift({ padding: 12 }),
      ...(showArrow ? [arrow({ element: arrowRef })] : []),
    ],
    whileElementsMounted: autoUpdate,
  })

  const { getReferenceProps, getFloatingProps } = useInteractions([
    useHover(context, {
      enabled: displayOn === 'hover',
      restMs: 25,
      delay: { open: 0, close: 0 },
    }),
    useClick(context, { enabled: displayOn === 'click' }),
    useFocus(context, { enabled: displayOn === 'focus' }),
    useRole(context, { role: 'tooltip' }),
    useDismiss(context, { enabled: dismissable === true }),
  ])

  // Preserve the consumer's ref
  const childrenRef = useMemo(
    () => mergeRefs([reference, (children as any).ref]),
    [reference, children]
  )

  const finalPlacementSide = `${finalPlacement}`.split('-')[0]
  const arrowRotation = {
    top: 0,
    right: 90,
    bottom: 180,
    left: -90,
  }[finalPlacementSide]

  const staticSide = {
    top: 'bottom',
    right: 'left',
    bottom: 'top',
    left: 'right',
  }[finalPlacementSide]

  const transformOrigin = {
    top: 'top center',
    right: 'center right',
    bottom: 'bottom center',
    left: 'center left',
  }[staticSide]

  return (
    <>
      {cloneElement(
        children,
        getReferenceProps({ ref: childrenRef, ...children.props })
      )}
      <WrapWithIf
        condition={portal}
        wrapper={
          <FloatingPortal
            id={theme.portals.default.id}
            {...portalProps}
          />
        }
      >
        <CSSTransition
          in={isOpen}
          appear
          timeout={250}
          mountOnEnter
          unmountOnExit
        >
          <Tip
            ref={floating}
            caption
            color="text-light"
            borderRadius="medium"
            paddingVertical="xsmall"
            paddingHorizontal="small"
            backgroundColor="fill-two"
            boxShadow={theme.boxShadows.moderate}
            userSelect="none"
            style={{
              position: finalStrategy,
              left: x ?? 0,
              top: y ?? 0,
            }}
            transformOrigin={transformOrigin}
            zIndex={theme.zIndexes.tooltip}
            pointerEvents="none"
            {...props}
            {...getFloatingProps()}
          >
            {label}
            {showArrow && (
              <Div
                ref={arrowRef}
                style={{
                  position: 'absolute',
                  top: middlewareData?.arrow?.y || '',
                  left: middlewareData?.arrow?.x || '',
                  [staticSide]: `-${ARROW_WIDTH}px`,
                }}
                width={ARROW_WIDTH}
                height={ARROW_WIDTH}
                transform={`rotate(${arrowRotation}deg)`}
                {...arrowProps}
              >
                <TooltipArrow
                  position="absolute"
                  top={0}
                  left={0}
                  size={ARROW_WIDTH}
                  color="fill-two"
                />
              </Div>
            )}
          </Tip>
        </CSSTransition>
      </WrapWithIf>
    </>
  )
}

export default Tooltip
export type { TooltipProps }
