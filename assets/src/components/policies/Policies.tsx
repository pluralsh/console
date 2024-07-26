import { Breadcrumb, Table, useSetBreadcrumbs } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import { usePolicyConstraintsQuery } from 'generated/graphql'
import { ComponentProps, useState } from 'react'
import { POLICIES_REL_PATH } from 'routes/policiesRoutesConsts'
import styled from 'styled-components'

import { useFetchPaginatedData } from 'components/cd/utils/useFetchPaginatedData'

import { Overline } from 'components/cd/utils/PermissionsModal'

import PoliciesFilter from './PoliciesFilter'
import { PoliciesTable } from './PoliciesTable'
import { PoliciesViolationsGauge } from './PoliciesViolationsGauge'

const breadcrumbs: Breadcrumb[] = [
  { label: `${POLICIES_REL_PATH}`, url: `/${POLICIES_REL_PATH}` },
]

export const POLICIES_QUERY_PAGE_SIZE = 100

export const POLL_INTERVAL = 10_000

export const POLICIES_REACT_VIRTUAL_OPTIONS: ComponentProps<
  typeof Table
>['reactVirtualOptions'] = {
  overscan: 10,
}

export function Policies() {
  useSetBreadcrumbs(breadcrumbs)
  // const [searchString, setSearchString] = useState('')
  const [selectedKinds, setSelectedKinds] = useState<(string | null)[]>([])
  const [selectedNamespaces, setSelectedNamespaces] = useState<
    (string | null)[]
  >([])
  const [selectedClusters, setSelectedClusters] = useState<(string | null)[]>(
    []
  )

  // const debouncedSearchString = useDebounce(searchString, 100)

  const policyQFilters = {
    // ...(debouncedSearchString ? { q: debouncedSearchString } : {}),
    ...(selectedKinds.length ? { kinds: selectedKinds } : {}),
    ...(selectedNamespaces.length ? { namespaces: selectedNamespaces } : {}),
    ...(selectedClusters.length ? { clusters: selectedClusters } : {}),
  }

  const { data, loading, error, refetch, fetchNextPage, setVirtualSlice } =
    useFetchPaginatedData(
      {
        queryHook: usePolicyConstraintsQuery,
        pageSize: POLICIES_QUERY_PAGE_SIZE,
        keyPath: ['policyConstraints'],
      },
      policyQFilters
    )
  const policies = data?.policyConstraints?.edges

  if (error) {
    return <GqlError error={error} />
  }
  if (!data) {
    return <LoadingIndicator />
  }

  return (
    <PoliciesContainer>
      <div className="filter">
        <Overline>Filters</Overline>
        <PoliciesFilter
          selectedNamespaces={selectedNamespaces}
          setSelectedNamespaces={setSelectedNamespaces}
          selectedKinds={selectedKinds}
          setSelectedKinds={setSelectedKinds}
          selectedClusters={selectedClusters}
          setSelectedClusters={setSelectedClusters}
        />
      </div>
      {/* <div className="search">
        <Input
          placeholder="Search policies"
          startIcon={<SearchIcon />}
          value={searchString}
          onChange={(e) => {
            setSearchString?.(e.currentTarget.value)
          }}
        />
      </div> */}
      <div className="violations">
        {policies && policies?.length > 0 && (
          <PoliciesViolationsGauge filters={policyQFilters} />
        )}
      </div>
      <div className="table">
        <FullHeightTableWrap>
          <PoliciesTable
            data={data || []}
            refetch={refetch}
            fetchNextPage={fetchNextPage}
            loading={loading}
            setVirtualSlice={setVirtualSlice}
            resetFilters={() => {
              setSelectedKinds([])
              setSelectedNamespaces([])
              setSelectedClusters([])
            }}
          />
        </FullHeightTableWrap>
      </div>
    </PoliciesContainer>
  )
}

const PoliciesContainer = styled.div(({ theme }) => ({
  display: 'grid',
  height: '100%',
  overflowY: 'auto',
  padding: theme.spacing.large,
  gridTemplateColumns: 'auto 250px',
  gridTemplateRows: 'auto 1fr',
  gap: '16px 16px',
  gridTemplateAreas: `
    // "search filter"
    "violations filter"
    "table filter"
  `,
  '.title': {
    gridArea: 'title',
  },
  '.filter': {
    gridArea: 'filter',
    minWidth: 'fit-content',
    overflow: 'hidden auto',
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.small,
  },
  '.search': {
    gridArea: 'search',
  },
  '.violations': {
    gridArea: 'violations',
  },
  '.table': {
    gridArea: 'table',
    overflow: 'auto',
  },
}))
