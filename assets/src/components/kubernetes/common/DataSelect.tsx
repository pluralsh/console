import React, {
  Dispatch,
  SetStateAction,
  createContext,
  useContext,
  useMemo,
  useState,
} from 'react'

import { useTheme } from 'styled-components'

import { useNamespaces } from '../Cluster'

import { NameFilter } from './NameFilter'
import { NamespaceFilter } from './NamespaceFilter'

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

export function DataSelectInputs({
  dataSelect,
}: {
  dataSelect: DataSelectContextT
}) {
  const theme = useTheme()
  const namespaces = useNamespaces()
  const { namespaced, namespace, setNamespace, filter, setFilter } = dataSelect

  return (
    <div
      css={{
        display: 'flex',
        flexGrow: 1,
        gap: theme.spacing.medium,
        justifyContent: 'flex-end',
      }}
    >
      <NameFilter
        value={filter}
        onChange={setFilter}
      />
      {namespaced && (
        <NamespaceFilter
          namespaces={namespaces}
          namespace={namespace}
          onChange={setNamespace}
        />
      )}
    </div>
  )
}
