import { Merge } from 'type-fest'
import styled from 'styled-components'
import {
  CaretDownIcon,
  HelpIcon,
  IconFrame,
  IconFrameProps,
} from '@pluralsh/design-system'

import { BTN_OVERSHOOT, getHelpSpacing } from './HelpLauncher'
import { CountBadge } from './CountBadge'

export const HelpLauncherButtonsSC = styled.div(({ theme }) => ({
  zIndex: 1,
  display: 'flex',
  gap: theme.spacing.small,
  '&&': { pointerEvents: 'none' },
  '& > *': { pointerEvents: 'auto' },
}))

export const HelpLauncherBtnSC = styled.button(({ theme }) => {
  const helpSpacing = getHelpSpacing(theme)

  return {
    ...theme.partials.reset.button,
    position: 'relative',
    width: helpSpacing.icon.width,
    height: helpSpacing.icon.height + BTN_OVERSHOOT,
    paddingBottom: BTN_OVERSHOOT,
    transform: `translateY(${BTN_OVERSHOOT}px)`,
    background: theme.colors['fill-three'],
    borderStyle: 'solid',
    borderWidth: `1px 1px 0px 1px`,
    borderTopLeftRadius: theme.borderRadiuses.medium,
    borderTopRightRadius: theme.borderRadiuses.medium,
    borderBottomRightRadius: 0,
    borderBottomLeftRadius: 0,
    borderColor: theme.colors['fill-three'],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    boxShadow: theme.boxShadows.moderate,
    transition: 'transform 0.2s ease',

    '&:hover': {
      background: theme.colors['fill-three-hover'],
      transform: `translateY(${BTN_OVERSHOOT - theme.spacing.xsmall / 4}px)`,
    },
    '&:focus-visible': {
      background: theme.colors['fill-three-hover'],
      border: theme.borders['outline-focused'],
    },
  }
})
export function HelpLauncherBtn({
  variant,
  count = 0,
  ...props
}: Merge<
  Omit<IconFrameProps, 'icon'>,
  { variant: 'help' | 'minimize'; count?: number }
>) {
  const translate = count > 10 ? -7 : -6

  return (
    <div css={{ position: 'relative' }}>
      <IconFrame
        type="secondary"
        icon={variant === 'minimize' ? <CaretDownIcon /> : <HelpIcon />}
        tooltip="Help"
        {...props}
      />
      {count > 0 && variant === 'help' && (
        <CountBadge
          size="medium"
          count={count}
          css={{
            position: 'absolute',
            top: translate,
            right: translate,
          }}
        />
      )}
    </div>
  )
}
