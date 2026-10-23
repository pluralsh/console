import { UseHotkeysOptions, useHotkeys } from '@saas-ui/use-hotkeys'
import merge from 'lodash/merge'

// Skip hotkeys while typing in any text field or editor, not just plain inputs.
const EDITABLE_SELECTOR =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], .monaco-editor, .xterm'

const isEditableTarget = (target: EventTarget | null) =>
  target instanceof Element && !!target.closest(EDITABLE_SELECTOR)

export default function CommandHotkeys({
  hotkeys,
  callback,
  options,
  deps,
}: {
  hotkeys: string[] | string
  callback: () => void
  options?: UseHotkeysOptions
  deps?: any[]
}) {
  useHotkeys(
    hotkeys,
    (event) => {
      if (!isEditableTarget(event.target)) callback()
    },
    merge({ targetElement: window }, options),
    deps
  )

  return undefined
}
