import {
  Breadcrumb,
  Chip,
  Input,
  SearchIcon,
  SubTab,
  TabList,
  TabPanel,
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
import { isNil } from 'lodash'
import { ComponentProps, useCallback, useMemo, useRef, useState } from 'react'
import { POLICIES_REL_PATH } from 'routes/policiesRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { extendConnection } from 'utils/graphql'
import { createMapperWithFallback } from 'utils/mapping'

const breadcrumbs: Breadcrumb[] = [
  { label: `${POLICIES_REL_PATH}`, url: `/${POLICIES_REL_PATH}` },
]

export const statusTabs = {
  ALL: { label: 'All' },
  PASSING: {
    label: 'Passing',
  },
  VIOLATIONS: {
    label: 'Violations',
  },
} as const

const POLICIES_QUERY_PAGE_SIZE = 100

export const POLL_INTERVAL = 10_000

function Policies() {
  const theme = useTheme()
  const [searchString, setSearchString] = useState('')
  const debouncedSearchString = useDebounce(searchString, 100)
  const tabStateRef = useRef<any>(null)
  const [statusFilter, setStatusFilter] =
    useState<keyof typeof statusTabs>('ALL')
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
  const policies = data?.policyConstraints
  const pageInfo = policies?.pageInfo
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

  const statusCounts = useMemo<
    Record<keyof typeof statusTabs, number | undefined>
  >(
    () => ({
      ALL: policies?.edges?.length,
      PASSING: policies?.edges?.filter(
        (edge) => edge?.node?.violationCount === 0
      ).length,
      VIOLATIONS: policies?.edges?.filter(
        (edge) => edge?.node?.violationCount !== 0
      ).length,
    }),
    [policies?.edges]
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
      <div className="filter" />
      <div className="search">
        <Input
          placeholder="Search"
          startIcon={<SearchIcon />}
          value={searchString}
          onChange={(e) => {
            setSearchString?.(e.currentTarget.value)
          }}
        />
      </div>
      <div
        className="tabs"
        css={{ justifySelf: 'end' }}
      >
        <TabList
          stateRef={tabStateRef}
          stateProps={{
            orientation: 'horizontal',
            selectedKey: statusFilter,
            onSelectionChange: (key) => {
              setStatusFilter(key as keyof typeof statusTabs)
            },
          }}
        >
          {Object.keys(statusTabs)?.map((key) => (
            <SubTab
              key={key}
              textValue={statusTabs[key].label}
              className="statusTab"
            >
              {statusTabs[key].label}
              {!isNil(statusCounts?.[key]) && (
                <Chip
                  size="small"
                  severity={policyStatusToSeverity(
                    key as keyof typeof statusTabs
                  )}
                  loading={isNil(statusCounts?.[key])}
                >
                  {statusCounts?.[key]}
                </Chip>
              )}
            </SubTab>
          ))}
        </TabList>
      </div>
      <div className="violations" />
      <div className="enforcement" />
      <div className="table">
        <TabPanel
          stateRef={tabStateRef}
          css={{ height: '100%', overflow: 'hidden' }}
        >
          <FullHeightTableWrap>
            {/* <ClustersTable
                data={tableData || []}
                refetch={refetch}
                virtualizeRows
                hasNextPage={pageInfo?.hasNextPage}
                fetchNextPage={fetchNextPage}
                isFetchingNextPage={loading}
                reactVirtualOptions={CLUSTERS_REACT_VIRTUAL_OPTIONS}
                onVirtualSliceChange={setVirtualSlice}
              /> */}
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
  gridTemplateColumns: '1fr 1fr 188px',
  gridTemplateRows: '1fr 1fr 1fr 1fr',
  gap: '16px 16px',
  gridAutoFlow: 'row',
  gridTemplateAreas: `
    "title title title"
    "search tabs filter"
    "violations enforcement filter"
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
  '.tabs': {
    gridArea: 'tabs',
  },
  '.violations': {
    gridArea: 'violations',
  },
  '.enforcement': {
    gridArea: 'enforcement',
  },
  '.table': {
    gridArea: 'table',
  },
}))

export const policyStatusToSeverity = createMapperWithFallback<
  keyof typeof statusTabs,
  ComponentProps<typeof Chip>['severity']
>(
  {
    VIOLATIONS: 'critical',
    PASSING: 'success',
    ALL: 'neutral',
  },
  'neutral'
)
