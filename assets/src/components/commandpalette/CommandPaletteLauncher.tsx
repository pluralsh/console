import { Chip, Flex } from '@pluralsh/design-system'
import { useHotkeys } from '@saas-ui/use-hotkeys'
import { usePlatform } from 'components/hooks/usePlatform'

import { Body2BoldP } from 'components/utils/typography/Text'
import { use } from 'react'
import CommandHotkeys from './CommandHotkeys'
import { CommandPaletteContext } from './CommandPaletteContext.tsx'
import { CommandPaletteDialog } from './CommandPaletteDialog'
import { useCommandsWithHotkeys } from './commands.ts'

export default function CommandPaletteLauncher() {
  const { modKeyString, keyCombinerString } = usePlatform()
  const commands = useCommandsWithHotkeys()
  const { setCmdkOpen } = use(CommandPaletteContext)

  useHotkeys(['cmd K', 'ctrl K'], () => setCmdkOpen(true))

  return (
    <>
      <Chip
        clickable
        inactive
        onClick={() => setCmdkOpen(true)}
        size="small"
        userSelect="none"
        whiteSpace="nowrap"
      >
        <Flex gap="xxsmall">
          <Body2BoldP $color="text-light">{modKeyString}</Body2BoldP>
          <Body2BoldP $color="text-xlight">{keyCombinerString}K</Body2BoldP>
        </Flex>
      </Chip>
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
