import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useState,
} from 'react'

const identity = (x: any) => x

// useState with sessionStorage persistence
function usePersistedSessionState<T>(
  key: string,
  defaultValue: T,
  parser = identity
): [T, Dispatch<SetStateAction<T>>] {
  const getSessionStorageValue = useCallback(() => {
    try {
      const item = sessionStorage.getItem(`plural-${key}`)

      if (item) return parser(JSON.parse(item))
    } catch (error) {
      console.log('Error on sessionStorage.getItem of', key)
    }

    return defaultValue
  }, [key, defaultValue, parser])

  const [state, setState] = useState<T>(getSessionStorageValue())

  useEffect(() => {
    sessionStorage.setItem(`plural-${key}`, JSON.stringify(state))
  }, [key, state])

  return [state, setState]
}

export default usePersistedSessionState
