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
export const KBarUpdateActions = memo(
  ({ actions }: { actions: Parameters<typeof useRegisterActions>[0] }) => {
    // Increment key any time `actions` changes to force `useRegisterActions()` to update values for kbar
    const key = useRef(Number.MIN_SAFE_INTEGER)
    const prevActions = usePrevious(actions)

    if (prevActions !== actions) {
      key.current =
        key.current < Number.MAX_SAFE_INTEGER
          ? key.current + 1
          : Number.MIN_SAFE_INTEGER
    }

    return (
      <UseRegisterActions
        key={key.current}
        actions={actions}
      />
    )
  }
)
