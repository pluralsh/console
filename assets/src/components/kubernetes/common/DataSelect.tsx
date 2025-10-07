import {
  createContext,
  ReactNode,
  use,
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react'

import {
  FiltersIcon,
  Flex,
  SearchIcon,
  usePrevious,
} from '@pluralsh/design-system'

import { ExpandedInput, IconExpander } from 'components/utils/IconExpander'

import { useDebounce } from 'usehooks-ts'

import { useNamespaces } from '../Cluster'

import {
  SetURLSearchParams,
  useLocation,
  useSearchParams,
} from 'react-router-dom'
import { FILTER_PARAM, NAMESPACE_PARAM } from '../Navigation'
import { NamespaceFilter } from './NamespaceFilter'

type DataSelectContextT = {
  namespaced: boolean
  setNamespaced: (namespaced: boolean) => void
  namespace: string
  setNamespace: (namespace: string) => void
  filter: string
  setFilter: (filter: string) => void
  setParams: SetURLSearchParams
}

export const DataSelectContext = createContext<DataSelectContextT | undefined>(
  undefined
)

export function DataSelectProvider({ children }: { children: ReactNode }) {
  const [params, setParams] = useSearchParams()
  const [namespaced, setNamespaced] = useState<boolean>(true)

  const setParam = useCallback(
    (key: string, value: string) => {
      const newParams = new URLSearchParams(params)
      if (value) newParams.set(key, value)
      else newParams.delete(key)
      setParams(newParams, { replace: true })
    },
    [params, setParams]
  )

  const ctx = useMemo(
    () => ({
      namespaced,
      setNamespaced,
      namespace: params.get(NAMESPACE_PARAM) ?? '',
      setNamespace: (namespace: string) => setParam(NAMESPACE_PARAM, namespace),
      filter: params.get(FILTER_PARAM) ?? '',
      setFilter: (filter: string) => setParam(FILTER_PARAM, filter),
      setParams,
    }),
    [namespaced, params, setParam, setParams]
  )
  return <DataSelectContext value={ctx}>{children}</DataSelectContext>
}

export function useDataSelect() {
  const ctx = use(DataSelectContext)
  if (!ctx)
    throw new Error('useDataSelect must be used within a DataSelectProvider')
  return ctx
}

export function DataSelectInputs() {
  const namespaces = useNamespaces()
  const { pathname } = useLocation()
  const { namespaced, namespace, setNamespace, filter, setFilter, setParams } =
    useDataSelect()

  const [nsState, setNsState] = useState(namespace)
  const [filterState, setFilterState] = useState(filter)
  const debFilterState = useDebounce(filterState, 200)

  // this kind of logic is generally brittle and bad practice, but likely necessary here
  // need internal filter state for debouncing and performance
  // need internal namespace state so we can persist it across route changes that occur while the component still exists
  // the custom setParams is needed to avoid a race condition when simultaneously calling setFilter and setNamespace
  const routeHasChanged = usePrevious(pathname) !== pathname
  useLayoutEffect(() => {
    if (routeHasChanged) setFilterState('')
    else {
      setParams(
        new URLSearchParams({
          ...(nsState && { [NAMESPACE_PARAM]: nsState }),
          ...(debFilterState && { [FILTER_PARAM]: debFilterState }),
        }),
        { replace: true }
      )
    }
  }, [
    debFilterState,
    nsState,
    routeHasChanged,
    setFilter,
    setNamespace,
    setParams,
  ])

  return (
    <Flex gap="medium">
      <IconExpander
        showIndicator
        icon={<SearchIcon />}
        active={!!filterState}
        onClear={() => {
          setFilterState('')
          setFilter('')
        }}
      >
        <ExpandedInput
          inputValue={filterState}
          onChange={setFilterState}
        />
      </IconExpander>
      {namespaced && (
        <IconExpander
          showIndicator
          icon={<FiltersIcon />}
          active={!!nsState}
          onClear={() => {
            setNsState('')
            setNamespace('')
          }}
        >
          <NamespaceFilter
            namespaces={namespaces}
            namespace={nsState}
            onChange={setNsState}
          />
        </IconExpander>
      )}
    </Flex>
  )
}
