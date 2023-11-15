import { useCallback, useMemo, useState } from 'react'
import {
  AppIcon,
  Card,
  EmptyState,
  GitPullIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import styled, { useTheme } from 'styled-components'
import isEmpty from 'lodash/isEmpty'

import { PipelineFragment, usePipelinesQuery } from 'generated/graphql'

import LoadingIndicator from 'components/utils/LoadingIndicator'

import uniqWith from 'lodash/uniqWith'
import { Connection, Edge, PaginatedResult } from 'utils/graphql'

import { NetworkStatus } from '@apollo/client'

import { CD_BASE_CRUMBS } from '../ContinuousDeployment'

import { VirtualList, VirtualListRenderer } from '../../utils/VirtualList'

const POLL_INTERVAL = 10 * 1000
const PIPELINES_CRUMBS = [...CD_BASE_CRUMBS, { label: 'pipelines' }]

const PipelineList = styled(VirtualList)(({ theme }) => ({
  ...theme.partials.reset.list,
  display: 'flex',
  height: '100%',
  width: 200,
  flexShrink: 0,
}))

const PipelineEditAreaSC = styled.div(({ theme }) => ({
  backgroundColor: theme.colors['fill-one'],
  width: '100%',
  height: '100%',
  borderRadius: theme.borderRadiuses.large,
  position: 'relative',
}))

type ListMeta = {
  selectedId: string
  setSelectedId: (string) => void
}

const PipelineListItemSC = styled(Card)(({ theme }) => ({
  '&&': {
    width: '100%',
    padding: theme.spacing.medium,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.medium,
  },
}))
const PipelineListItem: VirtualListRenderer<Edge<PipelineFragment>, ListMeta> =
  // eslint-disable-next-line func-names
  function ({ row, meta }) {
    const theme = useTheme()

    if (!row.node) {
      return null
    }
    const isSelected = row.node.id === meta.selectedId

    return (
      <PipelineListItemSC
        clickable
        selected={isSelected}
      >
        <AppIcon
          type="secondary"
          size="xxsmall"
          icon={
            <GitPullIcon
              color={
                isSelected
                  ? theme.colors['icon-info']
                  : theme.colors['icon-light']
              }
            />
          }
        />
        <div>{row.node?.name}</div>
      </PipelineListItemSC>
    )
  }

export default function Pipelines() {
  const theme = useTheme()
  const { data, error, fetchMore, networkStatus } = usePipelinesQuery({
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
    notifyOnNetworkStatusChange: true,
  })
  const pageInfo = data?.pipelines?.pageInfo
  const pipeEdges = data?.pipelines?.edges
  const [selectedPipeline, setSelectedPipeline] = useState(
    pipeEdges?.[0]?.node?.id ?? ''
  )

  useSetBreadcrumbs(PIPELINES_CRUMBS)

  const loadNextPage = useCallback(() => {
    if (!pageInfo?.hasNextPage) {
      return
    }
    fetchMore({
      variables: { cursor: pageInfo.endCursor },
      updateQuery: (prev, { fetchMoreResult: { pipelines } }) => {
        console.log('more pipelines', pipelines)
        const x = extendConnection(prev, pipelines, 'pipelines')

        return x
      },
    })
  }, [fetchMore, pageInfo?.endCursor, pageInfo?.hasNextPage])

  const meta = useMemo(
    () => ({
      selectedId: selectedPipeline,
      setSelectedId: setSelectedPipeline,
    }),
    [selectedPipeline]
  )

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
      {/* <PipelinesFilters setFilterString={setFilterString} /> */}
      {data?.pipelines?.edges && !isEmpty(data?.pipelines?.edges) ? (
        <div
          css={{ display: 'flex', gap: theme.spacing.medium, height: '100%' }}
        >
          <PipelineList
            data={data.pipelines.edges}
            loadNextPage={loadNextPage}
            hasNextPage={pageInfo?.hasNextPage}
            isLoadingNextPage={networkStatus === NetworkStatus.fetchMore}
            renderer={PipelineListItem}
            gap={theme.spacing.xsmall}
            meta={meta}
          />
          <PipelineEditAreaSC />
        </div>
      ) : (
        <EmptyState message="Looks like you don't have any pipelines yet." />
      )}
    </div>
  )
}

// Trial for TS-aware version from utils/graphql'
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
