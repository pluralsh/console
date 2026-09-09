import { AppIcon, FlowIcon, Table } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { FlowActionsMenu } from 'components/flows/FlowActionsMenu'
import { FlowFavoriteStar } from 'components/flows/FlowFavoriteButton'
import {
  FlowAlertChip,
  FlowHealthStacked,
  FlowPipelineChip,
  componentHealthCounts,
} from 'components/flows/flowHealth'
import { VirtualSlice } from 'components/utils/table/useFetchPaginatedData'
import { CaptionP } from 'components/utils/typography/Text'
import { TRUNCATE } from 'components/utils/truncate'
import { FlowBasicWithBindingsFragment } from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getFlowDetailsPath } from 'routes/flowRoutesConsts'
import styled from 'styled-components'

const columnHelper = createColumnHelper<FlowBasicWithBindingsFragment>()

function getColumns({
  search,
  favoriteIds,
  onToggleFavorite,
  refetch,
}: {
  search: string
  favoriteIds: string[]
  onToggleFavorite: (id: string) => void
  refetch: () => void
}) {
  return [
    columnHelper.accessor((flow) => flow, {
      id: 'actions',
      header: '',
      meta: { gridTemplate: 'min-content' },
      cell: function Cell({ getValue }) {
        const flow = getValue()

        return (
          <FlowActionsMenu
            flow={flow}
            search={search}
            refetch={refetch}
            favorited={favoriteIds.includes(flow.id)}
            onToggleFavorite={() => onToggleFavorite(flow.id)}
          />
        )
      },
    }),
    columnHelper.accessor((flow) => flow, {
      id: 'name',
      header: '',
      meta: { gridTemplate: 'minmax(240px, 2fr)' },
      cell: function Cell({ getValue }) {
        const flow = getValue()
        const favorited = favoriteIds.includes(flow.id)

        return (
          <NameCellSC>
            <AppIcon
              size="xxxsmall"
              url={flow.icon || undefined}
              icon={<FlowIcon />}
            />
            <NameBlockSC>
              <NameRowSC>
                <NameP>{flow.name}</NameP>
                {favorited && <FlowFavoriteStar size={14} />}
              </NameRowSC>
              {flow.description && (
                <CaptionP
                  $color="text-xlight"
                  css={{ ...TRUNCATE, margin: 0 }}
                >
                  {flow.description}
                </CaptionP>
              )}
            </NameBlockSC>
          </NameCellSC>
        )
      },
    }),
    columnHelper.accessor((flow) => flow, {
      id: 'pipelines',
      header: 'Pipelines',
      meta: { gridTemplate: 'minmax(140px, 1fr)' },
      cell: function Cell({ getValue }) {
        const flow = getValue()

        return (
          <FlowPipelineChip
            pipelineCount={flow.pipelineCount ?? 0}
            pendingCount={flow.pendingPipelineCount ?? 0}
          />
        )
      },
    }),
    columnHelper.accessor((flow) => flow, {
      id: 'components',
      header: 'Components',
      meta: { gridTemplate: 'minmax(160px, 1fr)' },
      cell: function Cell({ getValue }) {
        return (
          <FlowHealthStacked
            counts={componentHealthCounts(getValue().componentStatuses)}
          />
        )
      },
    }),
    columnHelper.accessor((flow) => flow.serviceCount, {
      id: 'services',
      header: 'Services',
      meta: { gridTemplate: 'minmax(80px, 0.6fr)' },
      cell: function Cell({ getValue }) {
        return (
          <CaptionP
            $color="text-light"
            css={{ margin: 0 }}
          >
            {getValue() ?? 0}
          </CaptionP>
        )
      },
    }),
    columnHelper.accessor((flow) => flow.alertCount, {
      id: 'alerts',
      header: '',
      meta: { gridTemplate: 'min-content' },
      cell: function Cell({ getValue }) {
        return <FlowAlertChip count={getValue() ?? 0} />
      },
    }),
  ]
}

export function FlowsTable({
  flows,
  loading,
  hasNextPage,
  fetchNextPage,
  setVirtualSlice,
  favoriteIds,
  onToggleFavorite,
  refetch,
}: {
  flows: FlowBasicWithBindingsFragment[]
  loading: boolean
  hasNextPage: boolean
  fetchNextPage: () => void
  setVirtualSlice: (slice: VirtualSlice) => void
  favoriteIds: string[]
  onToggleFavorite: (id: string) => void
  refetch: () => void
}) {
  const { search } = useLocation()
  const columns = useMemo(
    () => getColumns({ search, favoriteIds, onToggleFavorite, refetch }),
    [search, favoriteIds, onToggleFavorite, refetch]
  )

  return (
    <Table
      fullHeightWrap
      virtualizeRows
      fillLevel={1}
      data={flows}
      columns={columns}
      hasNextPage={hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={loading}
      onVirtualSliceChange={setVirtualSlice}
      loading={loading && isEmpty(flows)}
      getRowLink={({ original }) => {
        const flow = original as FlowBasicWithBindingsFragment

        return (
          <Link
            to={`${getFlowDetailsPath({ flowIdOrName: flow.name })}/services${search}`}
          />
        )
      }}
      emptyStateProps={{ message: 'No flows found' }}
    />
  )
}

const NameCellSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
  minWidth: 0,
  maxWidth: '100%',
}))

const NameBlockSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  maxWidth: '100%',
})

const NameRowSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xxsmall,
  minWidth: 0,
  maxWidth: '100%',
  width: 'max-content',
}))

const NameP = styled.p(({ theme }) => ({
  ...theme.partials.text.body2LooseLineHeight,
  ...TRUNCATE,
  margin: 0,
  minWidth: 0,
  color: theme.colors['text-light'],
}))
