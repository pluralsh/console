import {
  FillLevelProvider,
  Flex,
  Input,
  SearchIcon,
  SubTab,
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
import PoliciesFilter from './PoliciesFilter'
import { PoliciesTable } from './PoliciesTable'
import { PoliciesViolationsGauge } from './PoliciesViolationsGauge'

const breadcrumbs = [
  { label: SECURITY_REL_PATH, url: SECURITY_ABS_PATH },
  { label: POLICIES_REL_PATH, url: POLICIES_ABS_PATH },
]

export const POLL_INTERVAL = 10_000

export enum ViolationFilter {
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
  const policies = data?.policyConstraints?.edges

  const { data: kindsData } = useViolationStatisticsQuery({
    variables: { field: ConstraintViolationField.Kind },
  })
  const { data: namespacesData } = useViolationStatisticsQuery({
    variables: { field: ConstraintViolationField.Namespace },
  })

  const header = useMemo(
    () => (
      <Flex gap="large">
        <Input
          placeholder="Search policies"
          startIcon={<SearchIcon />}
          value={searchString}
          width="320px"
          onChange={(e) => {
            setSearchString?.(e.currentTarget.value)
          }}
        />
        <FillLevelProvider value={1}>
          <Flex>
            {Object.values(ViolationFilter)?.map((label) => (
              <SubTab
                key={label}
                textValue={label}
                active={violationFilter === label}
                onClick={() => {
                  setViolationFilter(label as ViolationFilter)
                }}
              >
                <Flex gap="small">
                  {label}
                  {/* TODO: add back when back end supports */}
                  {/* <AggregatedPolicyStatsChip
                    violationFilter={label as ViolationFilter}
                    kindsData={kindsData}
                    namespacesData={namespacesData}
                  /> */}
                </Flex>
              </SubTab>
            ))}
          </Flex>
        </FillLevelProvider>
      </Flex>
    ),
    [searchString, violationFilter]
  )

  useSetPageHeaderContent(header)

  if (error) return <GqlError error={error} />

  return (
    <PoliciesContainer>
      <div
        css={{
          gridArea: 'filter',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <PoliciesFilter
          selectedNamespaces={selectedNamespaces}
          setSelectedNamespaces={setSelectedNamespaces}
          selectedKinds={selectedKinds}
          setSelectedKinds={setSelectedKinds}
          selectedClusters={selectedClusters}
          setSelectedClusters={setSelectedClusters}
          kindsData={kindsData}
          namespacesData={namespacesData}
        />
      </div>
      <div css={{ gridArea: 'violations' }}>
        {policies && policies?.length > 0 && (
          <PoliciesViolationsGauge filters={policyQFilters} />
        )}
      </div>
      <div css={{ gridArea: 'table', overflow: 'hidden' }}>
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
      </div>
    </PoliciesContainer>
  )
}

const PoliciesContainer = styled.div(({ theme }) => ({
  display: 'grid',
  overflow: 'hidden',
  gridTemplateColumns: 'auto 250px',
  gridTemplateRows: 'auto 1fr',
  gap: `${theme.spacing.medium}px ${theme.spacing.large}px`,
  gridTemplateAreas: `
    "violations filter"
    "table filter"
  `,
}))
