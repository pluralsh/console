import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { useDebounce } from '@react-hooks-library/core'
import { GqlError } from 'components/utils/Alert'
import { DisplayButton } from 'components/utils/display/DisplayPanel'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import {
  ConstraintViolationField,
  useViolationStatisticsQuery,
  PolicyConstraintsDocument,
  PolicyConstraintsQuery,
  PolicyConstraintsQueryVariables,
} from 'generated/graphql'
import { useState } from 'react'
import {
  GATEKEEPER_ABS_PATH,
  GATEKEEPER_REL_PATH,
  SECURITY_ABS_PATH,
  SECURITY_REL_PATH,
} from 'routes/securityRoutesConsts'

import { PageSidecarPortal } from 'components/layout/PageLayout'
import {
  PageToolbarPortal,
  ToolbarSearchInput,
} from 'components/layout/PageToolbar'
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
  const [filtersOpen, setFiltersOpen] = useState(false)
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
  const hasActiveFilters =
    violationFilter !== ViolationFilter.All ||
    !!selectedKinds.length ||
    !!selectedNamespaces.length ||
    !!selectedClusters.length

  const { data, loading, error, refetch, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData<
      PolicyConstraintsQuery,
      PolicyConstraintsQueryVariables
    >(
      { query: PolicyConstraintsDocument, keyPath: ['policyConstraints'] },
      policyQFilters
    )

  const { data: kindsData } = useViolationStatisticsQuery({
    variables: { field: ConstraintViolationField.Kind },
  })

  const { data: namespacesData } = useViolationStatisticsQuery({
    variables: { field: ConstraintViolationField.Namespace },
  })

  return (
    <>
      <PageToolbarPortal>
        <ToolbarSearchInput
          placeholder="Search policies"
          value={searchString}
          onChange={setSearchString}
        />
        <DisplayButton
          showDot={hasActiveFilters}
          expanded={filtersOpen}
          onClick={() => setFiltersOpen(!filtersOpen)}
        />
      </PageToolbarPortal>
      {filtersOpen && (
        <PageSidecarPortal>
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
        </PageSidecarPortal>
      )}
      {error ? (
        <GqlError error={error} />
      ) : (
        <GatekeeperTable
          fullHeightWrap
          data={data}
          loading={loading}
          refetch={refetch}
          fetchNextPage={fetchNextPage}
          setVirtualSlice={setVirtualSlice}
          resetFilters={() => {
            setSearchString('')
            setViolationFilter(ViolationFilter.All)
            setSelectedKinds([])
            setSelectedNamespaces([])
            setSelectedClusters([])
          }}
        />
      )}
    </>
  )
}
