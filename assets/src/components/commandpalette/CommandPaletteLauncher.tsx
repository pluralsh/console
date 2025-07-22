import { Chip, Flex } from '@pluralsh/design-system'
import { useHotkeys } from '@saas-ui/use-hotkeys'
import { usePlatform } from 'components/hooks/usePlatform'

import { Body2BoldP } from 'components/utils/typography/Text'
import { useCallback, useState } from 'react'
import CommandHotkeys from './CommandHotkeys'
import CommandPaletteDialog from './CommandPaletteDialog'
import { useCommandsWithHotkeys } from './commands.ts'

export default function CommandPaletteLauncher() {
  const { modKeyString, keyCombinerString } = usePlatform()
  const commands = useCommandsWithHotkeys()
  const [open, setOpen] = useState(false)
  const openCommandPalette = useCallback(
    () => setOpen((open) => !open),
    [setOpen]
  )

  useHotkeys(['cmd K', 'ctrl K'], openCommandPalette)

  return (
    <>
      <Chip
        clickable
        inactive
        onClick={openCommandPalette}
        size="small"
        userSelect="none"
        whiteSpace="nowrap"
      >
        <Flex gap="xxsmall">
          <Body2BoldP $color="text-light">{modKeyString}</Body2BoldP>
          <Body2BoldP $color="text-xlight">{keyCombinerString}K</Body2BoldP>
        </Flex>
      </Chip>
      <CommandPaletteDialog
        open={open}
        setOpen={setOpen}
      />
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
