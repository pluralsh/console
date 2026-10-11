import {
  AddIcon,
  Button,
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
  AlertState,
  useDeleteMonitorMutation,
  useDeleteWorkbenchDashboardMutation,
  useWorkbenchDashboardDeltaSubscription,
  useWorkbenchDashboardsQuery,
  useWorkbenchMonitorDeltaSubscription,
  useWorkbenchMonitorsQuery,
  WorkbenchDashboardSummaryFragment,
  WorkbenchMonitorSummaryFragment,
} from 'generated/graphql'
import { times } from 'lodash'
import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
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
import { WORKBENCH_SIDEBAR_WIDTH } from '../WorkbenchSidePanel'

function isNearBottom(el: HTMLElement) {
  return el.scrollHeight - el.scrollTop - el.clientHeight < 200
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
      keepLoadedPages: true,
    },
    { id: workbenchId, q: trimmedFilter || undefined }
  )
  const monitors = useFetchPaginatedData(
    {
      queryHook: useWorkbenchMonitorsQuery,
      keyPath: ['workbench', 'monitors'],
      keepLoadedPages: true,
    },
    { id: workbenchId, q: trimmedFilter || undefined }
  )
  useWorkbenchDashboardDeltaSubscription({
    variables: { workbenchId },
    ignoreResults: true,
    onData: () => {
      void dashboards.refetch()
    },
  })
  useWorkbenchMonitorDeltaSubscription({
    variables: { workbenchId },
    ignoreResults: true,
    onData: () => {
      void monitors.refetch()
    },
  })

  const params = useParams()
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

  const nothingSelected =
    !params[WORKBENCH_MONITORING_DASHBOARD_PARAM_ID] &&
    !params[WORKBENCH_MONITORING_MONITOR_PARAM_ID]
  const autoSelectTo =
    nothingSelected && !hasFilter && !dashboardsLoading && !monitorsLoading
      ? dashboardNodes[0]
        ? getWorkbenchMonitoringDashboardAbsPath({
            workbenchId,
            dashboardId: dashboardNodes[0].id,
          })
        : monitorNodes[0]
          ? getWorkbenchMonitoringMonitorAbsPath({
              workbenchId,
              monitorId: monitorNodes[0].id,
            })
          : null
      : null

  return (
    <WrapperSC>
      {autoSelectTo && (
        <Navigate
          to={autoSelectTo}
          replace
        />
      )}
      <FilterSC>
        <Input
          showClearButton
          size="small"
          startIcon={<SearchIcon />}
          placeholder="Search dashboards and monitors"
          value={filter}
          onChange={(e) => setFilter(e.currentTarget.value)}
          aria-label="Search dashboards and monitors"
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
                {(dashboardsLoading ||
                  hasFilter ||
                  dashboardNodes.length > 0) && (
                  <IconFrame
                    clickable
                    size="small"
                    icon={<AddIcon />}
                    tooltip="New dashboard"
                    aria-label="New dashboard"
                    onClick={() =>
                      navigate(
                        getWorkbenchMonitoringDashboardCreateAbsPath(
                          workbenchId
                        )
                      )
                    }
                  />
                )}
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
                ) : dashboardNodes.length === 0 && !dashboards.error ? (
                  hasFilter ? (
                    <PaddedSC>
                      <CaptionP $color="text-xlight">
                        No dashboards match this filter.
                      </CaptionP>
                    </PaddedSC>
                  ) : (
                    <EmptyAddButton
                      onClick={() =>
                        navigate(
                          getWorkbenchMonitoringDashboardCreateAbsPath(
                            workbenchId
                          )
                        )
                      }
                    >
                      Add dashboard
                    </EmptyAddButton>
                  )
                ) : (
                  <>
                    {dashboardNodes.map((dashboard) => (
                      <DashboardRow
                        key={dashboard.id}
                        dashboard={dashboard}
                        workbenchId={workbenchId}
                      />
                    ))}
                    {dashboards.fetchingMore && (
                      <PaddedSC>
                        <MonitoringListSkeleton count={1} />
                      </PaddedSC>
                    )}
                  </>
                )}
              </GroupListSC>
            </GroupSC>
            <GroupSC>
              <GroupHeaderSC>
                <span>Monitors</span>
                {(monitorsLoading || hasFilter || monitorNodes.length > 0) && (
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
                )}
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
                ) : monitorNodes.length === 0 && !monitors.error ? (
                  hasFilter ? (
                    <PaddedSC>
                      <CaptionP $color="text-xlight">
                        No monitors match this filter.
                      </CaptionP>
                    </PaddedSC>
                  ) : (
                    <EmptyAddButton
                      onClick={() =>
                        navigate(
                          getWorkbenchMonitoringMonitorCreateAbsPath(
                            workbenchId
                          )
                        )
                      }
                    >
                      Add monitor
                    </EmptyAddButton>
                  )
                ) : (
                  <>
                    {monitorNodes.map((monitor) => (
                      <MonitorRow
                        key={monitor.id}
                        monitor={monitor}
                        workbenchId={workbenchId}
                      />
                    ))}
                    {monitors.fetchingMore && (
                      <PaddedSC>
                        <MonitoringListSkeleton count={1} />
                      </PaddedSC>
                    )}
                  </>
                )}
              </GroupListSC>
            </GroupSC>
          </>
        )}
      </GroupsSC>
    </WrapperSC>
  )
}

function EmptyAddButton({
  children,
  onClick,
}: {
  children: string
  onClick: () => void
}) {
  return (
    <PaddedSC>
      <EmptyAddButtonSC
        small
        tertiary
        startIcon={<AddIcon size={12} />}
        onClick={onClick}
      >
        {children}
      </EmptyAddButtonSC>
    </PaddedSC>
  )
}

function MonitoringListSkeleton({ count }: { count: number }) {
  return (
    <Flex
      direction="column"
      gap="small"
    >
      {times(count, (i) => (
        <Flex
          key={i}
          direction="column"
          gap="xsmall"
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
        className={
          monitor.state === AlertState.Firing && !confirming
            ? 'has-firing-dot'
            : undefined
        }
        to={getWorkbenchMonitoringMonitorAbsPath({
          workbenchId,
          monitorId: monitor.id,
        })}
        aria-label={`Monitor ${monitor.name}`}
      >
        <RowTextSC>
          <RowTitleSC>{monitor.name}</RowTitleSC>
          <RowSubtitleSC>
            {monitor.updatedAt
              ? `Updated ${fromNow(monitor.updatedAt)}`
              : 'Never updated'}
          </RowSubtitleSC>
        </RowTextSC>
      </RowLinkSC>
      {monitor.state === AlertState.Firing && !confirming && (
        <FiringDotSC
          className="firing-dot"
          role="img"
          aria-label="Firing"
        />
      )}
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
  backgroundColor: theme.colors['fill-accent'],
  borderRight: theme.borders.default,
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
  height: '100%',
  minHeight: 0,
  overflow: 'hidden',
  width: WORKBENCH_SIDEBAR_WIDTH,
  maxWidth: WORKBENCH_SIDEBAR_WIDTH,
  minWidth: WORKBENCH_SIDEBAR_WIDTH,
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
  minHeight: 0,
  overflow: 'hidden',
  ...(!$first && {
    borderTop: theme.borders.default,
  }),
}))

const PaddedSC = styled.div(({ theme }) => ({
  padding: `0 ${theme.spacing.medium}px`,
}))

// Same treatment as the workbench side panel empty add button.
const EmptyAddButtonSC = styled(Button)(({ theme }) => ({
  ...theme.partials.reset.button,
  ...theme.partials.text.caption,
  alignSelf: 'start',
  color: theme.colors['text-xlight'],
  padding: 0,

  '&:hover': {
    ...theme.partials.reset.button,
    ...theme.partials.text.caption,
    color: theme.colors['text-light'],
  },
}))

const GroupHeaderSC = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  alignItems: 'center',
  color: theme.colors['text-xlight'],
  display: 'flex',
  flexShrink: 0,
  justifyContent: 'space-between',
  padding: `${theme.spacing.xsmall}px ${theme.spacing.medium}px`,
}))

const GroupListSC = styled.div(() => ({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  minHeight: 0,
  overflowX: 'hidden',
  overflowY: 'auto',
}))

const RowSC = styled.div<{ $selected?: boolean }>(({ theme, $selected }) => {
  const selectedColor = theme.colors['fill-two-selected']
  const hoverColor = theme.colors['fill-one-hover']
  const actionFade = (color: string) =>
    `linear-gradient(to right, transparent, ${color} ${theme.spacing.large}px)`

  return {
    alignItems: 'center',
    // Note: Figma fill tokens predate the DS rename; these current tokens
    // match the Figma rendered hexes (selected #2A2E37, hover #252932).
    backgroundColor: $selected ? selectedColor : undefined,
    display: 'flex',
    gap: theme.spacing.xsmall,
    padding: `${theme.spacing.small}px ${theme.spacing.medium}px`,
    position: 'relative',
    // Delete sits over the title so the name can use the full row.
    '& > .delete-action, & > .inline-confirm': {
      alignItems: 'center',
      backgroundImage: actionFade(
        $selected ? selectedColor : theme.colors['fill-accent']
      ),
      bottom: 0,
      display: 'flex',
      paddingLeft: theme.spacing.large,
      position: 'absolute',
      right: theme.spacing.medium,
      top: 0,
      zIndex: 1,
    },
    '&:hover': {
      backgroundColor: $selected ? selectedColor : hoverColor,
    },
    '&:hover > .delete-action, &:focus-within > .delete-action, &:hover > .inline-confirm, &:focus-within > .inline-confirm':
      {
        backgroundImage: actionFade($selected ? selectedColor : hoverColor),
      },
    '& .delete-action': {
      opacity: 0,
      pointerEvents: 'none',
    },
    '&:hover .delete-action, &:focus-within .delete-action': {
      opacity: 1,
      pointerEvents: 'auto',
    },
    '&:hover .firing-dot, &:focus-within .firing-dot': {
      opacity: 0,
    },
    // 8px dot centered on the 24px section plus. Plus inset is spacing.medium.
    '& > .firing-dot': {
      position: 'absolute',
      right: theme.spacing.large,
      top: '50%',
      transform: 'translateY(-50%)',
    },
    // Keep the name clear of the dot until hover, when the dot hides.
    '&:not(:hover):not(:focus-within) > .has-firing-dot': {
      paddingRight: theme.spacing.large,
    },
  }
})

const RowLinkSC = styled(Link)({
  alignItems: 'center',
  display: 'flex',
  flex: 1,
  minWidth: 0,
  textDecoration: 'none',
})

const RowTextSC = styled.div(({ theme }) => ({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  gap: theme.spacing.xxsmall,
  justifyContent: 'center',
  minWidth: 0,
}))

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

const FiringDotSC = styled.span(({ theme }) => ({
  backgroundColor: theme.colors['icon-danger'],
  borderRadius: '50%',
  height: theme.spacing.xsmall,
  width: theme.spacing.xsmall,
}))

const DeleteSC = styled.span({
  alignItems: 'center',
  display: 'flex',
  flexShrink: 0,
  justifyContent: 'flex-end',
  transition: 'opacity 0.15s ease',
})

const InlineConfirmSC = styled.span(({ theme }) => ({
  alignItems: 'center',
  display: 'flex',
  flexShrink: 0,
  gap: theme.spacing.xxsmall,
  justifyContent: 'flex-end',
  justifySelf: 'end',
}))
