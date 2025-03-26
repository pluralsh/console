import { Chip, SearchIcon } from '@pluralsh/design-system'
import { useCallback, useState } from 'react'
import { usePlatform } from 'components/hooks/usePlatform'
import styled, { useTheme } from 'styled-components'
import { useHotkeys } from '@saas-ui/use-hotkeys'

import CommandPaletteDialog from './CommandPaletteDialog'
import { useCommandsWithHotkeys } from './commands'
import CommandHotkeys from './CommandHotkeys'

export const CommandPaletteLauncherSC = styled.button(({ theme }) => ({
  ...theme.partials.reset.button,
  ...theme.partials.text.body2,
  height: theme.spacing.xlarge,
  padding: `${0}px ${theme.spacing.medium}px`,
  background: 'transparent',
  border: theme.borders.input,
  borderRadius: theme.borderRadiuses.medium,
  color: theme.colors['text-xlight'],
  '&, .content': {
    display: 'flex',
    alignItems: 'center',
  },
  gap: theme.spacing.xsmall,
  '.content': {
    display: 'flex',
    gap: theme.spacing.small,
  },
  '&:hover': {
    background: theme.colors['fill-zero'],
  },
  '&:focus, &:focus-visible': {
    outline: 'none',
  },
  '&:focus-visible': {
    border: theme.borders['outline-focused'],
  },
}))

export default function CommandPaletteLauncher() {
  const theme = useTheme()
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
      <CommandPaletteLauncherSC onClick={openCommandPalette}>
        <div className="content">
          <SearchIcon
            size={16}
            color={theme.colors['text-light']}
          />
          <span>Search</span>
          <Chip
            fillLevel={3}
            size="small"
            userSelect="none"
            whiteSpace="nowrap"
          >
            {modKeyString}
            {keyCombinerString}K
          </Chip>
        </div>
      </CommandPaletteLauncherSC>
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
