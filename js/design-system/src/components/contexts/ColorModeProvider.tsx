import {
  ThemeProvider as HonorableThemeProvider,
  type ThemeProviderProps,
} from 'honorable'
import { type ComponentProps, type FC } from 'react'

import styled, { ThemeProvider as StyledThemeProvider } from 'styled-components'

import {
  COLOR_THEME_KEY,
  type ColorMode,
  honorableThemeDark,
  honorableThemeLight,
  styledThemeDark,
  styledThemeLight,
} from '../../theme'

const Wrapper = styled.div``

// workaround for broken type from honorable
const TypedHonorableThemedProvider =
  HonorableThemeProvider as FC<ThemeProviderProps>

export function ColorModeProvider({
  mode = 'dark',
  ...props
}: { mode: ColorMode } & ComponentProps<typeof Wrapper>) {
  return (
    <TypedHonorableThemedProvider
      theme={mode === 'light' ? honorableThemeLight : honorableThemeDark}
    >
      <StyledThemeProvider
        theme={mode === 'light' ? styledThemeLight : styledThemeDark}
      >
        <Wrapper {...{ [`data-${COLOR_THEME_KEY}`]: mode, ...props }} />
      </StyledThemeProvider>
    </TypedHonorableThemedProvider>
  )
}
