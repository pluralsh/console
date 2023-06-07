import { type FlexProps } from 'honorable'
import { type Ref, forwardRef, useCallback, useEffect, useState } from 'react'

import Banner from './Banner'
import Layer, { type LayerPositionType } from './Layer'

export type Severity = 'info' | 'success' | 'error'

type ToastProps = {
  position?: LayerPositionType
  closeTimeout?: number | 'none' | 'default'
  onClose?: () => void
  onCloseComplete?: () => void
  show?: boolean
  severity?: Severity
} & FlexProps

const defaults = {
  closeTimeout: 10000, // 10 seconds
  position: 'bottom-right' as LayerPositionType,
  onClose: () => {},
  onCloseComplete: () => {},
  severity: 'info' as Severity,
}

const Toast = forwardRef(
  (
    {
      position = defaults.position,
      closeTimeout: closeTimeoutProp = defaults.closeTimeout,
      onClose = defaults.onClose,
      onCloseComplete = defaults.onCloseComplete,
      severity = defaults.severity,
      children,
      show = true,
      ...props
    }: ToastProps,
    ref: Ref<any>
  ): JSX.Element => {
    const [open, setOpen] = useState(show)
    const close = useCallback(() => {
      setOpen(false)
    }, [setOpen])

    const closeTimeout: 'none' | number =
      closeTimeoutProp === 'none' || +closeTimeoutProp <= 0
        ? 'none'
        : typeof closeTimeoutProp === 'number' &&
          !Number.isNaN(closeTimeoutProp)
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
        open={open}
        position={position}
        onClose={() => {
          onClose()
        }}
        onCloseComplete={() => {
          onCloseComplete()
        }}
        ref={ref}
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
)

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
      severity="error"
      {...props}
    >
      {header}: {error?.graphQLErrors[0]?.message}
    </Toast>
  )
}

export { Toast, GraphQLToast }
