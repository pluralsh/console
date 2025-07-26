import {
  Dispatch,
  SetStateAction,
  ReactNode,
  useState,
  useMemo,
  createContext,
} from 'react'

export enum CommandPaletteTab {
  History = 'History',
  Commands = 'Commands',
}

type CommandPaletteContextType = {
  cmdkOpen: boolean
  setCmdkOpen: Dispatch<SetStateAction<boolean>>
  initialTab: CommandPaletteTab
  setInitialTab: Dispatch<SetStateAction<CommandPaletteTab>>
}

export const CommandPaletteContext = createContext<CommandPaletteContextType>({
  cmdkOpen: false,
  setCmdkOpen: () => {},
  initialTab: CommandPaletteTab.Commands,
  setInitialTab: () => {},
})

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [cmdkOpen, setCmdkOpen] = useState(false)
  const [initialTab, setInitialTab] = useState<CommandPaletteTab>(
    CommandPaletteTab.Commands
  )
  const ctx = useMemo(
    () => ({
      cmdkOpen,
      initialTab,
      setCmdkOpen,
      setInitialTab,
    }),
    [cmdkOpen, initialTab]
  )
  return <CommandPaletteContext value={ctx}>{children}</CommandPaletteContext>
}
