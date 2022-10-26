import { Layer, LayerPositionType } from 'grommet'
import { FlexProps } from 'honorable'
import {
  Dispatch, Ref, forwardRef, useCallback, useEffect, useState,
} from 'react'

import Banner from './Banner'

export type Severity = 'info' | 'success' | 'error'

type ToastProps = {
  position?: LayerPositionType,
  closeTimeout?: number,
  onClose?: Dispatch<void>,
  severity?: Severity,
} & FlexProps

const defaults = {
  closeTimeout: 10000, // 10 seconds
  position: 'bottom-right' as LayerPositionType,
  onClose: () => {},
  severity: 'info' as Severity,
}

const Toast = forwardRef(({
  position = defaults.position, closeTimeout = defaults.closeTimeout, onClose = defaults.onClose,
  severity = defaults.severity, children, ...props
}: ToastProps, ref:Ref<any>): JSX.Element => {
  const [open, setOpen] = useState(true)
  const close = useCallback(() => {
    setOpen(false)
    onClose()
  }, [setOpen, onClose])

  useEffect(() => {
    const timer = open ? setTimeout(() => close(), closeTimeout) : null

    return () => clearTimeout(timer)
  })

  if (!open) {
    return null
  }

  return (
    <Layer
      position={position}
      plain
      modal={false}
      ref={ref}
    >
      <Banner
        onClose={close}
        severity={severity}
        {...props}
      >
        {children}
      </Banner>
    </Layer>
  )
})

type GraphQLToastProps = {
  error: {graphQLErrors: Array<{message: string}>},
  header: string
} & ToastProps

function GraphQLToast({
  error, header, ...props
}: GraphQLToastProps): JSX.Element {
  return (
    <Toast
      severity="error"
      {...props}
    >{header}: {error?.graphQLErrors[0]?.message}
    </Toast>
  )
}

export { Toast, GraphQLToast }
