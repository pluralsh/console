import type { ComponentPropsWithoutRef } from 'react'

import {
  HamburgerMenuCollapsedIcon as MenuCloseIcon,
  HamburgerMenuIcon as MenuOpenIcon,
  MoonIcon,
  SunIcon,
} from '@pluralsh/design-system'

import styled from 'styled-components'

import { useColorMode } from '@src/theme/colorMode'
import { brand } from '@src/theme/docsTheme'
import { mqs } from './Breakpoints'

// Mirrors the marketing site's Button: square-ish 4px corners, Articulat
// medium, hairline border on the secondary variant.
export const HeaderButton = styled.a<{ $variant?: 'primary' | 'secondary' }>(
  ({ theme, $variant = 'secondary' }) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    gap: theme.spacing.xsmall,
    minHeight: 36,
    padding: '0 12px',
    borderRadius: 4,
    fontFamily: theme.fontFamilies.sans,
    fontSize: 14,
    fontWeight: 500,
    lineHeight: 1,
    letterSpacing: '0.01em',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease-out, border-color 0.2s ease-out',
    '&, &:any-link': {
      textDecoration: 'none',
      color: $variant === 'primary' ? brand['on-accent'] : brand.ink,
    },
    ...($variant === 'primary'
      ? {
          background: brand.accent,
          border: '1px solid transparent',
          '&:hover': { background: theme.colors['fill-primary-hover'] },
        }
      : {
          background: brand.surface,
          border: `1px solid ${brand['line-strong']}`,
          '&:hover': { borderColor: brand.subtle },
        }),
    '&:focus-visible': {
      outline: `2px solid ${brand.accent}`,
      outlineOffset: 2,
    },
  })
)

export const IconButton = styled.button((_) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: 36,
  height: 36,
  padding: 0,
  borderRadius: 4,
  border: `1px solid ${brand['line-strong']}`,
  background: brand.surface,
  color: brand.ink,
  cursor: 'pointer',
  transition: 'border-color 0.2s ease-out, color 0.2s ease-out',
  '&:any-link': {
    color: brand.ink,
  },
  '&:hover': {
    borderColor: brand.subtle,
  },
  '&:focus-visible': {
    outline: `2px solid ${brand.accent}`,
    outlineOffset: 2,
  },
}))

export const SocialLink = styled(IconButton).attrs({ as: 'a' })``

export function ThemeToggle(props: ComponentPropsWithoutRef<'button'>) {
  const { mode, toggle } = useColorMode()
  const label = mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'

  return (
    <IconButton
      type="button"
      aria-label={label}
      title={label}
      onClick={toggle}
      {...props}
    >
      {mode === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
    </IconButton>
  )
}

export const HamburgerButtonWrap = styled(IconButton)((_) => ({
  [mqs.fullHeader]: {
    display: 'none',
  },
}))

export function HamburgerButton({
  isOpen,
  ...props
}: { isOpen: boolean } & ComponentPropsWithoutRef<'button'>) {
  return (
    <HamburgerButtonWrap
      type="button"
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
      aria-expanded={isOpen}
      {...props}
    >
      {!isOpen && <MenuOpenIcon size={18} />}
      {isOpen && <MenuCloseIcon size={18} />}
    </HamburgerButtonWrap>
  )
}
