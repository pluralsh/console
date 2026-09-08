import type { ComponentPropsWithoutRef } from 'react'

import {
  HamburgerMenuCollapsedIcon as MenuCloseIcon,
  HamburgerMenuIcon as MenuOpenIcon,
} from '@pluralsh/design-system'

import styled from 'styled-components'

import { mqs } from './Breakpoints'

export const ButtonFillTwo = styled.a(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: theme.borderRadiuses.medium,
  color: theme.colors.text,
  border: theme.borders['fill-two'],
  background: theme.colors['fill-two'],
  '&:hover': {
    background: theme.colors['fill-two-hover'],
    cursor: 'pointer',
  },
  '&:focus, &:focus-visible': {
    outline: 'none',
    boxShadow: 'none',
  },
  '&:focus-visible': {
    ...theme.partials.focus.default,
  },
}))

export const SocialLink = styled(ButtonFillTwo)(({ theme }) => ({
  width: theme.spacing.xlarge,
  height: theme.spacing.xlarge,
}))

export const HamburgerButtonWrap = styled(ButtonFillTwo)((_) => ({
  width: 40,
  height: 40,
  alignItems: 'center',
  justifyContent: 'center',
  [mqs.fullHeader]: {
    display: 'none',
  },
}))

export function HamburgerButton({
  isOpen,
  ...props
}: { isOpen: boolean } & ComponentPropsWithoutRef<'a'>) {
  return (
    <HamburgerButtonWrap {...props}>
      {!isOpen && <MenuOpenIcon size={22} />}
      {isOpen && <MenuCloseIcon size={22} />}
    </HamburgerButtonWrap>
  )
}
