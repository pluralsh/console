import {
  Breadcrumb,
  Input,
  SearchIcon,
  TabPanel,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useDebounce } from '@react-hooks-library/core'
import { VirtualItem } from '@tanstack/react-virtual'
import { GqlError } from 'components/utils/Alert'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import { useSlicePolling } from 'components/utils/tableFetchHelpers'
import { Title1H1 } from 'components/utils/typography/Text'
import { usePolicyConstraintsQuery } from 'generated/graphql'
import { ComponentProps, useCallback, useRef, useState } from 'react'
import { POLICIES_REL_PATH } from 'routes/policiesRoutesConsts'
import styled from 'styled-components'
import { extendConnection } from 'utils/graphql'

import { PoliciesTable } from './PoliciesTable'
import PoliciesViolationsGauge from './PoliciesViolationsGauge'
import PoliciesFilter from './PoliciesFilter'

const breadcrumbs: Breadcrumb[] = [
  { label: `${POLICIES_REL_PATH}`, url: `/${POLICIES_REL_PATH}` },
]

const POLICIES_QUERY_PAGE_SIZE = 100

export const POLL_INTERVAL = 10_000

export const POLICIES_REACT_VIRTUAL_OPTIONS: ComponentProps<
  typeof Table
>['reactVirtualOptions'] = {
  overscan: 10,
}

function Policies() {
  const [searchString, setSearchString] = useState('')
  const [selectedKinds, setSelectedKinds] = useState<(string | null)[]>([])
  const [selectedNamespaces, setSelectedNamespaces] = useState<
    (string | null)[]
  >([])
  const [selectedClusters, setSelectedClusters] = useState<(string | null)[]>(
    []
  )

  const debouncedSearchString = useDebounce(searchString, 100)
  const tabStateRef = useRef<any>(null)

  const [virtualSlice, setVirtualSlice] = useState<
    | {
        start: VirtualItem | undefined
        end: VirtualItem | undefined
      }
    | undefined
  >()

  useSetBreadcrumbs(breadcrumbs)

  const queryResult = usePolicyConstraintsQuery({
    variables: {
      ...(debouncedSearchString ? { q: debouncedSearchString } : {}),
      first: POLICIES_QUERY_PAGE_SIZE,
      ...(selectedKinds.length ? { kinds: selectedKinds } : {}),
      ...(selectedNamespaces.length ? { namespaces: selectedNamespaces } : {}),
      ...(selectedClusters.length ? { clusters: selectedClusters } : {}),
    },
    fetchPolicy: 'cache-and-network',
    // Important so loading will be updated on fetchMore to send to Table
    notifyOnNetworkStatusChange: true,
  })
  const {
    error,
    fetchMore,
    loading,
    data: currentData,
    previousData,
  } = queryResult
  const data = currentData || previousData
  const policies = data?.policyConstraints?.edges
  const pageInfo = data?.policyConstraints?.pageInfo
  const { refetch } = useSlicePolling(queryResult, {
    virtualSlice,
    pageSize: POLICIES_QUERY_PAGE_SIZE,
    key: 'policyConstraints',
    interval: POLL_INTERVAL,
  })

  const fetchNextPage = useCallback(() => {
    if (!pageInfo?.endCursor) {
      return
    }
    fetchMore({
      variables: { after: pageInfo.endCursor },
      updateQuery: (prev, { fetchMoreResult }) =>
        extendConnection(
          prev,
          fetchMoreResult.policyConstraints,
          'policyConstraints'
        ),
    })
  }, [fetchMore, pageInfo?.endCursor])

  if (error) {
    return <GqlError error={error} />
  }
  if (!data) {
    return <LoadingIndicator />
  }

  return (
    <PoliciesContainer>
      <div className="title">
        <Title1H1>Policies</Title1H1>
      </div>
      <div className="filter">
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
        />
      </div>
      <div className="violations">
        {policies && policies?.length > 0 && (
          <PoliciesViolationsGauge
            clustersWithViolations={
              policies?.filter((pol) => pol?.node?.violationCount).length || 0
            }
            totalClusters={policies?.length || 0}
          />
        )}
      </div>
      <div className="table">
        <TabPanel
          stateRef={tabStateRef}
          css={{ height: '100%', overflow: 'hidden' }}
        >
          <FullHeightTableWrap>
            <PoliciesTable
              data={data || []}
              refetch={refetch}
              fetchNextPage={fetchNextPage}
              loading={loading}
              setVirtualSlice={setVirtualSlice}
            />
          </FullHeightTableWrap>
        </TabPanel>
      </div>
    </PoliciesContainer>
  )
}

export default Policies

const PoliciesContainer = styled.div(({ theme }) => ({
  padding: theme.spacing.large,
  backgroundColor: theme.colors['fill-zero'],
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 230px',
  gridTemplateRows: 'auto auto auto 1fr',
  gap: '16px 16px',
  gridAutoFlow: 'row',
  gridTemplateAreas: `
    "title title title"
    "search search filter"
    "violations violations filter"
    "table table filter"
  `,
  '.title': {
    gridArea: 'title',
  },
  '.filter': {
    gridArea: 'filter',
  },
  '.search': {
    gridArea: 'search',
  },
  '.violations': {
    gridArea: 'violations',
  },
  '.table': {
    gridArea: 'table',
  },
}))
