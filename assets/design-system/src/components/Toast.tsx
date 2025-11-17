import {
  type ComponentProps,
  type JSX,
  useCallback,
  useEffect,
  useState,
} from 'react'

import { type Severity } from '../types'
import { type Extends } from '../utils/ts-utils'

import Banner, { type BannerProps } from './Banner'
import Layer, { type LayerPositionType } from './Layer'

export type ToastSeverity = Extends<Severity, 'info' | 'success' | 'danger'>

type ToastProps = {
  position?: LayerPositionType
  closeTimeout?: number | 'none' | 'default'
  onClose?: () => void
  onCloseComplete?: () => void
  show?: boolean
  severity?: ToastSeverity
  layerProps?: ComponentProps<'div'>
} & BannerProps

const defaults = {
  closeTimeout: 10000, // 10 seconds
  position: 'bottom-right' as LayerPositionType,
  onClose: () => {},
  onCloseComplete: () => {},
  severity: 'info' as ToastSeverity,
}

function Toast({
  ref,
  position = defaults.position,
  closeTimeout: closeTimeoutProp = defaults.closeTimeout,
  onClose = defaults.onClose,
  onCloseComplete = defaults.onCloseComplete,
  severity = defaults.severity,
  children,
  show = true,
  layerProps,
  ...props
}: ToastProps) {
  const [open, setOpen] = useState(show)
  const close = useCallback(() => {
    setOpen(false)
  }, [setOpen])

  const closeTimeout: 'none' | number =
    closeTimeoutProp === 'none' || +closeTimeoutProp <= 0
      ? 'none'
      : typeof closeTimeoutProp === 'number' && !Number.isNaN(closeTimeoutProp)
      ? closeTimeoutProp
      : defaults.closeTimeout

  useEffect(() => {
    setOpen(show)
  }, [show])

  useEffect(() => {
    if (closeTimeout === 'none') {
      return
    }
    const timer = open ? setTimeout(() => close(), closeTimeout) : null

    return () => clearTimeout(timer)
  }, [close, closeTimeout, open])

  return (
    <Layer
      modal
      open={open}
      position={position}
      onClose={() => {
        onClose()
      }}
      onCloseComplete={() => {
        onCloseComplete()
      }}
      ref={ref}
      {...layerProps}
    >
      <Banner
        onClose={() => setOpen(false)}
        severity={severity}
        {...props}
      >
        {children}
      </Banner>
    </Layer>
  )
}

type GraphQLToastProps = {
  error: { graphQLErrors: Array<{ message: string }> }
  header: string
} & ToastProps

function GraphQLToast({
  error,
  header,
  ...props
}: GraphQLToastProps): JSX.Element {
  return (
    <Toast
      severity="danger"
      {...props}
    >
      {header}: {error?.graphQLErrors[0]?.message}
    </Toast>
  )
}

export { GraphQLToast, Toast }
