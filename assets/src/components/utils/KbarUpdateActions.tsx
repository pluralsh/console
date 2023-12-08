import { memo, useRef } from 'react'
import { usePrevious } from '@pluralsh/design-system'
import { useRegisterActions } from 'kbar'

function UseRegisterActions({ actions }) {
  useRegisterActions(actions)

  return null
}

/**
 * Registers actions for kbar, but unlike `useRegisterActions()`, when the value
 * of `actions` changes, kbar will update with the new values.
 *
 * It's important that `actions` is memoized to prevent excessive re-renders.
 */
export const KbarUpdateActions = memo(
  ({ actions }: { actions: Parameters<typeof useRegisterActions>[0] }) => {
    // Increment key any time `actions` changes to force so `useRegisterActions()`
    // to update values for kbar
    const key = useRef(0)
    const prevActions = usePrevious(actions)

    if (prevActions !== actions) {
      key.current = key.current < Number.MAX_SAFE_INTEGER ? key.current + 1 : 0
    }

    return (
      <UseRegisterActions
        key={key.current}
        actions={actions}
      />
    )
  }
)
