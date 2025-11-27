import { FC, ReactNode } from 'react'

import { CssBaseline, ThemeProvider, ThemeProviderProps } from 'honorable'
import { honorableThemeDark, honorableThemeLight, useThemeColorMode } from '..'

// workarounds for broken type from honorable
const TypedHonorableThemeProvider = ThemeProvider as FC<ThemeProviderProps>
const TypedCssBaseline = CssBaseline as any

export default function HonorableThemeProvider({
  children,
}: {
  children: ReactNode
}) {
  const colorMode = useThemeColorMode()

  const honorableTheme =
    colorMode === 'light' ? honorableThemeLight : honorableThemeDark

  return (
    <TypedHonorableThemeProvider theme={honorableTheme}>
      <TypedCssBaseline />
      {children}
    </TypedHonorableThemeProvider>
  )
}
