import { useCallback, useMemo, useState } from 'react'
import { Card, EmptyState, useSetBreadcrumbs } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import isEmpty from 'lodash/isEmpty'

import { usePipelinesQuery } from 'generated/graphql'

import LoadingIndicator from 'components/utils/LoadingIndicator'

import uniqWith from 'lodash/uniqWith'

import { Connection, PaginatedResult } from 'utils/graphql'

import { NetworkStatus } from '@apollo/client'

import { CD_BASE_CRUMBS, useSetCDHeaderContent } from '../ContinuousDeployment'

import { VirtualList } from './PipelinesColumns'
import { PipelinesFilters } from './PipelinesFilters'

const POLL_INTERVAL = 10 * 1000
const PIPELINES_CRUMBS = [...CD_BASE_CRUMBS, { label: 'pipelines' }]

export default function Pipelines() {
  const theme = useTheme()
  const [filterString, setFilterString] = useState('')
  const { data, error, fetchMore, networkStatus } = usePipelinesQuery({
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
    notifyOnNetworkStatusChange: true,
  })
  const pageInfo = data?.pipelines?.pageInfo

  console.log('filterString', filterString)

  useSetBreadcrumbs(PIPELINES_CRUMBS)

  useSetCDHeaderContent(useMemo(() => <>Pipeline header</>, []))
  const loadNextPage = useCallback(() => {
    if (!pageInfo?.hasNextPage) {
      return
    }
    fetchMore({
      variables: { cursor: pageInfo.endCursor },
      updateQuery: (prev, { fetchMoreResult: { pipelines } }) => {
        const x = extendConnection(prev, pipelines, 'pipelines')

        return x
      },
    })
  }, [fetchMore, pageInfo?.endCursor, pageInfo?.hasNextPage])

  if (error) {
    return <EmptyState message="Looks like you don't have any providers yet." />
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
      <PipelinesFilters setFilterString={setFilterString} />
      {data?.pipelines?.edges && !isEmpty(data?.pipelines?.edges) ? (
        <VirtualList
          data={data.pipelines.edges}
          loadNextPage={loadNextPage}
          hasNextPage={pageInfo?.hasNextPage}
          isLoadingNextPage={networkStatus === NetworkStatus.fetchMore}
          renderer={({ row }) => <Card>{row.node?.name}</Card>}
        />
      ) : (
        <EmptyState message="Looks like you don't have any pipelines yet." />
      )}
    </div>
  )
}

export function extendConnection<
  K extends string,
  T extends Partial<Record<K, (Connection<any> & PaginatedResult<any>) | null>>,
>(prev: T, next: T[K] | null | undefined, key: K) {
  if (!next) {
    return prev
  }
  const { edges, pageInfo } = next || {}
  const uniq = uniqWith(
    [...(prev[key]?.edges ?? []), ...(edges ?? [])],
    (a, b) => (a?.node?.id ? a?.node?.id === b?.node?.id : false)
  )

  return {
    ...prev,
    [key]: {
      ...prev[key],
      pageInfo,
      edges: uniq,
    },
  }
}
