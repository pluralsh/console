import {
  AppIcon,
  FlowIcon,
  GitPullIcon,
  ListBoxItem,
  PeopleIcon,
  Table,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import {
  PermissionsIdType,
  PermissionsModal,
} from 'components/cd/utils/PermissionsModal'
import { useLogin } from 'components/contexts'
import { FlowFavoriteButton } from 'components/flows/FlowFavoriteButton'
import {
  FlowAlertChip,
  FlowHealthStacked,
  FlowPipelineChip,
  componentHealthCounts,
} from 'components/flows/flowHealth'
import { MoreMenu } from 'components/utils/MoreMenu'
import { StackedText } from 'components/utils/table/StackedText'
import { VirtualSlice } from 'components/utils/table/useFetchPaginatedData'
import { CaptionP } from 'components/utils/typography/Text'
import { hasAccess } from 'components/utils/persona'
import { FlowBasicWithBindingsFragment } from 'generated/graphql'
import { isEmpty } from 'lodash'
import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
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
      id: 'name',
      header: '',
      meta: { gridTemplate: 'minmax(240px, 2fr)' },
      cell: function Cell({ getValue }) {
        const flow = getValue()

        return (
          <NameCellSC>
            <AppIcon
              size="xxxsmall"
              url={flow.icon || undefined}
              icon={<FlowIcon />}
            />
            <NameTextSC>
              <StackedText
                first={flow.name}
                second={flow.description || undefined}
                firstPartialType="body2Bold"
                firstColor="text"
                secondPartialType="caption"
                secondColor="text-xlight"
                truncate
              />
              <FavoriteSlotSC $favorited={favoriteIds.includes(flow.id)}>
                <FlowFavoriteButton
                  favorited={favoriteIds.includes(flow.id)}
                  onToggle={() => onToggleFavorite(flow.id)}
                />
              </FavoriteSlotSC>
            </NameTextSC>
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
    columnHelper.accessor((flow) => flow, {
      id: 'actions',
      header: '',
      meta: { gridTemplate: 'min-content' },
      cell: function Cell({ getValue }) {
        return (
          <FlowRowActions
            flow={getValue()}
            search={search}
            refetch={refetch}
          />
        )
      },
    }),
  ]
}

function FlowRowActions({
  flow,
  search,
  refetch,
}: {
  flow: FlowBasicWithBindingsFragment
  search: string
  refetch: () => void
}) {
  const { personaConfiguration } = useLogin()
  const navigate = useNavigate()
  const showPermissionsBtn = hasAccess(
    personaConfiguration,
    'flows.permissions'
  )
  const showPipelines = hasAccess(personaConfiguration, 'flows.pipelines')
  const [menuKey, setMenuKey] = useState('')
  const flowPath = getFlowDetailsPath({ flowIdOrName: flow.name })

  return (
    <ActionsSC>
      {(showPermissionsBtn || showPipelines) && (
        <MoreMenu
          onSelectionChange={(key: string) => {
            if (key === 'pipelines') {
              navigate(`${flowPath}/pipelines${search}`)
              return
            }
            setMenuKey(key)
          }}
          triggerProps={{
            onClick: (e) => {
              e.preventDefault()
              e.stopPropagation()
            },
          }}
        >
          {showPermissionsBtn && (
            <ListBoxItem
              key="permissions"
              label="Permissions"
              leftContent={<PeopleIcon />}
              textValue="Permissions"
            />
          )}
          {showPipelines && (
            <ListBoxItem
              key="pipelines"
              label="View pipelines"
              leftContent={<GitPullIcon />}
              textValue="View pipelines"
            />
          )}
        </MoreMenu>
      )}
      {showPermissionsBtn && (
        <PermissionsModal
          id={flow.id}
          type={PermissionsIdType.Flow}
          bindings={flow}
          header="Flow permissions"
          refetch={refetch}
          open={menuKey === 'permissions'}
          onClose={() => setMenuKey('')}
        />
      )}
    </ActionsSC>
  )
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

const NameTextSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
  minWidth: 0,
  maxWidth: '100%',
  width: 'max-content',
}))

const FavoriteSlotSC = styled.div<{ $favorited: boolean }>(
  ({ $favorited }) => ({
    flexShrink: 0,
    ...(!$favorited && {
      opacity: 0,
      pointerEvents: 'none',
      'tr:hover &, tr:focus-within &': {
        opacity: 1,
        pointerEvents: 'auto',
      },
    }),
  })
)

const ActionsSC = styled.div({
  'td &': { pointerEvents: 'auto' },
})
