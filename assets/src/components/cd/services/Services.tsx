import {
  ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  Chip,
  EmptyState,
  TabPanel,
  Table,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useNavigate } from 'react-router'
import { useTheme } from 'styled-components'
import type { Row, TableState } from '@tanstack/react-table'
import isEmpty from 'lodash/isEmpty'
import { useDebounce } from '@react-hooks-library/core'
import {
  AuthMethod,
  type ServiceDeploymentsRowFragment,
  useServiceDeploymentsQuery,
} from 'generated/graphql'
import {
  CD_REL_PATH,
  SERVICES_REL_PATH,
  getServiceDetailsPath,
} from 'routes/cdRoutesConsts'
import { createMapperWithFallback } from 'utils/mapping'
import { Edge, extendConnection } from 'utils/graphql'
import { FullHeightTableWrap } from 'components/utils/layout/FullHeightTableWrap'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import { GqlError } from 'components/utils/Alert'

import { QueryResult } from '@apollo/client'

import {
  CD_BASE_CRUMBS,
  POLL_INTERVAL,
  useSetCDHeaderContent,
} from '../ContinuousDeployment'

import {
  ColActions,
  ColCluster,
  ColErrors,
  ColLastActivity,
  ColRef,
  ColRepo,
  ColServiceDeployment,
  ColStatus,
} from './ServicesColumns'
import { DeployService } from './deployModal/DeployService'
import { ServicesFilters } from './ServicesFilters'

export type ServicesCluster = Exclude<
  ServiceDeploymentsRowFragment['cluster'],
  undefined | null
>

const authMethodToLabel = createMapperWithFallback<AuthMethod, string>(
  {
    SSH: 'SSH',
    BASIC: 'Basic',
  },
  'Unknown'
)

const columns = [
  ColServiceDeployment,
  ColCluster,
  ColRepo,
  ColRef,
  ColLastActivity,
  ColStatus,
  ColErrors,
  ColActions,
]

export function AuthMethodChip({
  authMethod,
}: {
  authMethod: AuthMethod | null | undefined
}) {
  return <Chip severity="neutral">{authMethodToLabel(authMethod)}</Chip>
}

// @ts-expect-error
const REACT_VIRTUAL_OPTIONS: ComponentProps<
  typeof Table
>['reactVirtualOptions'] = {
  overscan: 4,
}

const QUERY_PAGE_SIZE = 8

export default function Services() {
  const theme = useTheme()
  const navigate = useNavigate()
  const [clusterId, setClusterId] = useState<string>('')
  const [searchString, setSearchString] = useState()
  const debouncedSearchString = useDebounce(searchString, 100)
  const tabStateRef = useRef<any>(null)

  const queryResult = useServiceDeploymentsQuery({
    variables: {
      ...(clusterId ? { clusterId } : {}),
      q: debouncedSearchString,
      first: QUERY_PAGE_SIZE,
    },
    fetchPolicy: 'cache-and-network',
  })
  const { error, refetch, loading, fetchMore } = queryResult
  const data = queryResult?.data || queryResult?.previousData

  console.log('length', data?.serviceDeployments?.edges?.length)

  // Start hook
  const key = 'serviceDeployments' as const
  const { variables } = queryResult
  const edges = data?.[key]?.edges

  const deps = [
    ...Object.values(queryResult?.variables || {}).flat(),
    queryResult.data?.[key]?.pageInfo?.endCursor,
  ]

  useEffect(() => {
    if (!edges) {
      return
    }
    let intervalId

    if (!loading) {
      intervalId = setInterval(() => {
        const total = edges?.length || 0

        if (!variables) {
          return
        }
        refetch({
          ...(variables || {}),
          first: total,
        }).then((e) => {
          console.log('polled', e?.data?.serviceDeployments?.edges)
        })
      }, POLL_INTERVAL / 5)
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [edges, loading, refetch, variables])

  const pageInfo = data?.serviceDeployments?.pageInfo

  console.log('pageInfo', pageInfo)

  console.log('datalen', data?.serviceDeployments?.edges?.length)
  useSetBreadcrumbs(
    useMemo(
      () => [
        ...CD_BASE_CRUMBS,
        {
          label: 'services',
          url: `/${CD_REL_PATH}/${SERVICES_REL_PATH}`,
        },
      ],
      []
    )
  )

  useSetCDHeaderContent(
    useMemo(() => <DeployService refetch={refetch} />, [refetch])
  )
  const [tableFilters, setTableFilters] = useState<
    Partial<Pick<TableState, 'globalFilter' | 'columnFilters'>>
  >({
    globalFilter: '',
  })

  const reactTableOptions: ComponentProps<typeof Table>['reactTableOptions'] =
    useMemo(
      () => ({
        state: {
          ...tableFilters,
        },
        meta: {
          refetch,
        },
      }),
      [refetch, tableFilters]
    )

  console.log('okay loading', loading)
  console.log('okay data', data?.serviceDeployments?.edges)

  const fetchNextPage = useCallback(() => {
    if (!pageInfo?.endCursor) {
      return
    }
    fetchMore({
      variables: { after: pageInfo.endCursor },
      updateQuery: (prev, { fetchMoreResult }) =>
        extendConnection(
          prev,
          fetchMoreResult.serviceDeployments,
          'serviceDeployments'
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
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.small,
        height: '100%',
      }}
    >
      <ServicesFilters
        serviceDeployments={data?.serviceDeployments}
        setTableFilters={setTableFilters}
        searchString={searchString}
        setSearchString={setSearchString}
        showClusterSelect
        clusterId={clusterId}
        setClusterId={setClusterId}
        tabStateRef={tabStateRef}
      />
      <TabPanel
        stateRef={tabStateRef}
        css={{ height: '100%', overflow: 'hidden' }}
      >
        {!data ? (
          <LoadingIndicator />
        ) : !isEmpty(data?.serviceDeployments?.edges) ? (
          <FullHeightTableWrap>
            <Table
              virtualizeRows
              data={data?.serviceDeployments?.edges || []}
              columns={columns}
              css={{
                maxHeight: 'unset',
                height: '100%',
              }}
              onRowClick={(
                _e,
                { original }: Row<Edge<ServiceDeploymentsRowFragment>>
              ) =>
                navigate(
                  getServiceDetailsPath({
                    clusterId: original.node?.cluster?.id,
                    serviceId: original.node?.id,
                  })
                )
              }
              hasNextPage={pageInfo?.hasNextPage}
              fetchNextPage={fetchNextPage}
              isFetchingNextPage={loading}
              reactTableOptions={reactTableOptions}
              reactVirtualOptions={REACT_VIRTUAL_OPTIONS}
            />
          </FullHeightTableWrap>
        ) : (
          <div css={{ height: '100%' }}>
            {searchString || clusterId ? (
              <EmptyState message="No service deployments match your query." />
            ) : (
              <EmptyState message="Looks like you don't have any service deployments yet." />
            )}
          </div>
        )}
      </TabPanel>
    </div>
  )
}
