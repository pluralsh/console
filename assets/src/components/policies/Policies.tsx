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
import { ComponentProps, useCallback, useMemo, useRef, useState } from 'react'
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
  const [selectedKind, setSelectedKind] = useState<string>('')
  const [selectedNamespace, setSelectedNamespace] = useState<string>('')
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
      q: debouncedSearchString,
      first: POLICIES_QUERY_PAGE_SIZE,
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

  const filters = useMemo(
    () =>
      policies?.reduce(
        (acc: { kinds: string[]; namespaces: string[] }, policy) => {
          const cluster = policy?.node?.cluster

          if (cluster) {
            if (policy?.node?.violations?.length) {
              policy?.node?.violations?.forEach((violation) => {
                acc.kinds.push(violation?.kind || '')
                acc.namespaces.push(violation?.namespace || '')
              })
            }
          }

          return acc
        },
        { kinds: [], namespaces: [] }
      ),
    [policies]
  )

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
          kinds={filters?.kinds}
          namespaces={filters?.namespaces}
          selectedNamespace={selectedNamespace}
          setSelectedNamespace={setSelectedNamespace}
          selectedKind={selectedKind}
          setSelectedKind={setSelectedKind}
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
        <PoliciesViolationsGauge
          clustersWithViolations={
            policies?.filter((pol) => pol?.node?.violationCount).length || 0
          }
          totalClusters={policies?.length || 0}
        />
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
