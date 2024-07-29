import { useHotkeys } from '@saas-ui/react'

import { Shortcut } from './shortcuts'

export default function CommandPaletteShortcut({
  shortcut,
}: {
  shortcut: Shortcut
}) {
  useHotkeys(shortcut.hotkeys, shortcut.action)

  return undefined
}
