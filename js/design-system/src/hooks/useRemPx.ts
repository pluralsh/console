import { useSyncExternalStore } from 'react'

import { getRemPx, REM_BASE_PX, ROOT_FONT_SIZE_STEPS } from '../theme/rem'

function subscribe(onChange: () => void) {
  const queries = ROOT_FONT_SIZE_STEPS.filter(
    ({ minWidth }) => minWidth > 0
  ).map(({ minWidth }) => window.matchMedia(`(min-width: ${minWidth}px)`))

  queries.forEach((q) => q.addEventListener('change', onChange))

  return () => queries.forEach((q) => q.removeEventListener('change', onChange))
}

// Current root font size in px, for JS geometry that must match rem-sized CSS
// (e.g. virtualizer gaps). Multiply a `spacingPx` value by `remPx / REM_BASE_PX`.
export function useRemPx(): number {
  return useSyncExternalStore(subscribe, getRemPx, () => REM_BASE_PX)
}
