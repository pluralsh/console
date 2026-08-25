import {
  ArrowScroll,
  SearchIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useDebounce } from '@react-hooks-library/core'
import { GqlError } from 'components/utils/Alert'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import {
  ConstraintViolationField,
  usePolicyConstraintsQuery,
  useViolationStatisticsQuery,
} from 'generated/graphql'
import { useMemo, useState } from 'react'
import {
  GATEKEEPER_ABS_PATH,
  GATEKEEPER_REL_PATH,
  SECURITY_ABS_PATH,
  SECURITY_REL_PATH,
} from 'routes/securityRoutesConsts'
import styled from 'styled-components'

import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'
import { ExpandedInput, IconExpander } from 'components/utils/IconExpander'
import GatekeeperFilter from './GatekeeperFilter'
import { GatekeeperTable } from './GatekeeperTable'

const breadcrumbs = [
  { label: SECURITY_REL_PATH, url: SECURITY_ABS_PATH },
  { label: GATEKEEPER_REL_PATH, url: GATEKEEPER_ABS_PATH },
]

export enum ViolationFilter {
  All = 'all',
  Passing = 'passing',
  Violated = 'violations',
}

const violatedParam = (filter: ViolationFilter) => {
  switch (filter) {
    case ViolationFilter.Violated:
      return true
    case ViolationFilter.Passing:
      return false
    case ViolationFilter.All:
    default:
      return undefined
  }
}

export function Gatekeeper() {
  useSetBreadcrumbs(breadcrumbs)
  const [searchString, setSearchString] = useState('')
  const [violationFilter, setViolationFilter] = useState(ViolationFilter.All)
  const [selectedKinds, setSelectedKinds] = useState<(string | null)[]>([])
  const [selectedNamespaces, setSelectedNamespaces] = useState<
    (string | null)[]
  >([])
  const [selectedClusters, setSelectedClusters] = useState<(string | null)[]>(
    []
  )

  const debouncedSearchString = useDebounce(searchString, 100)

  const policyQFilters = {
    ...(debouncedSearchString ? { q: debouncedSearchString } : {}),
    ...(selectedKinds.length ? { kinds: selectedKinds } : {}),
    ...(selectedNamespaces.length ? { namespaces: selectedNamespaces } : {}),
    ...(selectedClusters.length ? { clusters: selectedClusters } : {}),
    violated: violatedParam(violationFilter),
  }

  const { data, loading, error, refetch, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      { queryHook: usePolicyConstraintsQuery, keyPath: ['policyConstraints'] },
      policyQFilters
    )

  const { data: kindsData } = useViolationStatisticsQuery({
    variables: { field: ConstraintViolationField.Kind },
  })

  const { data: namespacesData } = useViolationStatisticsQuery({
    variables: { field: ConstraintViolationField.Namespace },
  })

  const header = useMemo(
    () => (
      <ArrowScroll>
        <FiltersWrapperSC>
          <IconExpander
            tooltip="Search policies"
            icon={<SearchIcon />}
            active={!!searchString}
            onClear={() => setSearchString('')}
          >
            <ExpandedInput
              inputValue={searchString}
              onChange={setSearchString}
              placeholder="Search policies"
            />
          </IconExpander>
        </FiltersWrapperSC>
      </ArrowScroll>
    ),
    [searchString]
  )

  useSetPageHeaderContent(header)

  if (error) return <GqlError error={error} />

  return (
    <GatekeeperContainerSC>
      <GatekeeperTable
        fullHeightWrap
        data={data}
        loading={loading}
        refetch={refetch}
        fetchNextPage={fetchNextPage}
        setVirtualSlice={setVirtualSlice}
        resetFilters={() => {
          setSelectedKinds([])
          setSelectedNamespaces([])
          setSelectedClusters([])
        }}
      />
      <GatekeeperFilter
        violationsFilter={violationFilter}
        setViolationsFilter={setViolationFilter}
        selectedNamespaces={selectedNamespaces}
        setSelectedNamespaces={setSelectedNamespaces}
        selectedKinds={selectedKinds}
        setSelectedKinds={setSelectedKinds}
        selectedClusters={selectedClusters}
        setSelectedClusters={setSelectedClusters}
        kindsData={kindsData}
        namespacesData={namespacesData}
      />
    </GatekeeperContainerSC>
  )
}

const FiltersWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.medium,
  overflow: 'auto',
}))

const GatekeeperContainerSC = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: '1fr 250px',
  gap: theme.spacing.medium,
  overflow: 'hidden',
}))
