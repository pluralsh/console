import { ThemeProvider as HonorableThemeProvider } from 'honorable'
import { type ComponentProps } from 'react'

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

export function ColorModeProvider({
  mode = 'dark',
  ...props
}: { mode: ColorMode } & ComponentProps<typeof Wrapper>) {
  return (
    <HonorableThemeProvider
      theme={mode === 'light' ? honorableThemeLight : honorableThemeDark}
    >
      <StyledThemeProvider
        theme={mode === 'light' ? styledThemeLight : styledThemeDark}
      >
        <Wrapper {...{ [`data-${COLOR_THEME_KEY}`]: mode, ...props }} />
      </StyledThemeProvider>
    </HonorableThemeProvider>
  )
}
