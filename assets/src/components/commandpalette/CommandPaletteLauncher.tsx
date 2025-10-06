import { Chip } from '@pluralsh/design-system'
import { useHotkeys } from '@saas-ui/use-hotkeys'
import { usePlatform } from 'components/hooks/usePlatform'

import { use } from 'react'
import styled from 'styled-components'
import CommandHotkeys from './CommandHotkeys'
import {
  CommandPaletteContext,
  CommandPaletteTab,
} from './CommandPaletteContext.tsx'
import { CommandPaletteDialog } from './CommandPaletteDialog'
import { useCommandsWithHotkeys } from './commands.ts'

export function CommandPaletteLauncher() {
  const { modKeyString, keyCombinerString } = usePlatform()
  const commands = useCommandsWithHotkeys()
  const { setCmdkOpen } = use(CommandPaletteContext)

  useHotkeys(['cmd K', 'ctrl K'], () =>
    setCmdkOpen(true, CommandPaletteTab.Commands)
  )

  return (
    <>
      <CmdKChipSC
        clickable
        onClick={() => setCmdkOpen(true, CommandPaletteTab.Commands)}
      >
        {modKeyString}
        {keyCombinerString}K
      </CmdKChipSC>
      <CommandPaletteDialog />
      {commands.map(({ label, hotkeys, callback, options, deps }) => (
        <CommandHotkeys
          key={`${label}-${hotkeys[0]}`}
          hotkeys={hotkeys}
          callback={callback}
          options={options}
          deps={deps}
        />
      ))}
    </>
  )
}

const CmdKChipSC = styled(Chip)(({ theme }) => ({
  transition: 'background 0.16s ease-in-out',

  background: theme.colors['fill-accent'],
  '&& *': { color: theme.colors['text-xlight'] },
  '&:hover': { background: theme.colors['fill-zero'] },
}))
