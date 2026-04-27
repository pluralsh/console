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
  /** Custom content; if omitted, name/action are used to render default action text */
  content?: ReactNode
  prefix?: ReactNode
  suffix?: string
  name?: Nullable<string>
  action?: string
  severity?: ToastSeverity
  delayTimeout?: number | 'none'
  clickable?: boolean
  onClick?: () => void
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
    name,
    action,
    prefix,
    suffix,
    severity,
    delayTimeout = DEFAULT_DELAY_TIMEOUT,
    clickable = false,
    onClick,
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
        <span
          {...(clickable && {
            role: 'button',
            tabIndex: 0,
            onClick,
            onKeyDown: (e) => {
              if (e.key === 'Enter' || e.key === ' ') onClick?.()
            },
          })}
        >
          {content || (
            <>
              {prefix && <span>{prefix} </span>}
              {name && <span>{name} </span>}
              {action}
              {suffix && <span> {suffix}</span>}
            </>
          )}
        </span>
      </Toast>
    </SimpleToastContext>
  )
}
