import { useHotkeys } from '@saas-ui/react'

import { CommandWithHotkeys } from './commands'

export default function CommandHotkeys({
  command,
}: {
  command: CommandWithHotkeys
}) {
  useHotkeys(command.hotkeys, command.callback, command.options, command.deps)

  return undefined
}
