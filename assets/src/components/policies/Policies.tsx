import {
  Breadcrumb,
  Input,
  SearchIcon,
  SubTab,
  TabList,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import { usePolicyConstraintsQuery } from 'generated/graphql'
import { useRef, useState } from 'react'
import { POLICIES_REL_PATH } from 'routes/policiesRoutesConsts'
import styled from 'styled-components'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import { Overline } from 'components/cd/utils/PermissionsModal'
import { useDebounce } from '@react-hooks-library/core'

import PoliciesFilter from './PoliciesFilter'
import { PoliciesTable } from './PoliciesTable'
import { PoliciesViolationsGauge } from './PoliciesViolationsGauge'

const breadcrumbs: Breadcrumb[] = [
  { label: `${POLICIES_REL_PATH}`, url: `/${POLICIES_REL_PATH}` },
]

export const POLL_INTERVAL = 10_000

enum ViolationFilter {
  All = 'All',
  Passing = 'Passing',
  Violated = 'Violated',
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

export function Policies() {
  const tabStateRef = useRef<any>(null)
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
      {
        queryHook: usePolicyConstraintsQuery,
        keyPath: ['policyConstraints'],
      },
      policyQFilters
    )

  const policies = data?.policyConstraints?.edges

  useSetBreadcrumbs(breadcrumbs)

  if (error) return <GqlError error={error} />

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
      <div className="search">
        <Input
          placeholder="Search policies"
          startIcon={<SearchIcon />}
          value={searchString}
          onChange={(e) => {
            setSearchString?.(e.currentTarget.value)
          }}
          flexGrow={0.5}
        />
        <TabList
          stateRef={tabStateRef}
          stateProps={{
            orientation: 'horizontal',
            selectedKey: violationFilter,
            onSelectionChange: (key) => {
              setViolationFilter(key as ViolationFilter)
            },
          }}
        >
          {Object.values(ViolationFilter)?.map((label) => (
            <SubTab
              key={label}
              textValue={label}
              className="statusTab"
            >
              {label}
            </SubTab>
          ))}
        </TabList>
      </div>
      <div className="violations">
        {policies && policies?.length > 0 && (
          <PoliciesViolationsGauge filters={policyQFilters} />
        )}
      </div>
      <div className="table">
        <FullHeightTableWrap>
          <PoliciesTable
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
  gridTemplateRows: 'auto auto 1fr',
  gap: '16px 16px',
  gridTemplateAreas: `
    "search filter"
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
    display: 'flex',
    justifyContent: 'space-between',
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
