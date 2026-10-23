import {
  CaretRightIcon,
  Flex,
  IconFrame,
  Table,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { FlowFavoriteButton } from 'components/flows/FlowFavoriteButton'
import { VirtualSlice } from 'components/utils/table/useFetchPaginatedData'
import { CaptionP } from 'components/utils/typography/Text'
import { TRUNCATE } from 'components/utils/truncate'
import { WorkbenchTinyFragment } from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getWorkbenchAbsPath } from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { fromNow } from 'utils/datetime'
import { WorkbenchActionsMenu } from './WorkbenchActionsMenu'
import {
  WorkbenchCodingAgent,
  WorkbenchToolIcons,
} from './common/WorkbenchMetadata'

const columnHelper = createColumnHelper<WorkbenchTinyFragment>()

function getColumns({
  favoriteIds,
  onToggleFavorite,
}: {
  favoriteIds: string[]
  onToggleFavorite: (id: string) => void
}) {
  return [
    columnHelper.accessor((workbench) => workbench, {
      id: 'actions',
      header: '',
      meta: { gridTemplate: 'min-content' },
      cell: function Cell({ getValue }) {
        const { id } = getValue()
        const favorited = favoriteIds.includes(id)

        return (
          <Flex
            gap="xsmall"
            align="center"
          >
            <WorkbenchActionsMenu
              workbenchId={id}
              favorited={favorited}
              onToggleFavorite={() => onToggleFavorite(id)}
            />
            <FlowFavoriteButton
              favorited={favorited}
              onToggle={() => onToggleFavorite(id)}
            />
          </Flex>
        )
      },
    }),
    columnHelper.accessor((workbench) => workbench, {
      id: 'name',
      header: 'Name',
      meta: { gridTemplate: 'minmax(240px, 2fr)' },
      cell: function Cell({ getValue }) {
        const { name, description } = getValue()

        return (
          <NameBlockSC>
            <NameP>{name}</NameP>
            {description && (
              <CaptionP
                $color="text-xlight"
                css={{ ...TRUNCATE, margin: 0 }}
              >
                {description}
              </CaptionP>
            )}
          </NameBlockSC>
        )
      },
    }),
    columnHelper.accessor((workbench) => workbench.agentRuntime, {
      id: 'codingAgent',
      header: 'Coding agent',
      meta: { gridTemplate: 'minmax(140px, 1fr)' },
      cell: ({ getValue }) => (
        <WorkbenchCodingAgent agentRuntime={getValue()} />
      ),
    }),
    columnHelper.accessor((workbench) => workbench.tools, {
      id: 'tools',
      header: 'Bound tools',
      meta: { gridTemplate: 'minmax(140px, 1fr)' },
      cell: ({ getValue }) => <WorkbenchToolIcons tools={getValue()} />,
    }),
    columnHelper.accessor((workbench) => workbench.updatedAt, {
      id: 'updatedAt',
      header: 'Updated',
      meta: { gridTemplate: 'fit-content(140px)' },
      cell: ({ getValue }) => (
        <CaptionP
          $color="text-light"
          css={{ ...TRUNCATE, margin: 0 }}
        >
          {fromNow(getValue())}
        </CaptionP>
      ),
    }),
    columnHelper.display({
      id: 'arrow',
      header: '',
      meta: { gridTemplate: 'min-content' },
      cell: () => (
        <IconFrame
          icon={<CaretRightIcon color="icon-xlight" />}
          size="medium"
          type="tertiary"
        />
      ),
    }),
  ]
}

export function WorkbenchesTable({
  workbenches,
  loading,
  hasNextPage,
  fetchNextPage,
  setVirtualSlice,
  favoriteIds,
  onToggleFavorite,
}: {
  workbenches: WorkbenchTinyFragment[]
  loading: boolean
  hasNextPage: boolean
  fetchNextPage: () => void
  setVirtualSlice: (slice: VirtualSlice) => void
  favoriteIds: string[]
  onToggleFavorite: (id: string) => void
}) {
  const columns = useMemo(
    () => getColumns({ favoriteIds, onToggleFavorite }),
    [favoriteIds, onToggleFavorite]
  )

  return (
    <Table
      fullHeightWrap
      virtualizeRows
      fillLevel={0}
      data={workbenches}
      columns={columns}
      hasNextPage={hasNextPage}
      fetchNextPage={fetchNextPage}
      isFetchingNextPage={loading}
      onVirtualSliceChange={setVirtualSlice}
      loading={loading && isEmpty(workbenches)}
      getRowLink={({ original }) => (
        <Link
          to={getWorkbenchAbsPath((original as WorkbenchTinyFragment).id)}
        />
      )}
      emptyStateProps={{ message: 'No workbenches found' }}
    />
  )
}

const NameBlockSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  maxWidth: '100%',
})

const NameP = styled.p(({ theme }) => ({
  ...theme.partials.text.body2LooseLineHeight,
  ...TRUNCATE,
  margin: 0,
  minWidth: 0,
  color: theme.colors.text,
}))
