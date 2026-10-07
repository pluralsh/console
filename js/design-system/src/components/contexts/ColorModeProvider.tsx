import { type ComponentProps } from 'react'

import styled, { ThemeProvider as StyledThemeProvider } from 'styled-components'

import {
  COLOR_THEME_KEY,
  type ColorMode,
  styledThemeDark,
  styledThemeLight,
} from '../../theme'

const Wrapper = styled.div``

export function ColorModeProvider({
  mode = 'dark',
  ...props
}: { mode: ColorMode } & ComponentProps<typeof Wrapper>) {
  return (
    <StyledThemeProvider
      theme={mode === 'light' ? styledThemeLight : styledThemeDark}
    >
      <Wrapper {...{ [`data-${COLOR_THEME_KEY}`]: mode, ...props }} />
    </StyledThemeProvider>
  )
}
