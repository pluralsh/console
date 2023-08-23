import { type MutableRefObject, useMemo } from 'react'
import { useTheme } from 'styled-components'
import {
  autoUpdate,
  flip,
  offset,
  size,
  useFloating,
} from '@floating-ui/react-dom-interactions'
import { mergeRefs } from 'react-merge-refs'

import { type SelectProps } from '../components/Select'

export function useFloatingCornerScale({
  placement,
  triggerRef,
}: Pick<SelectProps, 'placement' | 'width' | 'maxHeight'> & {
  triggerRef: MutableRefObject<any>
}) {
  const theme = useTheme()
  const sizePadding = theme.spacing.xxsmall

  // flip() padding must be smaller than size() padding to prevent flickering
  // back and forth. This makes padding off by one at some window sizes, but
  // it's a decent trade off for not flickering.
  const flipPadding = sizePadding - 1

  const floating = useFloating({
    placement,
    strategy: 'fixed',
    middleware: [
      offset(theme.spacing.xxsmall),
      size({
        padding: sizePadding,
      }),
      flip({
        padding: flipPadding,
        fallbackStrategy: 'bestFit',
      }),
    ],
    whileElementsMounted: autoUpdate,
  })
  const mergedRef = useMemo(
    () => mergeRefs([floating.reference, triggerRef]),
    [floating.reference, triggerRef]
  )

  return { floating, triggerRef: mergedRef }
}
