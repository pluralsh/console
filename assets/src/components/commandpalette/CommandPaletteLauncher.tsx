import { Button, Flex, SearchIcon } from '@pluralsh/design-system'
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
      <InputButtonSC
        small
        secondary
        onClick={() => setCmdkOpen(true, CommandPaletteTab.Commands)}
      >
        <Flex
          gap="xsmall"
          flex={1}
        >
          <SearchIcon />
          <span>Search</span>
        </Flex>
        <CmdKChipSC>
          {modKeyString}
          {keyCombinerString}K
        </CmdKChipSC>
      </InputButtonSC>
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

const CmdKChipSC = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  borderRadius: theme.borderRadiuses.medium,
  border: theme.borders['fill-three'],
  background: theme.colors['fill-zero'],
  padding: `${theme.spacing.xxxsmall}px ${theme.spacing.xsmall}px`,
}))

const InputButtonSC = styled(Button)(({ theme }) => ({
  ...theme.partials.text.caption,
  width: 160,
  height: 20,
  paddingLeft: theme.spacing.small,
  paddingRight: theme.spacing.xsmall,
  justifyContent: 'flex-start',
  gap: theme.spacing.small,
  '& > *': { width: '100%' },
}))
