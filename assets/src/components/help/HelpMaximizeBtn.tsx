import styled, { useTheme } from 'styled-components'
import { useVisuallyHidden } from 'react-aria'
import { ComponentProps } from 'react'
import { CaretUpIcon } from '@pluralsh/design-system'

import { HelpLauncherBtnSC } from './HelpLauncherBtn'
import { BTN_OVERSHOOT } from './HelpLauncher'

const HelpMaximizeBtnSC = styled(HelpLauncherBtnSC)(({ theme }) => ({
  background: theme.colors['fill-two'],
  border: theme.borders['fill-two'],
  '&:hover': {
    background: theme.colors['fill-two-hover'],
    transform: `translateY(${BTN_OVERSHOOT - theme.spacing.xsmall / 2}px)`,
  },
  '&:focus-visible': {
    background: theme.colors['fill-two'],
    border: theme.borders['outline-focused'],
  },
}))

export function HelpMaximizeBtn(
  props: ComponentProps<typeof HelpLauncherBtnSC>
) {
  const { visuallyHiddenProps } = useVisuallyHidden()
  const theme = useTheme()

  return (
    <HelpMaximizeBtnSC {...props}>
      <CaretUpIcon
        size={24}
        color={theme.colors['icon-light']}
      />
      <span {...visuallyHiddenProps}>Maximize help</span>
    </HelpMaximizeBtnSC>
  )
}
