import { useDebounce } from '@react-hooks-library/core'
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useState,
} from 'react'

const identity = (x: any) => x

// useState with localStorage persistence
function usePersistedState<T>(
  key: string,
  defaultValue: T,
  debounceMs: number = 0, // optional debounce, if 0 then will persist immediately on state change
  parser = identity
): [T, Dispatch<SetStateAction<T>>] {
  const getLocalStorageValue = useCallback(() => {
    try {
      const item = localStorage.getItem(`plural-${key}`)
      if (item) return parser(JSON.parse(item))
    } catch (_) {
      console.error('Error on localStorage.getItem of', key)
    }
    return defaultValue
  }, [key, defaultValue, parser])

  const [state, setState] = useState<T>(getLocalStorageValue())
  const debouncedState = useDebounce(state, debounceMs)

  useEffect(() => {
    localStorage.setItem(`plural-${key}`, JSON.stringify(debouncedState))
  }, [key, debouncedState, debounceMs])

  return [state, setState]
}

export default usePersistedState
