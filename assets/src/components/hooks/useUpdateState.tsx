import isEqual from 'lodash/isEqual'
import { useCallback, useMemo, useRef, useState } from 'react'

import { isSubsetEqual } from 'utils/isSubsetEqual'

type IsEqualFn<T = any> = (a: T, b: T) => boolean
type IsEqualFns<T> = Partial<Record<keyof T, IsEqualFn<T[keyof T]>>>

export function useUpdateState<T extends Record<string, unknown>>(
  initialState: T,
  isEqualFns?: IsEqualFns<T>
) {
  const initialStateRef = useRef(initialState)

  initialStateRef.current = initialState
  const [state, setState] = useState({ ...initialStateRef.current })
  const [errors, setErrors] = useState<Partial<Record<keyof T, boolean>>>({})

  const update = useCallback((update: Partial<T>) => {
    setState((s) => {
      if (isSubsetEqual(s, update)) {
        return s
      }

      return { ...s, ...update }
    })
  }, [])

  const reset = useCallback(() => {
    setState({ ...initialStateRef.current })
  }, [])

  const updateErrors = useCallback((update: typeof errors) => {
    setErrors((e) => ({ ...e, ...update }))
  }, [])

  const clearErrors = useCallback(() => setErrors({}), [])

  const hasUpdates = useMemo(() => {
    for (const [key, value] of Object.entries(state)) {
      const isEqualFn = isEqualFns?.[key]

      if (isEqualFn) {
        if (isEqualFn(value as any, initialState[key] as any)) {
          return true
        }
      } else if (!isEqual(value, initialState[key])) {
        return true
      }
    }

    return false
  }, [isEqualFns, initialState, state])

  return {
    state: { ...state },
    hasUpdates,
    update,
    reset,
    initialState: { ...initialState },
    errors,
    updateErrors,
    clearErrors,
  }
}
