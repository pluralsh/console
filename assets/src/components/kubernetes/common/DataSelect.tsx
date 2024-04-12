import {
  Dispatch,
  SetStateAction,
  createContext,
  useContext,
  useMemo,
  useState,
} from 'react'

export type DataSelectT = {
  namespace: string
  filter: string
}

export type DataSelectContextT = {
  namespaced: boolean
  setNamespaced: Dispatch<SetStateAction<boolean>>
  namespace: string
  setNamespace: Dispatch<SetStateAction<string>>
  filter: string
  setFilter: Dispatch<SetStateAction<string>>
}

export const DataSelect = createContext<DataSelectContextT | undefined>(
  undefined
)

export function useDataSelect(defaults?: DataSelectT) {
  const context = useContext(DataSelect)
  const [namespaced, setNamespaced] = useState<boolean>(false)
  const [namespace, setNamespace] = useState(defaults?.namespace ?? '')
  const [filter, setFilter] = useState(defaults?.filter ?? '')

  return useMemo(
    () =>
      context ?? {
        namespaced,
        setNamespaced,
        namespace,
        setNamespace,
        filter,
        setFilter,
      },
    [
      context,
      namespaced,
      setNamespaced,
      namespace,
      setNamespace,
      filter,
      setFilter,
    ]
  )
}
