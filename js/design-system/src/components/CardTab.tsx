import { type ComponentProps, type ReactNode } from 'react'
import styled from 'styled-components'

import {
  type FillLevel,
  toFillLevel,
  useFillLevel,
} from './contexts/FillLevelContext'
import {
  fillToNeutralBgC,
  fillToNeutralBorderC,
  type CardFillLevel,
} from './Card'

type CardTabProps = ComponentProps<'button'> & {
  active?: boolean
  tabFillLevel?: FillLevel
}

type CardTabsProps = ComponentProps<'div'> & {
  children?: ReactNode
}

const CardTabsSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-end',
  gap: theme.spacing.xsmall,
  flexShrink: 0,
  marginBottom: -1,
  position: 'relative',
  zIndex: 1,
}))

const CardTabSC = styled.button<{
  $active: boolean
  $fillLevel: CardFillLevel
}>(({ theme, $active: active, $fillLevel: fillLevel }) => ({
  ...theme.partials.reset.button,
  ...theme.partials.text.buttonMedium,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 'fit-content',
  maxWidth: '100%',
  height: 40,
  padding: `0 ${theme.spacing.medium}px`,
  border: `1px solid ${
    active ? theme.colors[fillToNeutralBorderC[fillLevel]] : 'transparent'
  }`,
  borderBottomColor: active
    ? theme.colors[fillToNeutralBgC[fillLevel]]
    : theme.colors[fillToNeutralBorderC[fillLevel]],
  borderRadius: `${theme.borderRadiuses.medium}px ${theme.borderRadiuses.medium}px 0 0`,
  backgroundColor: active
    ? theme.colors[fillToNeutralBgC[fillLevel]]
    : 'transparent',
  color: theme.colors['text-xlight'],
  '&:focus, &:focus-visible': {
    outline: 'none',
  },
  '&:focus-visible': {
    zIndex: 1,
    borderColor: theme.colors['border-outline-focused'],
  },
  cursor: 'pointer',
  '&:hover': {
    color: theme.colors.text,
    backgroundColor: theme.colors[fillToNeutralBgC[fillLevel]],
  },
}))

function CardTab({
  ref,
  active = false,
  tabFillLevel,
  children,
  ...props
}: CardTabProps) {
  const contextFillLevel = useFillLevel()
  const fillLevel = toFillLevel(
    typeof tabFillLevel === 'number'
      ? Math.max(1, tabFillLevel)
      : Math.max(1, contextFillLevel)
  ) as CardFillLevel

  return (
    <CardTabSC
      ref={ref}
      type="button"
      $active={active}
      $fillLevel={fillLevel}
      {...props}
    >
      {children}
    </CardTabSC>
  )
}

function CardTabs({ children, ...props }: CardTabsProps) {
  return <CardTabsSC {...props}>{children}</CardTabsSC>
}

export { CardTab, CardTabs }
export type { CardTabProps, CardTabsProps }
export default CardTab
