import { FC, ReactNode } from 'react'

import { CssBaseline, ThemeProvider, ThemeProviderProps } from 'honorable'

import { useScalePreset } from '../components/contexts/ScalePresetContext'
import { useScaledThemes } from '../hooks/useScaledThemes'

const TypedHonorableThemeProvider = ThemeProvider as FC<ThemeProviderProps>
const TypedCssBaseline = CssBaseline as any

export default function HonorableThemeProvider({
  children,
}: {
  children: ReactNode
}) {
  const { scaleId } = useScalePreset()
  const { honorableTheme } = useScaledThemes(scaleId)

  return (
    <TypedHonorableThemeProvider theme={honorableTheme}>
      <TypedCssBaseline />
      {children}
    </TypedHonorableThemeProvider>
  )
}
