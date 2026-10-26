import {
  createContext,
  ReactNode,
  use,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react'

import { NamespaceIcon, usePrevious } from '@pluralsh/design-system'

import { ToolbarSearchInput } from 'components/layout/PageToolbar'
import { useDebounce } from '@react-hooks-library/core'

import { useNamespaces } from '../Cluster'

import {
  SetURLSearchParams,
  useLocation,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import { FILTER_PARAM, NAMESPACE_PARAM } from '../Navigation'
import { NamespaceFilter } from './NamespaceFilter'
import { isEmpty } from 'lodash'

type DataSelectContextT = {
  namespaced: boolean
  setNamespaced: (namespaced: boolean) => void
  namespace: string
  hasNamespaceFilterActive: boolean
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
      hasNamespaceFilterActive: !isEmpty(params.get(NAMESPACE_PARAM)),
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

  const [nsState, setNsState] = useState<string | undefined>(namespace)
  const [filterState, setFilterState] = useState(filter)
  const debFilterState = useDebounce(filterState, 200)

  // this kind of logic is generally brittle and bad practice, but likely necessary here
  // need internal filter state for debouncing and performance
  // need internal namespace state so we can persist it across route changes that occur while the component still exists (except on cluster change)
  // the custom setParams is needed to avoid a race condition when simultaneously calling setFilter and setNamespace
  const routeHasChanged = (usePrevious(pathname) ?? pathname) !== pathname
  const clusterHasChanged = (usePrevious(clusterId) ?? clusterId) !== clusterId
  const [prevRoute, setPrevRoute] = useState({ pathname, clusterId })
  if (prevRoute.pathname !== pathname || prevRoute.clusterId !== clusterId) {
    setPrevRoute({ pathname, clusterId })
    if (prevRoute.pathname !== pathname) setFilterState('')
    if (prevRoute.clusterId !== clusterId) setNsState('')
  }
  useLayoutEffect(() => {
    // setting params navigates, which would cancel a pending index-route
    // redirect, so skip it unless the query would actually change
    const current = new URLSearchParams(window.location.search)
    const hasFilter = !!current.get(FILTER_PARAM)
    const nsMatches = (current.get(NAMESPACE_PARAM) ?? '') === (nsState ?? '')
    const filterMatches = (current.get(FILTER_PARAM) ?? '') === debFilterState
    const unchanged = clusterHasChanged
      ? !current.has(NAMESPACE_PARAM) &&
        (routeHasChanged ? !hasFilter : filterMatches)
      : routeHasChanged
        ? !hasFilter
        : nsMatches && filterMatches
    if (unchanged) return
    setParams((params) => {
      if (routeHasChanged) {
        params.delete(FILTER_PARAM)
      } else {
        if (nsState) params.set(NAMESPACE_PARAM, nsState)
        else params.delete(NAMESPACE_PARAM)
        if (debFilterState) params.set(FILTER_PARAM, debFilterState)
        else params.delete(FILTER_PARAM)
      }
      if (clusterHasChanged) {
        params.delete(NAMESPACE_PARAM)
      }
      return params
    })
  }, [clusterHasChanged, debFilterState, nsState, routeHasChanged, setParams])

  return (
    <>
      <ToolbarSearchInput
        placeholder="Filter by name"
        value={filterState}
        onChange={setFilterState}
      />
      {namespaced && (
        <NamespaceFilter
          namespaces={namespaces}
          namespace={nsState}
          onChange={setNsState}
          startIcon={<NamespaceIcon size={12} />}
          inputProps={{ small: true, placeholder: 'Namespace' }}
          containerProps={{ style: { width: 160 } }}
        />
      )}
    </>
  )
}
