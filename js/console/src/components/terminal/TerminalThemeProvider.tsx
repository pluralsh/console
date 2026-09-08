import { ReactNode, useMemo } from 'react'

import usePersistedState from 'components/hooks/usePersistedState'

import TerminalThemeContext, {
  type TerminalThemeContextValue,
} from './TerminalThemeContext'

const THEME_KEY = 'shell-theme'

function TerminalThemeProvider({ children }: { children: ReactNode }) {
  const [terminalTheme, setTerminalTheme] = usePersistedState<string>(
    THEME_KEY,
    'dark_pastel'
  )
  const terminalThemeValue = useMemo<TerminalThemeContextValue>(
    () => [terminalTheme, setTerminalTheme],
    [terminalTheme, setTerminalTheme]
  )

  return (
    <TerminalThemeContext value={terminalThemeValue}>
      {children}
    </TerminalThemeContext>
  )
}

export default TerminalThemeProvider
