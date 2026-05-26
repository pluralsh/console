import { FC, ReactNode, useMemo } from 'react'

import { CssBaseline, ThemeProvider, ThemeProviderProps } from 'honorable'
import {
  createHonorableTheme,
  useThemeColorMode,
  useThemeEngineState,
} from '..'
import type { ColorMode } from '../theme'

// workarounds for broken type from honorable
const TypedHonorableThemeProvider = ThemeProvider as FC<ThemeProviderProps>
const TypedCssBaseline = CssBaseline as any

export default function HonorableThemeProvider({
  children,
}: {
  children: ReactNode
}) {
  const colorMode = useThemeColorMode() as ColorMode
  const { engine, presetId, custom } = useThemeEngineState()

  const honorableTheme = useMemo(
    () => createHonorableTheme({ mode: colorMode }),
    // custom is a small object; it only changes when localStorage JSON changes.
    [colorMode, engine, presetId, custom]
  )

  return (
    <TypedHonorableThemeProvider theme={honorableTheme}>
      <TypedCssBaseline />
      {children}
    </TypedHonorableThemeProvider>
  )
}
