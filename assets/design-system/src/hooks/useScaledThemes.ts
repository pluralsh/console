import { useMemo } from 'react'

import {
  getHonorableTheme,
  getStyledTheme,
  styledThemeLight,
  useThemeColorMode,
  type ColorMode,
  type ScalePresetId,
} from '../theme'

export function useScaledThemes(scaleId: ScalePresetId) {
  const colorMode = useThemeColorMode()

  const styledTheme = useMemo(() => {
    const mode = (colorMode === 'light' ? 'light' : 'dark') as ColorMode
    if (mode === 'light') {
      return {
        ...getStyledTheme({ mode: 'light', scaleId }),
        colors: styledThemeLight.colors,
      }
    }
    return getStyledTheme({ mode: 'dark', scaleId })
  }, [colorMode, scaleId])

  const honorableTheme = useMemo(
    () =>
      getHonorableTheme({
        mode: (colorMode === 'light' ? 'light' : 'dark') as ColorMode,
        scaleId,
      }),
    [colorMode, scaleId]
  )

  return { styledTheme, honorableTheme }
}
