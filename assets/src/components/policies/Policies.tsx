import {
  Breadcrumb,
  Chip,
  Input,
  SearchIcon,
  SubTab,
  TabList,
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
import { Cluster, usePolicyConstraintsQuery } from 'generated/graphql'
import { isNil } from 'lodash'
import { ComponentProps, useCallback, useMemo, useRef, useState } from 'react'
import { POLICIES_REL_PATH } from 'routes/policiesRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { extendConnection } from 'utils/graphql'
import { createMapperWithFallback } from 'utils/mapping'

import { PoliciesTable } from './PoliciesTable'
import PoliciesViolationsGauge from './PoliciesViolationsGauge'
import PoliciesFilter from './PoliciesFilter'

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

export const POLICIES_REACT_VIRTUAL_OPTIONS: ComponentProps<
  typeof Table
>['reactVirtualOptions'] = {
  overscan: 10,
}

function Policies() {
  const theme = useTheme()
  const [searchString, setSearchString] = useState('')
  const [selectedCluster, setSelectedCluster] = useState<string>('')
  const [selectedKind, setSelectedKind] = useState<string>('')
  const [selectedNamespace, setSelectedNamespace] = useState<string>('')
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

  const statusCounts = useMemo<
    Record<keyof typeof statusTabs, number | undefined>
  >(
    () => ({
      ALL: policies?.length,
      PASSING: policies?.filter((edge) => edge?.node?.violationCount === 0)
        .length,
      VIOLATIONS: policies?.filter((edge) => edge?.node?.violationCount !== 0)
        .length,
    }),
    [policies]
  )

  const filters = useMemo(
    () =>
      policies?.reduce(
        (
          acc: { clusters: Cluster[]; kinds: string[]; namespaces: string[] },
          policy
        ) => {
          const cluster = policy?.node?.cluster

          if (cluster) {
            acc.clusters.push(cluster as Cluster)
            if (policy?.node?.violations?.length) {
              policy?.node?.violations?.forEach((violation) => {
                acc.kinds.push(violation?.kind || '')
                acc.namespaces.push(violation?.namespace || '')
              })
            }
          }

          return acc
        },
        { clusters: [], kinds: [], namespaces: [] }
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
          clusters={filters?.clusters}
          kinds={filters?.kinds}
          namespaces={filters?.namespaces}
          selectedNamespace={selectedNamespace}
          setSelectedNamespace={setSelectedNamespace}
          selectedKind={selectedKind}
          setSelectedKind={setSelectedKind}
          selectedCluster={selectedCluster}
          setSelectedCluster={setSelectedCluster}
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
      <div
        className="tabs"
        css={{
          justifySelf: 'end',
          '.statusTab': {
            display: 'flex',
            gap: theme.spacing.small,
            alignItems: 'center',
          },
        }}
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
      <div className="violations">
        <PoliciesViolationsGauge
          clustersWithViolations={
            policies?.filter((pol) => pol?.node?.violationCount).length || 0
          }
          totalClusters={policies?.length || 0}
        />
      </div>
      <div className="enforcement" />
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
