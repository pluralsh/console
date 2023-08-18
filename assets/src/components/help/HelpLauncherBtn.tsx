import { Merge } from 'type-fest'
import styled, { useTheme } from 'styled-components'
import { useVisuallyHidden } from 'react-aria'
import { ComponentProps } from 'react'
import { CaretDownIcon, HelpIcon } from '@pluralsh/design-system'

import { BTN_OVERSHOOT, getHelpSpacing } from './HelpLauncher'
import { CountBadge } from './CountBadge'

export const HelpLauncherButtonsSC = styled.div(({ theme }) => ({
  zIndex: 1,
  display: 'flex',
  gap: theme.spacing.small,
  '&&': {
    pointerEvents: 'none',
  },
  '& > *': {
    pointerEvents: 'auto',
  },
}))
const HelpLauncherBtnCount = styled(CountBadge)(({ count = 0 }) => {
  const translate = count > 10 ? -6 : -5

  return {
    position: 'absolute',
    top: translate,
    left: translate,
  }
})

export const HelpLauncherBtnSC = styled.button(({ theme }) => {
  const helpSpacing = getHelpSpacing(theme)

  return {
    ...theme.partials.reset.button,
    position: 'relative',
    width: helpSpacing.icon.width,
    height: helpSpacing.icon.height + BTN_OVERSHOOT,
    paddingBottom: BTN_OVERSHOOT,
    transform: `translateY(${BTN_OVERSHOOT}px)`,
    background: theme.colors['action-primary'],
    borderStyle: 'solid',
    borderWidth: `1px 1px 0px 1px`,
    borderTopLeftRadius: theme.borderRadiuses.medium,
    borderTopRightRadius: theme.borderRadiuses.medium,
    borderBottomRightRadius: 0,
    borderBottomLeftRadius: 0,
    borderColor: theme.colors['border-primary'],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    boxShadow: theme.boxShadows.moderate,
    transition: 'transform 0.2s ease',

    '&:hover': {
      background: theme.colors['action-primary-hover'],
      transform: `translateY(${BTN_OVERSHOOT - theme.spacing.xsmall / 4}px)`,
    },
    '&:focus-visible': {
      background: theme.colors['action-primary-hover'],
      border: theme.borders['outline-focused'],
    },
  }
})
export function HelpLauncherBtn({
  variant,
  count = 0,
  ...props
}: Merge<
  ComponentProps<typeof HelpLauncherBtnSC>,
  { variant: 'help' | 'minimize'; count?: number }
>) {
  const { visuallyHiddenProps } = useVisuallyHidden()
  const theme = useTheme()
  const iconProps = {
    size: 24,
    color: theme.colors['icon-light'],
  }

  return (
    <HelpLauncherBtnSC {...props}>
      {variant === 'minimize' ? (
        <CaretDownIcon {...iconProps} />
      ) : (
        <HelpIcon {...iconProps} />
      )}
      <span {...visuallyHiddenProps}>Help</span>
      {count > 0 && variant === 'help' && (
        <HelpLauncherBtnCount
          size="medium"
          count={count}
        />
      )}
    </HelpLauncherBtnSC>
  )
}
