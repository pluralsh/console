import {
  AddIcon,
  CheckIcon,
  CloseIcon,
  EmptyState,
  Flex,
  IconFrame,
  Input,
  SearchIcon,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { useThrottle } from 'components/hooks/useThrottle'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { TRUNCATE } from 'components/utils/truncate'
import { CaptionP } from 'components/utils/typography/Text'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { useFetchPaginatedData } from 'components/utils/table/useFetchPaginatedData'
import {
  useDeleteMonitorMutation,
  useDeleteWorkbenchDashboardMutation,
  useWorkbenchDashboardsQuery,
  useWorkbenchMonitorsQuery,
  WorkbenchDashboardSummaryFragment,
  WorkbenchMonitorSummaryFragment,
} from 'generated/graphql'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  getWorkbenchMonitoringAbsPath,
  getWorkbenchMonitoringDashboardAbsPath,
  getWorkbenchMonitoringDashboardCreateAbsPath,
  getWorkbenchMonitoringMonitorAbsPath,
  getWorkbenchMonitoringMonitorCreateAbsPath,
  WORKBENCH_MONITORING_DASHBOARD_PARAM_ID,
  WORKBENCH_MONITORING_MONITOR_PARAM_ID,
} from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { fromNow } from 'utils/datetime'
import { mapExistingNodes } from 'utils/graphql'

function isNearBottom(el: HTMLElement) {
  return el.scrollHeight - el.scrollTop - el.clientHeight < 200
}

function initials(name: string) {
  const words = name.split(/[^A-Za-z0-9]+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return `${words[0][0]}${words[1][0]}`.toUpperCase()
}

export function WorkbenchMonitoringSidebar({
  workbenchId,
}: {
  workbenchId: string
}) {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('')
  const debouncedFilter = useThrottle(filter, 200)
  const trimmedFilter = debouncedFilter.trim()
  const hasFilter = trimmedFilter.length > 0

  const dashboards = useFetchPaginatedData(
    {
      queryHook: useWorkbenchDashboardsQuery,
      keyPath: ['workbench', 'workbenchDashboards'],
    },
    { id: workbenchId, q: trimmedFilter || undefined }
  )
  const monitors = useFetchPaginatedData(
    {
      queryHook: useWorkbenchMonitorsQuery,
      keyPath: ['workbench', 'monitors'],
    },
    { id: workbenchId, q: trimmedFilter || undefined }
  )

  const dashboardNodes = mapExistingNodes(
    dashboards.data?.workbench?.workbenchDashboards
  )
  const monitorNodes = mapExistingNodes(monitors.data?.workbench?.monitors)
  const dashboardsLoading = !dashboards.data && dashboards.loading
  const monitorsLoading = !monitors.data && monitors.loading
  const showNoMatches =
    hasFilter &&
    !dashboardsLoading &&
    !monitorsLoading &&
    dashboardNodes.length === 0 &&
    monitorNodes.length === 0

  return (
    <WrapperSC>
      <FilterSC>
        <Input
          showClearButton
          size="small"
          startIcon={<SearchIcon />}
          placeholder="Filter dashboards and monitors"
          value={filter}
          onChange={(e) => setFilter(e.currentTarget.value)}
          aria-label="Filter dashboards and monitors"
        />
      </FilterSC>
      <GroupsSC>
        {showNoMatches ? (
          <NoMatchesSC>
            <EmptyState message={`No results for "${trimmedFilter}".`} />
          </NoMatchesSC>
        ) : (
          <>
            <GroupSC $first>
              <GroupHeaderSC>
                <span>Dashboards</span>
                <IconFrame
                  clickable
                  size="small"
                  icon={<AddIcon />}
                  tooltip="New dashboard"
                  aria-label="New dashboard"
                  onClick={() =>
                    navigate(
                      getWorkbenchMonitoringDashboardCreateAbsPath(workbenchId)
                    )
                  }
                />
              </GroupHeaderSC>
              {dashboards.error && (
                <PaddedSC>
                  <GqlError error={dashboards.error} />
                </PaddedSC>
              )}
              <GroupListSC
                aria-label="Dashboards"
                onScroll={(e) => {
                  const el = e.currentTarget
                  if (!isNearBottom(el)) return
                  if (dashboards.pageInfo?.hasNextPage && !dashboards.loading)
                    dashboards.fetchNextPage()
                }}
              >
                {dashboardsLoading ? (
                  <PaddedSC>
                    <MonitoringListSkeleton count={3} />
                  </PaddedSC>
                ) : dashboardNodes.length === 0 ? (
                  <PaddedSC>
                    <CaptionP $color="text-xlight">
                      {hasFilter
                        ? 'No dashboards match this filter.'
                        : 'No dashboards yet.'}
                    </CaptionP>
                  </PaddedSC>
                ) : (
                  dashboardNodes.map((dashboard) => (
                    <DashboardRow
                      key={dashboard.id}
                      dashboard={dashboard}
                      workbenchId={workbenchId}
                    />
                  ))
                )}
              </GroupListSC>
            </GroupSC>
            <GroupSC>
              <GroupHeaderSC>
                <span>Monitors</span>
                <IconFrame
                  clickable
                  size="small"
                  icon={<AddIcon />}
                  tooltip="New monitor"
                  aria-label="New monitor"
                  onClick={() =>
                    navigate(
                      getWorkbenchMonitoringMonitorCreateAbsPath(workbenchId)
                    )
                  }
                />
              </GroupHeaderSC>
              {monitors.error && (
                <PaddedSC>
                  <GqlError error={monitors.error} />
                </PaddedSC>
              )}
              <GroupListSC
                aria-label="Monitors"
                onScroll={(e) => {
                  const el = e.currentTarget
                  if (!isNearBottom(el)) return
                  if (monitors.pageInfo?.hasNextPage && !monitors.loading)
                    monitors.fetchNextPage()
                }}
              >
                {monitorsLoading ? (
                  <PaddedSC>
                    <MonitoringListSkeleton count={3} />
                  </PaddedSC>
                ) : monitorNodes.length === 0 ? (
                  <PaddedSC>
                    <CaptionP $color="text-xlight">
                      {hasFilter
                        ? 'No monitors match this filter.'
                        : 'No monitors yet.'}
                    </CaptionP>
                  </PaddedSC>
                ) : (
                  monitorNodes.map((monitor) => (
                    <MonitorRow
                      key={monitor.id}
                      monitor={monitor}
                      workbenchId={workbenchId}
                    />
                  ))
                )}
              </GroupListSC>
            </GroupSC>
          </>
        )}
      </GroupsSC>
    </WrapperSC>
  )
}

function MonitoringListSkeleton({ count }: { count: number }) {
  return (
    <Flex
      direction="column"
      gap="small"
    >
      {Array.from({ length: count }).map((_, i) => (
        <Flex
          key={i}
          gap="medium"
          align="center"
        >
          <RectangleSkeleton
            $height={40}
            $width={40}
            css={{ flexShrink: 0, '&::after': { borderRadius: '50%' } }}
          />
          <Flex
            direction="column"
            gap="xsmall"
            flex={1}
          >
            <RectangleSkeleton
              $height="xsmall"
              $width="70%"
            />
            <RectangleSkeleton
              $height="xsmall"
              $width="45%"
            />
          </Flex>
        </Flex>
      ))}
    </Flex>
  )
}

function DashboardRow({
  dashboard,
  workbenchId,
}: {
  dashboard: WorkbenchDashboardSummaryFragment
  workbenchId: string
}) {
  const navigate = useNavigate()
  const { popToast } = useSimpleToast()
  const selectedId = useParams()[WORKBENCH_MONITORING_DASHBOARD_PARAM_ID]
  const [confirming, setConfirming] = useState(false)
  const [deleteDashboard] = useDeleteWorkbenchDashboardMutation({
    variables: { id: dashboard.id },
    awaitRefetchQueries: true,
    refetchQueries: ['WorkbenchDashboards'],
    onCompleted: () => {
      popToast({ content: 'Dashboard deleted', severity: 'success' })
      if (selectedId === dashboard.id)
        navigate(getWorkbenchMonitoringAbsPath(workbenchId))
    },
    onError: (error) =>
      popToast({ content: error.message, severity: 'danger' }),
  })

  return (
    <RowSC $selected={selectedId === dashboard.id}>
      <RowLinkSC
        to={getWorkbenchMonitoringDashboardAbsPath({
          workbenchId,
          dashboardId: dashboard.id,
        })}
        aria-label={`Dashboard ${dashboard.name}`}
      >
        <RowAvatarSC aria-hidden="true">{initials(dashboard.name)}</RowAvatarSC>
        <RowTextSC>
          <RowTitleSC>{dashboard.name}</RowTitleSC>
          <RowSubtitleSC>
            {dashboard.updatedAt
              ? `Updated ${fromNow(dashboard.updatedAt)}`
              : 'Never updated'}
          </RowSubtitleSC>
        </RowTextSC>
      </RowLinkSC>
      {confirming ? (
        <InlineConfirmSC className="inline-confirm">
          <IconFrame
            clickable
            size="small"
            icon={<CheckIcon color="icon-success" />}
            tooltip="Confirm delete"
            aria-label={`Confirm delete ${dashboard.name}`}
            onClick={() => deleteDashboard()}
          />
          <IconFrame
            clickable
            size="small"
            icon={<CloseIcon />}
            tooltip="Cancel"
            aria-label="Cancel delete"
            onClick={() => setConfirming(false)}
          />
        </InlineConfirmSC>
      ) : (
        <DeleteSC className="delete-action">
          <IconFrame
            clickable
            size="small"
            icon={<TrashCanIcon color="icon-danger" />}
            tooltip="Delete dashboard"
            aria-label={`Delete ${dashboard.name}`}
            onClick={() => setConfirming(true)}
          />
        </DeleteSC>
      )}
    </RowSC>
  )
}

function MonitorRow({
  monitor,
  workbenchId,
}: {
  monitor: WorkbenchMonitorSummaryFragment
  workbenchId: string
}) {
  const navigate = useNavigate()
  const { popToast } = useSimpleToast()
  const selectedId = useParams()[WORKBENCH_MONITORING_MONITOR_PARAM_ID]
  const [confirming, setConfirming] = useState(false)
  const [deleteMonitor] = useDeleteMonitorMutation({
    variables: { id: monitor.id },
    awaitRefetchQueries: true,
    refetchQueries: ['WorkbenchMonitors'],
    onCompleted: () => {
      popToast({ content: 'Monitor deleted', severity: 'success' })
      if (selectedId === monitor.id)
        navigate(getWorkbenchMonitoringAbsPath(workbenchId))
    },
    onError: (error) =>
      popToast({ content: error.message, severity: 'danger' }),
  })

  return (
    <RowSC $selected={selectedId === monitor.id}>
      <RowLinkSC
        to={getWorkbenchMonitoringMonitorAbsPath({
          workbenchId,
          monitorId: monitor.id,
        })}
        aria-label={`Monitor ${monitor.name}`}
      >
        <RowAvatarSC aria-hidden="true">{initials(monitor.name)}</RowAvatarSC>
        <RowTextSC>
          <RowTitleSC>{monitor.name}</RowTitleSC>
          <RowSubtitleSC>
            {monitor.updatedAt
              ? `Updated ${fromNow(monitor.updatedAt)}`
              : 'Never updated'}
          </RowSubtitleSC>
        </RowTextSC>
      </RowLinkSC>
      {confirming ? (
        <InlineConfirmSC className="inline-confirm">
          <IconFrame
            clickable
            size="small"
            icon={<CheckIcon color="icon-success" />}
            tooltip="Confirm delete"
            aria-label={`Confirm delete ${monitor.name}`}
            onClick={() => deleteMonitor()}
          />
          <IconFrame
            clickable
            size="small"
            icon={<CloseIcon />}
            tooltip="Cancel"
            aria-label="Cancel delete"
            onClick={() => setConfirming(false)}
          />
        </InlineConfirmSC>
      ) : (
        <DeleteSC className="delete-action">
          <IconFrame
            clickable
            size="small"
            icon={<TrashCanIcon color="icon-danger" />}
            tooltip="Delete monitor"
            aria-label={`Delete ${monitor.name}`}
            onClick={() => setConfirming(true)}
          />
        </DeleteSC>
      )}
    </RowSC>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  alignSelf: 'stretch',
  // Figma renders the sidebar one step lighter than the main panel (#171A21).
  backgroundColor: theme.colors['fill-zero-selected'],
  borderRight: theme.borders.default,
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
  height: '100%',
  minHeight: 0,
  overflow: 'hidden',
  width: 350,
  maxWidth: 350,
  minWidth: 350,
}))

const FilterSC = styled.div(({ theme }) => ({
  borderBottom: theme.borders.default,
  padding: theme.spacing.medium,
}))

const GroupsSC = styled.div({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  minHeight: 0,
  overflow: 'hidden',
})

const NoMatchesSC = styled.div(({ theme }) => ({
  padding: theme.spacing.medium,
}))

const GroupSC = styled.div<{ $first?: boolean }>(({ theme, $first }) => ({
  display: 'flex',
  flex: '1 1 0',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  minHeight: 0,
  overflow: 'hidden',
  paddingBottom: theme.spacing.medium,
  ...(!$first && {
    borderTop: theme.borders.default,
    paddingTop: theme.spacing.large,
  }),
}))

const PaddedSC = styled.div(({ theme }) => ({
  padding: `0 ${theme.spacing.medium}px`,
}))

const GroupHeaderSC = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  alignItems: 'center',
  color: theme.colors['text-xlight'],
  display: 'flex',
  flexShrink: 0,
  justifyContent: 'space-between',
  padding: `${theme.spacing.xsmall}px ${theme.spacing.large}px ${theme.spacing.xsmall}px ${theme.spacing.medium}px`,
}))

const GroupListSC = styled.div(({ theme }) => ({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  minHeight: 0,
  overflowX: 'hidden',
  overflowY: 'auto',
  paddingBottom: theme.spacing.xsmall,
}))

// IconFrame small (24) + gap + IconFrame small; matches inline confirm.
const ROW_ACTION_WIDTH = 52

const RowSC = styled.div<{ $selected?: boolean }>(({ theme, $selected }) => ({
  alignItems: 'center',
  // Note: Figma fill tokens predate the DS rename; these current tokens
  // match the Figma rendered hexes (selected #2A2E37, hover #252932).
  backgroundColor: $selected ? theme.colors['fill-two-selected'] : undefined,
  display: 'flex',
  gap: theme.spacing.xsmall,
  padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
  '&:hover': {
    backgroundColor: $selected
      ? theme.colors['fill-two-selected']
      : theme.colors['fill-one-hover'],
  },
  '& .delete-action': {
    opacity: 0,
  },
  '&:hover .delete-action, &:focus-within .delete-action': {
    opacity: 1,
  },
}))

const RowLinkSC = styled(Link)({
  alignItems: 'center',
  display: 'flex',
  flex: 1,
  gap: 16,
  minWidth: 0,
  textDecoration: 'none',
})

const RowAvatarSC = styled.div(({ theme }) => ({
  alignItems: 'center',
  border: theme.borders.default,
  borderRadius: '50%',
  color: theme.colors.text,
  display: 'flex',
  flexShrink: 0,
  fontFamily: theme.fontFamilies.mono,
  fontSize: 18,
  height: 40,
  justifyContent: 'center',
  width: 40,
}))

const RowTextSC = styled.div({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  gap: 4,
  justifyContent: 'center',
  minWidth: 0,
})

const RowTitleSC = styled.span(({ theme }) => ({
  ...TRUNCATE,
  ...theme.partials.text.body2,
  color: theme.colors['text-light'],
}))

const RowSubtitleSC = styled.span(({ theme }) => ({
  ...TRUNCATE,
  ...theme.partials.text.caption,
  color: theme.colors['text-light'],
}))

const DeleteSC = styled.span({
  alignItems: 'center',
  display: 'flex',
  flexShrink: 0,
  justifyContent: 'flex-end',
  transition: 'opacity 0.15s ease',
  width: ROW_ACTION_WIDTH,
})

const InlineConfirmSC = styled.span(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  flexShrink: 0,
  gap: theme.spacing.xxsmall,
  justifyContent: 'flex-end',
  width: ROW_ACTION_WIDTH,
}))
