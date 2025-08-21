import { createContext, ReactNode, useMemo, useState } from 'react'

export enum CommandPaletteTab {
  History = 'History',
  Commands = 'Commands',
}

type CommandPaletteContextType = {
  cmdkOpen: boolean
  setCmdkOpen: (open: boolean, initialTab?: CommandPaletteTab) => void
  initialTab: CommandPaletteTab
}

export const CommandPaletteContext = createContext<CommandPaletteContextType>({
  cmdkOpen: false,
  setCmdkOpen: () => {},
  initialTab: CommandPaletteTab.Commands,
})

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [cmdkOpen, setCmdkOpen] = useState(false)
  const [initialTab, setInitialTab] = useState<CommandPaletteTab>(
    CommandPaletteTab.Commands
  )
  const ctx = useMemo(
    () => ({
      cmdkOpen,
      setCmdkOpen: (open, initialTab) => {
        setCmdkOpen(open)
        setInitialTab(initialTab ?? CommandPaletteTab.Commands)
      },
      initialTab,
    }),
    [cmdkOpen, initialTab]
  )
  return <CommandPaletteContext value={ctx}>{children}</CommandPaletteContext>
}
