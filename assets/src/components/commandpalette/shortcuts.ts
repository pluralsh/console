import { useMemo } from 'react'
import { isEmpty } from 'lodash'
import { useTheme } from 'styled-components'

import { useCommands } from './commands'

export type Shortcut = {
  hotkeys: string[]
  action: () => void
}

export function useShortcuts(shortcuts: Shortcut[]) {
  const commands = useCommands()

  return useMemo(
    () =>
      commands
        .map((group) => group.commands)
        .flat()
        .filter(({ shortcuts, disabled }) => !isEmpty(shortcuts) && !disabled)
        .map(
          ({ shortcuts, action }) =>
            ({ hotkeys: shortcuts, action }) as Shortcut
        )
        .concat(shortcuts),
    [commands, shortcuts]
  )
}
