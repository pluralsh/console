import {
  createContext,
  ReactNode,
  use,
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
  useParams,
  useSearchParams,
} from 'react-router-dom'
import { FILTER_PARAM, NAMESPACE_PARAM } from '../Navigation'
import { NamespaceFilter } from './NamespaceFilter'

type DataSelectContextT = {
  namespaced: boolean
  setNamespaced: (namespaced: boolean) => void
  namespace: string
  filter: string
  setParams: SetURLSearchParams
}

export const DataSelectContext = createContext<DataSelectContextT | undefined>(
  undefined
)

export function DataSelectProvider({ children }: { children: ReactNode }) {
  const [params, setParams] = useSearchParams()
  const [namespaced, setNamespaced] = useState<boolean>(true)

  const ctx = useMemo(
    () => ({
      namespaced,
      setNamespaced,
      namespace: params.get(NAMESPACE_PARAM) ?? '',
      filter: params.get(FILTER_PARAM) ?? '',
      setParams,
    }),
    [namespaced, params, setParams]
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
  const { clusterId } = useParams()
  const { namespaced, namespace, filter, setParams } = useDataSelect()

  const [nsState, setNsState] = useState(namespace)
  const [filterState, setFilterState] = useState(filter)
  const debFilterState = useDebounce(filterState, 200)

  // this kind of logic is generally brittle and bad practice, but likely necessary here
  // need internal filter state for debouncing and performance
  // need internal namespace state so we can persist it across route changes that occur while the component still exists (except on cluster change)
  // the custom setParams is needed to avoid a race condition when simultaneously calling setFilter and setNamespace
  const routeHasChanged = (usePrevious(pathname) ?? pathname) !== pathname
  const clusterHasChanged = (usePrevious(clusterId) ?? clusterId) !== clusterId
  useLayoutEffect(() => {
    setParams((params) => {
      if (routeHasChanged) {
        setFilterState('')
        params.delete(FILTER_PARAM)
      } else {
        if (nsState) params.set(NAMESPACE_PARAM, nsState)
        else params.delete(NAMESPACE_PARAM)
        if (debFilterState) params.set(FILTER_PARAM, debFilterState)
        else params.delete(FILTER_PARAM)
      }
      if (clusterHasChanged) {
        setNsState('')
        params.delete(NAMESPACE_PARAM)
      }
      return params
    })
  }, [clusterHasChanged, debFilterState, nsState, routeHasChanged, setParams])

  return (
    <Flex gap="medium">
      <IconExpander
        showIndicator
        icon={<SearchIcon />}
        active={!!filterState}
        onClear={() => setFilterState('')}
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
          onClear={() => setNsState('')}
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
