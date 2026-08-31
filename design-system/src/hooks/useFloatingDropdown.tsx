import { type RefCallback, type RefObject, useMemo } from 'react'
import { useTheme } from 'styled-components'
import {
  type UseFloatingReturn,
  autoUpdate,
  flip,
  offset,
  size,
  useFloating,
} from '@floating-ui/react'
import { mergeRefs } from 'react-merge-refs'

import { type SelectProps } from '../components/Select'

const DEFAULT_MAX_HEIGHT = 230

export function useFloatingDropdown({
  placement,
  triggerRef,
  width,
  minWidth,
  minHeight = 140,
  maxHeight,
  sizeToContent = false,
  flipFallbackStrategy = 'initialPlacement',
  flipBeforeSize = false,
}: Pick<SelectProps, 'placement' | 'width' | 'maxHeight'> & {
  minHeight?: string | number
  minWidth?: string | number
  /** Grow with content up to maxHeight instead of filling available height. */
  sizeToContent?: boolean
  /** Choose the alternate side with the most available space when neither side fully fits. */
  flipFallbackStrategy?: 'bestFit' | 'initialPlacement'
  /** Determine placement before constraining height to the available space. */
  flipBeforeSize?: boolean
  triggerRef: RefObject<any>
}): {
  floating: UseFloatingReturn
  triggerRef: RefCallback<any>
} {
  const theme = useTheme()
  const sizePadding = theme.spacing.xxsmall

  // flip() padding must be smaller than size() padding to prevent flickering
  // back and forth. This makes padding off by one at some window sizes, but
  // it's a decent trade off for not flickering.
  const flipPadding = sizePadding - 1

  const sizeMiddleware = size({
    padding: sizePadding,
    apply(args: any) {
      const { elements, availableHeight, rects } = args
      const maxW =
        typeof width === 'string' && width
          ? width
          : `${typeof width === 'number' ? width : rects.reference.width}px`
      const minW =
        typeof minWidth === 'string' && minWidth
          ? minWidth === 'reference'
            ? `${rects.reference.width}px`
            : minWidth
          : typeof minWidth === 'number'
            ? `${minWidth}px`
            : null
      const maxH =
        typeof maxHeight === 'string' && maxHeight
          ? maxHeight
          : `${Math.min(
              availableHeight,
              typeof maxHeight === 'number' ? maxHeight : DEFAULT_MAX_HEIGHT
            )}px`
      const minH =
        typeof minHeight === 'string' && minHeight
          ? minHeight
          : typeof minHeight === 'number'
            ? `${minHeight}px`
            : null

      Object.assign(elements.floating.style, {
        maxWidth: maxW,
        ...(minW ? { minWidth: minW } : {}),
        ...(minH ? { minHeight: minH } : {}),
        ...(sizeToContent
          ? { height: 'auto', maxHeight: maxH }
          : maxH
            ? { height: maxH }
            : {}),
      })
    },
  })
  const flipMiddleware = flip({
    padding: flipPadding,
    fallbackStrategy: flipFallbackStrategy,
  })

  const floating = useFloating({
    placement: `bottom-${placement === 'left' ? 'start' : 'end'}`,
    strategy: 'fixed',
    middleware: [
      offset(theme.spacing.xxsmall),
      ...(flipBeforeSize
        ? [flipMiddleware, sizeMiddleware]
        : [sizeMiddleware, flipMiddleware]),
    ],
    whileElementsMounted: autoUpdate,
  })
  const mergedRef = useMemo(
    () => mergeRefs([floating.refs.setReference, triggerRef]),
    [floating.refs.setReference, triggerRef]
  )

  return { floating, triggerRef: mergedRef }
}
