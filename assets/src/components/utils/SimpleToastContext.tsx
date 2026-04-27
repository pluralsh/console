import { Toast } from '@pluralsh/design-system'
import {
  ComponentProps,
  createContext,
  ReactNode,
  use,
  useMemo,
  useRef,
  useState,
} from 'react'

type ToastSeverity = ComponentProps<typeof Toast>['severity']

export type SimpleToastPayload = {
  content: ReactNode
  severity?: ToastSeverity
  delayTimeout?: number | 'none'
}

type SimpleToastContextT = {
  popToast: (payload: SimpleToastPayload) => void
  clearToast: () => void
}

const SimpleToastContext = createContext<SimpleToastContextT | null>(null)

const DEFAULT_DELAY_TIMEOUT = 2500

export function useSimpleToast(): SimpleToastContextT {
  const ctx = use(SimpleToastContext)
  if (!ctx)
    throw new Error('useSimpleToast must be used within SimpleToastProvider')

  return ctx
}

export function SimpleToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] =
    useState<Nullable<{ id: number; payload: SimpleToastPayload }>>(null)
  const idRef = useRef(0)

  const value: SimpleToastContextT = useMemo(
    () => ({
      popToast: (payload: SimpleToastPayload) => {
        idRef.current += 1
        setToast({ id: idRef.current, payload })
      },
      clearToast: () => setToast(null),
    }),
    []
  )

  const show = !!toast
  const {
    content,
    severity,
    delayTimeout = DEFAULT_DELAY_TIMEOUT,
  } = toast?.payload ?? {}

  return (
    <SimpleToastContext value={value}>
      {children}
      <Toast
        key={toast?.id}
        show={show}
        closeTimeout={delayTimeout}
        onClose={value.clearToast}
        position="bottom-right"
        margin="large"
        severity={severity}
      >
        {content}
      </Toast>
    </SimpleToastContext>
  )
}
