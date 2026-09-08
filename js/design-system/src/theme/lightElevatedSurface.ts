import type { DefaultTheme } from 'styled-components'

/**
 * Light-mode elevated controls (inputs, selects, cards): soft hairline + slight
 * lift. Shadows alone disappear on white-on-white (modals) and get clipped by
 * overflow:hidden parents — keep a real border so the box always reads.
 */
export function lightElevatedSurface(
  theme: DefaultTheme,
  {
    error = false,
    disabled = false,
  }: {
    error?: boolean
    disabled?: boolean
  } = {}
): Record<string, unknown> | null {
  if (theme.mode !== 'light') return null

  if (error) {
    return {
      border: theme.borders.input,
      borderColor: theme.colors['border-danger'],
      boxShadow: 'none',
    }
  }

  if (disabled) {
    return {
      border: theme.borders.input,
      borderColor: theme.colors['border-disabled'],
      boxShadow: 'none',
    }
  }

  return {
    border: theme.borders.input,
    borderColor: theme.colors['border-input'],
    boxShadow: theme.boxShadows.slight,
  }
}
