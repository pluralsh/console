import {
  Dispatch,
  SetStateAction,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { FiltersIcon, Flex, SearchIcon } from '@pluralsh/design-system'

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
    <Flex gap="medium">
      <IconExpander
        showIndicator
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
          showIndicator
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
    </Flex>
  )
}
