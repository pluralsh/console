import { Chip, SearchIcon } from '@pluralsh/design-system'
import { useCallback, useEffect, useState } from 'react'
import { usePlatform } from 'components/hooks/usePlatform'
import styled, { useTheme } from 'styled-components'

import CommandPalette from './CommandPalette'

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
  const [open, setOpen] = useState(false)

  // Toggle the menu when ⌘K is pressed
  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)

    return () => document.removeEventListener('keydown', down)
  }, [])

  const { modKeyString, keyCombinerString } = usePlatform()
  const openCommandPalette = useCallback(() => setOpen(true), [setOpen])
  const theme = useTheme()

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
      <CommandPalette
        open={open}
        setOpen={setOpen}
      />
    </>
  )
}
