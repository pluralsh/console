import { DeepPartial } from '@apollo/client/utilities'
import isEqual from 'lodash/isEqual'
import { useCallback, useMemo, useState } from 'react'

import { isSubsetEqual } from 'utils/isSubsetEqual'

type IsDifferentFn<T = any> = (a: T, b: T) => boolean
type IsDifferentFns<T> = Partial<Record<keyof T, IsDifferentFn<T[keyof T]>>>

export function useUpdateState<T extends Record<string, unknown>>(
  initialState: T,
  isDifferentFns?: IsDifferentFns<T>
) {
  const [state, setState] = useState({ ...initialState })
  const [errors, setErrors] = useState<Partial<Record<keyof T, boolean>>>({})

  const update = useCallback((update: DeepPartial<T>) => {
    setState((s) => {
      if (isSubsetEqual(s, update as Partial<T>)) {
        return s
      }

      return { ...s, ...update }
    })
  }, [])

  const reset = useCallback(() => {
    setState({ ...initialState })
  }, [initialState])

  const updateErrors = useCallback((update: typeof errors) => {
    setErrors((e) => ({ ...e, ...update }))
  }, [])

  const clearErrors = useCallback(() => setErrors({}), [])

  const hasUpdates = useMemo(() => {
    for (const [key, value] of Object.entries(state)) {
      const isDifferentFn = isDifferentFns?.[key]

      if (isDifferentFn) {
        if (isDifferentFn(value as any, initialState[key] as any)) {
          return true
        }
      } else if (!isEqual(value, initialState[key])) {
        return true
      }
    }

    return false
  }, [isDifferentFns, initialState, state])

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
