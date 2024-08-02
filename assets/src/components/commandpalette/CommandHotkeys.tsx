import { useHotkeys } from '@saas-ui/react'

import { Command } from './commands'

export default function CommandHotkeys({ command }: { command: Command }) {
  useHotkeys(
    command.hotkeys ?? [],
    command.callback,
    command.options,
    command.deps
  )

  return undefined
}
