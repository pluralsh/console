import { useCallback, useEffect, useMemo } from 'react'
import {
  AppIcon,
  Card,
  EmptyState,
  PipelineIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import styled, { useTheme } from 'styled-components'
import isEmpty from 'lodash/isEmpty'
import { ReactFlowProvider } from 'reactflow'
import { NetworkStatus } from '@apollo/client'
import { useNavigate, useParams } from 'react-router-dom'

import { PipelineFragment, usePipelinesQuery } from 'generated/graphql'
import { Edge, extendConnection } from 'utils/graphql'
import { PIPELINES_ABS_PATH } from 'routes/cdRoutesConsts'

import LoadingIndicator from 'components/utils/LoadingIndicator'
import {
  VirtualList,
  type VirtualListRenderer,
} from 'components/utils/VirtualList'
import { CD_BASE_CRUMBS } from 'components/cd/ContinuousDeployment'

import { Pipeline } from './Pipeline'

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
  border: theme.borders.default,
  width: '100%',
  height: '100%',
  borderRadius: theme.borderRadiuses.large,
  position: 'relative',
  overflow: 'hidden',
}))

type ListMeta = {
  selectedId: string
  setSelectedId: (string) => void
}

const PipelineListItemSC = styled(Card)(({ theme, selected }) => ({
  '&&': {
    width: '100%',
    padding: theme.spacing.medium,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.medium,
    borderColor: selected ? theme.colors['border-secondary'] : undefined,
  },
}))
const PipelineListItem: VirtualListRenderer<Edge<PipelineFragment>, ListMeta> =
  // eslint-disable-next-line func-names
  function ({ row, meta }) {
    const theme = useTheme()
    const { node } = row

    if (!node) {
      return null
    }
    const isSelected = node.id === meta.selectedId

    return (
      <PipelineListItemSC
        clickable
        selected={isSelected}
        onClick={(e) => {
          e.preventDefault()
          meta?.setSelectedId?.(node.id)
        }}
      >
        <AppIcon
          type="secondary"
          size="xxsmall"
          icon={
            <PipelineIcon
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

function Pipelines() {
  const theme = useTheme()
  const { data, error, fetchMore, networkStatus } = usePipelinesQuery({
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
    notifyOnNetworkStatusChange: true,
  })
  const pageInfo = data?.pipelines?.pageInfo
  const pipeEdges = data?.pipelines?.edges
  const selectedPipeline = useParams().pipelineId
  const navigate = useNavigate()
  const setSelectedPipeline = useCallback(
    (pipelineId: string) => {
      navigate(`${PIPELINES_ABS_PATH}/${pipelineId}`)
    },
    [navigate]
  )
  const pipeline = useMemo(
    () => pipeEdges?.find((p) => p?.node?.id === selectedPipeline)?.node,
    [pipeEdges, selectedPipeline]
  )

  if (data && !pipeline) {
    const firstId = pipeEdges?.[0]?.node?.id

    if (firstId) {
      setSelectedPipeline(firstId)
    } else if (selectedPipeline) {
      setSelectedPipeline('')
    }
  }

  useSetBreadcrumbs(PIPELINES_CRUMBS)

  const loadNextPage = useCallback(() => {
    if (!pageInfo?.hasNextPage) {
      return
    }
    fetchMore({
      variables: { cursor: pageInfo.endCursor },
      updateQuery: (prev, { fetchMoreResult: { pipelines } }) =>
        extendConnection(prev, pipelines, 'pipelines'),
    })
  }, [fetchMore, pageInfo?.endCursor, pageInfo?.hasNextPage])

  const meta = useMemo(
    () => ({
      selectedId: selectedPipeline,
      setSelectedId: setSelectedPipeline,
    }),
    [selectedPipeline, setSelectedPipeline]
  )
  const emptyState = (
    <EmptyState message="Looks like you don't have any pipelines yet." />
  )

  if (error) {
    return emptyState
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
          <PipelineEditAreaSC>
            {pipeline && (
              <Pipeline
                pipeline={pipeline}
                key={pipeline.id}
              />
            )}
          </PipelineEditAreaSC>
        </div>
      ) : (
        emptyState
      )}
    </div>
  )
}

export default function PipelinesWrapper() {
  return (
    <ReactFlowProvider>
      <Pipelines />
    </ReactFlowProvider>
  )
}
