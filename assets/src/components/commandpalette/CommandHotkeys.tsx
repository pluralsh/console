import { UseHotkeysOptions, useHotkeys } from '@saas-ui/use-hotkeys'
import merge from 'lodash/merge'

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
  useHotkeys(hotkeys, callback, merge({ targetElement: window }, options), deps)

  return undefined
}
