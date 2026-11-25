import { Tooltip } from '@pluralsh/design-system'
import { CountBadge } from 'components/utils/CountBadge'
import { navInteractionFill } from 'components/utils/sidebar/SidebarItem'
import { ComponentPropsWithRef, ReactNode } from 'react'
import styled from 'styled-components'

export type PanelRailTab<T extends string = string> = {
  key: T
  label: string
  icon: ReactNode
  showDot?: boolean
  count?: number
  // a custom corner badge, positioned by the caller
  badge?: ReactNode
}

// A collapsed side panel: its tabs as icons, each opening the panel on it
export function PanelRail<T extends string>({
  tabs,
  onOpen,
}: {
  tabs: PanelRailTab<T>[]
  onOpen: (tab: T) => void
}) {
  return (
    <PanelRailSC>
      {tabs.map((t) => (
        <PanelRailButton
          key={t.key}
          label={t.label}
          showDot={t.showDot}
          count={t.count}
          badge={t.badge}
          tooltipPlacement="left"
          onClick={() => onOpen(t.key)}
        >
          {t.icon}
        </PanelRailButton>
      ))}
    </PanelRailSC>
  )
}

export function PanelRailButton({
  label,
  active = false,
  showDot = false,
  count,
  badge,
  tooltipPlacement = 'bottom',
  children,
  ...props
}: {
  label: string
  active?: boolean
  showDot?: boolean
  count?: number
  badge?: ReactNode
  tooltipPlacement?: 'bottom' | 'left'
} & ComponentPropsWithRef<'button'>) {
  return (
    <Tooltip
      label={label}
      placement={tooltipPlacement}
    >
      <ButtonSC
        type="button"
        aria-label={label}
        aria-pressed={active}
        $active={active}
        {...props}
      >
        {children}
        {badge}
        {showDot && !count && !badge && <DotSC />}
        <CountBadge
          count={count}
          size="small"
          variant="warning"
          css={{ position: 'absolute', top: 1, right: 1 }}
        />
      </ButtonSC>
    </Tooltip>
  )
}

export const PanelRailSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  flexShrink: 0,
  gap: theme.spacing.xxsmall,
  padding: `${theme.spacing.small} ${theme.spacing.xsmall}`,
  borderLeft: theme.borders.default,
  backgroundColor: theme.colors['fill-accent'],
}))

const RAIL_ICON_SIZE = 14

// the same pill as the app sidebar's selected item, in both modes
const ButtonSC = styled.button<{ $active: boolean }>(({ theme, $active }) => {
  const light = theme.mode === 'light'
  const accent = theme.colors['fill-accent']
  return {
    ...theme.partials.reset.button,
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: 32,
    height: 32,
    borderRadius: theme.borderRadiuses.medium,
    color: theme.colors['icon-light'],
    cursor: 'pointer',
    '& svg': { width: RAIL_ICON_SIZE, height: RAIL_ICON_SIZE },
    background: $active
      ? light
        ? navInteractionFill(accent, 0.04)
        : theme.colors['fill-zero-selected']
      : 'transparent',
    '&:hover': {
      background: $active
        ? undefined
        : light
          ? navInteractionFill(accent, 0.025)
          : theme.colors['fill-zero-hover'],
    },
    '&:focus-visible': { outline: theme.borders['outline-focused'] },
  }
})

const DotSC = styled.span(({ theme }) => ({
  position: 'absolute',
  top: 6,
  right: 6,
  width: 6,
  height: 6,
  borderRadius: '50%',
  backgroundColor: theme.colors.yellow[300],
}))
