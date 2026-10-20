import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { createGlobalStyle } from 'styled-components'

import { type ColorMode, colorVarsForMode } from './palette'

// Matches the design system's COLOR_THEME_KEY, so its [data-theme-mode]
// selectors and ours agree on the active mode.
export const COLOR_MODE_KEY = 'theme-mode'
const ATTR = `data-${COLOR_MODE_KEY}`
export const DEFAULT_COLOR_MODE: ColorMode = 'light'

const isColorMode = (v: unknown): v is ColorMode =>
  v === 'light' || v === 'dark'

// Runs in <head> before first paint: honor a saved choice, else the default.
// Keeps static pages from flashing the wrong theme.
export const colorModeScript = `(function(){try{var k='${COLOR_MODE_KEY}';var m=localStorage.getItem(k);if(m!=='light'&&m!=='dark'){m='${DEFAULT_COLOR_MODE}'}document.documentElement.setAttribute('${ATTR}',m)}catch(e){}})()`

// Doubled :root out-specifies the design system's own per-mode variables.
export const DocsColorVars = createGlobalStyle`
  html:root:root,
  html[${ATTR}='light']:root:root {
    ${colorVarsForMode('light')}
    color-scheme: light;
  }
  html[${ATTR}='dark']:root:root {
    ${colorVarsForMode('dark')}
    color-scheme: dark;
  }
`

type ColorModeContextValue = {
  mode: ColorMode
  setMode: (mode: ColorMode) => void
  toggle: () => void
}

const ColorModeContext = createContext<ColorModeContextValue>({
  mode: DEFAULT_COLOR_MODE,
  setMode: () => {},
  toggle: () => {},
})

export function ColorModeProvider({ children }: PropsWithChildren) {
  // Server and first client render agree on the default; the real mode (already
  // applied to <html> by colorModeScript) is picked up after hydration.
  const [mode, setModeState] = useState<ColorMode>(DEFAULT_COLOR_MODE)

  useEffect(() => {
    const attr = document.documentElement.getAttribute(ATTR)

    if (isColorMode(attr)) setModeState(attr)
  }, [])

  const setMode = useCallback((next: ColorMode) => {
    document.documentElement.setAttribute(ATTR, next)
    try {
      localStorage.setItem(COLOR_MODE_KEY, next)
    } catch {
      // Storage can be unavailable (private mode); the choice just won't stick.
    }
    setModeState(next)
  }, [])

  const value = useMemo(
    () => ({
      mode,
      setMode,
      toggle: () => setMode(mode === 'dark' ? 'light' : 'dark'),
    }),
    [mode, setMode]
  )

  return (
    <ColorModeContext.Provider value={value}>
      {children}
    </ColorModeContext.Provider>
  )
}

export const useColorMode = () => useContext(ColorModeContext)
