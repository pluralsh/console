import type { SemanticColorKey } from '@pluralsh/design-system'
import { createContext, ReactNode, use, useMemo, useRef, useState } from 'react'

import { SimpleToastChip } from 'components/utils/SimpleToastChip'
import { Body2P, StrongSC } from 'components/utils/typography/Text'

export type SimpleToastPayload = {
  /** Custom content; if omitted, name/action/color are used to render default action text */
  content?: ReactNode
  prefix?: ReactNode
  suffix?: string
  name?: Nullable<string>
  action?: string
  color?: SemanticColorKey
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
    color = 'text',
    delayTimeout = DEFAULT_DELAY_TIMEOUT,
    clickable = false,
    onClick,
  } = toast?.payload ?? {}

  return (
    <SimpleToastContext value={value}>
      {children}
      <SimpleToastChip
        key={toast?.id}
        show={show}
        delayTimeout={delayTimeout}
        onClose={value.clearToast}
        clickable={clickable}
        onClick={onClick}
      >
        {content || (
          <Body2P $color="text-light">
            {prefix && <span>{prefix} </span>}
            {name && <StrongSC $color="text">{name} </StrongSC>}
            <StrongSC $color={color}>{action}</StrongSC>
            {suffix && <span> {suffix}</span>}
          </Body2P>
        )}
      </SimpleToastChip>
    </SimpleToastContext>
  )
}
