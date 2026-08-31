import { type Dispatch, type SetStateAction, createContext } from 'react'

export type TerminalThemeContextValue = [
  string,
  Dispatch<SetStateAction<string>>,
]

export default createContext<TerminalThemeContextValue>([
  'dark_pastel',
  () => {},
])
