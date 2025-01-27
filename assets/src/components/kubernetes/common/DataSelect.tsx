import {
  Dispatch,
  SetStateAction,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { useTheme } from 'styled-components'

import { FiltersIcon, SearchIcon } from '@pluralsh/design-system'

import { ExpandedInput, IconExpander } from 'components/utils/IconExpander'

import { useDebounce } from 'usehooks-ts'

import { useNamespaces } from '../Cluster'

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
  const {
    namespaced,
    namespace,
    setNamespace,
    filter: contextFilter,
    setFilter: setContextFilter,
  } = dataSelect

  const [filter, setFilter] = useState(contextFilter)
  const debouncedFilter = useDebounce(filter, 200)

  useEffect(
    () => setContextFilter(debouncedFilter),
    [debouncedFilter, setContextFilter]
  )

  return (
    <div
      css={{
        display: 'flex',
        gap: theme.spacing.medium,
        justifyContent: 'flex-end',
      }}
    >
      <IconExpander
        icon={<SearchIcon />}
        active={!!filter}
        onClear={() => setFilter('')}
      >
        <ExpandedInput
          inputValue={filter}
          onChange={setFilter}
        />
      </IconExpander>
      {namespaced && (
        <IconExpander
          icon={<FiltersIcon />}
          active={!!namespace}
          onClear={() => setNamespace('')}
        >
          <NamespaceFilter
            namespaces={namespaces}
            namespace={namespace}
            onChange={setNamespace}
          />
        </IconExpander>
      )}
    </div>
  )
}
