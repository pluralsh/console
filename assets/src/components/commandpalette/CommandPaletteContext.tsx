import { createContext, ReactNode, useMemo, useState } from 'react'

export enum CommandPaletteTab {
  History = 'Chat history',
  Commands = 'Commands',
}

type CommandPaletteContextType = {
  cmdkOpen: boolean
  setCmdkOpen: (open: boolean, initialTab?: CommandPaletteTab) => void
  docsSearchOpen: boolean
  setDocsSearchOpen: (open: boolean) => void
  initialTab: CommandPaletteTab
}

export const CommandPaletteContext = createContext<CommandPaletteContextType>({
  cmdkOpen: false,
  setCmdkOpen: () => {},
  docsSearchOpen: false,
  setDocsSearchOpen: () => {},
  initialTab: CommandPaletteTab.Commands,
})

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [cmdkOpen, setCmdkOpen] = useState(false)
  const [docsSearchOpen, setDocsSearchOpen] = useState(false)
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
      docsSearchOpen,
      setDocsSearchOpen,
      initialTab,
    }),
    [cmdkOpen, docsSearchOpen, initialTab]
  )
  return <CommandPaletteContext value={ctx}>{children}</CommandPaletteContext>
}
