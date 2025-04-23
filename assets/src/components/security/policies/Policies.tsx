import {
  ArrowScroll,
  Flex,
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
  POLICIES_ABS_PATH,
  POLICIES_REL_PATH,
  SECURITY_ABS_PATH,
  SECURITY_REL_PATH,
} from 'routes/securityRoutesConsts'
import styled from 'styled-components'

import { useSetPageHeaderContent } from 'components/cd/ContinuousDeployment'
import { ExpandedInput, IconExpander } from 'components/utils/IconExpander'
import PoliciesFilter from './PoliciesFilter'
import { PoliciesTable } from './PoliciesTable'
import { CreatePolicyReportButton } from './CreatePolicyReportModal.tsx'
import { PastReportsButton } from './PastReportsModal.tsx'

const breadcrumbs = [
  { label: SECURITY_REL_PATH, url: SECURITY_ABS_PATH },
  { label: POLICIES_REL_PATH, url: POLICIES_ABS_PATH },
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

export function Policies() {
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
          <Flex
            gap={'small'}
            width={250}
          >
            <PastReportsButton />
            <CreatePolicyReportButton />
          </Flex>
        </FiltersWrapperSC>
      </ArrowScroll>
    ),
    [searchString]
  )

  useSetPageHeaderContent(header)

  if (error) return <GqlError error={error} />

  return (
    <PoliciesContainerSC>
      <PoliciesTable
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
      <PoliciesFilter
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
    </PoliciesContainerSC>
  )
}

const FiltersWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing.medium,
  overflow: 'auto',
}))

const PoliciesContainerSC = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: '1fr 250px',
  gap: theme.spacing.medium,
  overflow: 'hidden',
}))
