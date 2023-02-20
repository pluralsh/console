import { MutableRefObject, useMemo } from 'react'
import { useTheme } from 'styled-components'
import {
  autoUpdate,
  flip,
  offset,
  size,
  useFloating,
} from '@floating-ui/react-dom-interactions'
import { mergeRefs } from 'react-merge-refs'

import { SelectProps } from './Select'

const DEFAULT_MAX_HEIGHT = 230

export function useFloatingDropdown({
  placement,
  triggerRef,
  width,
  maxHeight,
}: Pick<SelectProps, 'placement' | 'width' | 'maxHeight'> & {
  triggerRef: MutableRefObject<any>
}) {
  const theme = useTheme()

  const floating = useFloating({
    placement: `bottom-${placement === 'left' ? 'start' : 'end'}`,
    strategy: 'fixed',
    middleware: [
      offset(theme.spacing.xxsmall),
      size({
        padding: theme.spacing.xxsmall,
        apply(args) {
          const { elements, availableHeight, rects } = args
          const minH = 140
          const maxH
            = typeof maxHeight === 'string'
              ? maxHeight
              : Math.min(availableHeight, maxHeight || DEFAULT_MAX_HEIGHT)

          Object.assign(elements.floating.style, {
            maxWidth:
              typeof width === 'string' && width
                ? width
                : `${
                  typeof width === 'number' ? width : rects.reference.width
                }px`,
            height: `${maxH}px`,
            minHeight: `${minH}px`,
          })
        },
      }),
      flip({
        // flip() padding must be smaller than size() padding to prevent flickering
        // back and forth. This makes padding off by one at some window sizes, but
        // it's a decent trade off for not flickering.
        padding: theme.spacing.xxsmall - 1,
        fallbackStrategy: 'initialPlacement',
      }),
    ],
    whileElementsMounted: autoUpdate,
  })
  const mergedRef = useMemo(() => mergeRefs([floating.reference, triggerRef]),
    [floating.reference, triggerRef])

  return { floating, triggerRef: mergedRef }
}
