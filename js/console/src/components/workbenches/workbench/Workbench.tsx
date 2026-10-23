import {
  ICON_FRAME_ICON_SIZE,
  Breadcrumb,
  BookmarkIcon,
  BotIcon,
  Button,
  EventScheduleIcon,
  Flex,
  GearTrainIcon,
  ListBoxItem,
  ReturnIcon,
  SemanticColorKey,
  ToolsIcon,
  TrashCanIcon,
  TuningIcon,
  WebhooksIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { WorkbenchEmptyState } from 'components/workbenches/common/WorkbenchEmptyState'
import {
  useWorkbenchJobCountsQuery,
  WorkbenchJobStatus,
  useDeleteWorkbenchMutation,
  useWorkbenchQuery,
  WorkbenchQuery,
  WorkbenchTinyFragment,
} from 'generated/graphql'
import { WorkbenchFileContext } from 'components/ai/chatbot/PlrlFileChip'
import { GqlError } from 'components/utils/Alert'
import { Confirm } from 'components/utils/Confirm'
import { MoreMenu } from 'components/utils/MoreMenu'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { CrumbSelect } from 'components/layout/CrumbSelect'
import {
  PAGE_SIDECAR_WIDTH,
  PageColumnSC,
  PageRowSC,
  PageSidecarSC,
} from 'components/layout/PageLayout'
import { PageToolbar } from 'components/layout/PageToolbar'
import { useWorkbenchOptions } from 'components/workbenches/useWorkbenchOptions'
import { getTabCrumb } from 'utils/getTabCrumb'
import {
  createContext,
  Key,
  ReactNode,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import {
  Link,
  Outlet,
  useMatch,
  useNavigate,
  useOutletContext,
  useParams,
} from 'react-router-dom'
import {
  getWorkbenchAbsPath,
  getWorkbenchChatbotsAbsPath,
  getWorkbenchCronSchedulesAbsPath,
  getWorkbenchEvalSettingsAbsPath,
  getWorkbenchSavedPromptsAbsPath,
  getWorkbenchWebhookTriggersAbsPath,
  WORKBENCH_JOBS_REL_PATH,
  WORKBENCH_PARAM_ID,
  WORKBENCHES_ABS_PATH,
  WORKBENCHES_ALERTS_REL_PATH,
  WORKBENCHES_EDIT_REL_PATH,
  WORKBENCHES_EVALS_REL_PATH,
  WORKBENCHES_FILES_REL_PATH,
  WORKBENCHES_ISSUES_REL_PATH,
  WORKBENCHES_MONITORING_REL_PATH,
} from 'routes/workbenchesRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { WorkbenchPanelSlot } from './WorkbenchPanelSlot'
import {
  WORKBENCH_SIDEBAR_WIDTH,
  WorkbenchSidePanel,
} from './WorkbenchSidePanel'
import { WorkbenchToolsEditModal } from './WorkbenchToolsEditModal'
import { useWorkbenchJobsDelta } from './useWorkbenchJobsDelta'

export const getWorkbenchBreadcrumbs = (
  workbench: Nullable<WorkbenchTinyFragment>
): Breadcrumb[] => [
  { label: 'workbenches', url: WORKBENCHES_ABS_PATH },
  ...(workbench
    ? [
        {
          label: <WorkbenchCrumbSelect workbench={workbench} />,
          textValue: workbench.name,
        },
      ]
    : []),
]

// the workbench crumb, switching to another workbench in place
function WorkbenchCrumbSelect({
  workbench,
}: {
  workbench: WorkbenchTinyFragment
}) {
  const navigate = useNavigate()
  const { workbenches } = useWorkbenchOptions()

  return (
    <CrumbSelect
      ariaLabel="Workbench"
      label={workbench.name}
      selectedKey={workbench.id}
      onSelectionChange={(id) => navigate(getWorkbenchAbsPath(id))}
    >
      {(workbenches.some(({ id }) => id === workbench.id)
        ? workbenches
        : [workbench, ...workbenches]
      ).map(({ id, name }) => (
        <ListBoxItem
          key={id}
          label={name}
          textValue={name}
        />
      ))}
    </CrumbSelect>
  )
}

export type WorkbenchOutletContext = {
  workbenchId: string
  isLoading: boolean
  workbench: WorkbenchQuery['workbench'] | null | undefined
  openToolsEdit: () => void
  openDelete: () => void
}

export enum WorkbenchMoreMenuKey {
  Edit = 'edit',
  Cron = 'cron',
  Webhook = 'webhook',
  Chatbots = 'chatbots',
  Tools = 'tools',
  SavedPrompts = 'saved-prompts',
  EvalSettings = 'eval-settings',
  Delete = 'delete',
}

// `tools`: tools, webhooks, chatbots and crons, only relevant when launching.
// Custom sidebars declare their width, as CSS can only transition explicit ones
export type WorkbenchSidebar =
  | { kind: 'tools' }
  | { kind: 'none' }
  | {
      kind: 'custom'
      content: ReactNode
      width: number
      resizing?: boolean
    }

export type WorkbenchPageLayoutProps = {
  sidebar?: WorkbenchSidebar
  showEditWorkbenchButton?: boolean
  headerActions?: ReactNode
  contentBackground?: SemanticColorKey
  // docked to the right of the content, e.g. display options
  sidecar?: ReactNode
  children?: ReactNode
}

type WorkbenchTabsLayout = {
  sidebarWidth: number
  sidebarResizing: boolean
  sidecarWidth: number
  showEditWorkbenchButton: boolean
  contentBackground?: SemanticColorKey
}

const EMPTY_TABS_LAYOUT: WorkbenchTabsLayout = {
  sidebarWidth: 0,
  sidebarResizing: false,
  sidecarWidth: 0,
  showEditWorkbenchButton: true,
}

type WorkbenchTabsContextValue = {
  sidebarEl: HTMLDivElement | null
  sidecarEl: HTMLDivElement | null
  headerActionsEl: HTMLDivElement | null
  setLayout: (layout: WorkbenchTabsLayout) => void
}

const WorkbenchTabsContext =
  createContext<Nullable<WorkbenchTabsContextValue>>(null)

// A tab's page: its content renders in place, while its panels and header
// actions are portaled into WorkbenchTabs, which outlives tab switches
export function WorkbenchPageLayout({
  sidebar = { kind: 'none' },
  showEditWorkbenchButton = true,
  headerActions,
  contentBackground,
  sidecar,
  children,
}: WorkbenchPageLayoutProps) {
  const tabs = useContext(WorkbenchTabsContext)
  const { workbenchId, openToolsEdit } =
    useOutletContext<WorkbenchOutletContext>()
  const {
    node: sidebarNode,
    width: sidebarWidth,
    resizing: sidebarResizing,
  } = renderWorkbenchSidebar(sidebar, workbenchId, openToolsEdit)
  const sidecarWidth = sidecar ? PAGE_SIDECAR_WIDTH : 0
  const setLayout = tabs?.setLayout

  // a layout effect, so the frame is never painted with the previous tab's
  // layout; the next tab's layout replaces the reset within the same commit
  useLayoutEffect(() => {
    setLayout?.({
      sidebarWidth,
      sidebarResizing,
      sidecarWidth,
      showEditWorkbenchButton,
      contentBackground,
    })
    return () => setLayout?.(EMPTY_TABS_LAYOUT)
  }, [
    setLayout,
    sidebarWidth,
    sidebarResizing,
    sidecarWidth,
    showEditWorkbenchButton,
    contentBackground,
  ])

  return (
    <>
      {children}
      {tabs?.sidebarEl &&
        sidebarNode &&
        createPortal(sidebarNode, tabs.sidebarEl)}
      {tabs?.sidecarEl &&
        sidecar &&
        createPortal(<PageSidecarSC>{sidecar}</PageSidecarSC>, tabs.sidecarEl)}
      {tabs?.headerActionsEl &&
        headerActions &&
        createPortal(headerActions, tabs.headerActionsEl)}
    </>
  )
}

// The frame around the workbench tabs, a layout route so its panel slots stay
// mounted (and transition) as tabs switch
export function WorkbenchTabs() {
  const theme = useTheme()
  const navigate = useNavigate()
  const outletContext = useOutletContext<WorkbenchOutletContext>()
  const { workbenchId, workbench, openToolsEdit, openDelete } = outletContext
  const [layout, setLayout] = useState(EMPTY_TABS_LAYOUT)
  const [sidebarEl, setSidebarEl] = useState<HTMLDivElement | null>(null)
  const [sidecarEl, setSidecarEl] = useState<HTMLDivElement | null>(null)
  const [headerActionsEl, setHeaderActionsEl] = useState<HTMLDivElement | null>(
    null
  )
  const tabsContext = useMemo(
    () => ({ sidebarEl, sidecarEl, headerActionsEl, setLayout }),
    [sidebarEl, sidecarEl, headerActionsEl]
  )
  const { showEditWorkbenchButton, contentBackground } = layout

  const { tab = '' } =
    useMatch(`${WORKBENCHES_ABS_PATH}/:${WORKBENCH_PARAM_ID}/:tab?/*`)
      ?.params ?? {}

  // set by the tabs rather than the parent route, so pages outside them (e.g.
  // a job) can set their own, deeper breadcrumbs
  useSetBreadcrumbs(
    useMemo(
      () => [
        ...getWorkbenchBreadcrumbs(workbench),
        ...(!workbench
          ? []
          : tab
            ? getTabCrumb(getWorkbenchAbsPath(workbench.id), tab)
            : [{ label: 'launch', url: getWorkbenchAbsPath(workbench.id) }]),
      ],
      [workbench, tab]
    )
  )

  const workbenchBasePath = getWorkbenchAbsPath(workbenchId)
  const jobsTabPath = `${workbenchBasePath}/${WORKBENCH_JOBS_REL_PATH}`
  const hasInProgressJobs = useWorkbenchHasInProgressJobs(workbenchId)

  const subTabDirectory = useMemo(
    () => [
      { label: 'Launch', path: workbenchBasePath },
      {
        label: (
          <Flex
            align="center"
            gap="xxsmall"
          >
            Jobs
            {hasInProgressJobs && <InProgressDotSC />}
          </Flex>
        ),
        path: jobsTabPath,
      },
      {
        label: 'Monitoring',
        path: `${workbenchBasePath}/${WORKBENCHES_MONITORING_REL_PATH}`,
      },
      ...(workbench?.filesystemEnabled
        ? [
            {
              label: 'Files',
              path: `${workbenchBasePath}/${WORKBENCHES_FILES_REL_PATH}`,
            },
          ]
        : []),
      {
        label: 'Issues',
        path: `${workbenchBasePath}/${WORKBENCHES_ISSUES_REL_PATH}`,
      },
      {
        label: 'Alerts',
        path: `${workbenchBasePath}/${WORKBENCHES_ALERTS_REL_PATH}`,
      },
      {
        label: 'Evals',
        path: `${workbenchBasePath}/${WORKBENCHES_EVALS_REL_PATH}`,
      },
    ],
    [
      workbenchBasePath,
      jobsTabPath,
      hasInProgressJobs,
      workbench?.filesystemEnabled,
    ]
  )

  const handleMoreMenuSelection = useCallback(
    (selectedKey: Key) => {
      switch (selectedKey) {
        case WorkbenchMoreMenuKey.Edit:
          navigate(`${workbenchBasePath}/${WORKBENCHES_EDIT_REL_PATH}`)
          return
        case WorkbenchMoreMenuKey.Cron:
          navigate(getWorkbenchCronSchedulesAbsPath(workbenchId))
          return
        case WorkbenchMoreMenuKey.Webhook:
          navigate(getWorkbenchWebhookTriggersAbsPath(workbenchId))
          return
        case WorkbenchMoreMenuKey.Chatbots:
          navigate(getWorkbenchChatbotsAbsPath(workbenchId))
          return
        case WorkbenchMoreMenuKey.Tools:
          openToolsEdit()
          return
        case WorkbenchMoreMenuKey.SavedPrompts:
          navigate(getWorkbenchSavedPromptsAbsPath(workbenchId))
          return
        case WorkbenchMoreMenuKey.EvalSettings:
          navigate(getWorkbenchEvalSettingsAbsPath(workbenchId))
          return
        case WorkbenchMoreMenuKey.Delete:
          openDelete()
          return
        default:
          return
      }
    },
    [navigate, workbenchBasePath, workbenchId, openToolsEdit, openDelete]
  )

  return (
    <WorkbenchTabsContext.Provider value={tabsContext}>
      <Flex
        align="stretch"
        height="100%"
        minHeight={0}
        overflow="hidden"
      >
        <WorkbenchPanelSlot
          ref={setSidebarEl}
          edge="left"
          width={layout.sidebarWidth}
          resizing={layout.sidebarResizing}
        />
        <Flex
          direction="column"
          flex={1}
          minHeight={0}
          minWidth={0}
          overflow="auto"
          css={{
            backgroundColor: contentBackground
              ? theme.colors[contentBackground]
              : theme.mode === 'light'
                ? theme.colors['page-background']
                : theme.colors['fill-zero'],
          }}
        >
          <PageToolbar
            tabs={subTabDirectory}
            activeFn={(path) => {
              if (path === workbenchBasePath) return !tab
              if (path === jobsTabPath) return tab === WORKBENCH_JOBS_REL_PATH
              return path === `${workbenchBasePath}/${tab}`
            }}
          >
            {showEditWorkbenchButton && (
              <Button
                secondary
                small
                as={Link}
                to={`${workbenchBasePath}/${WORKBENCHES_EDIT_REL_PATH}`}
              >
                Edit workbench
              </Button>
            )}
            <HeaderActionsSC ref={setHeaderActionsEl} />
            <MoreMenu
              disabled={!workbench}
              maxHeight="min(80vh, 520px)"
              triggerProps={{
                iconFrameType: 'secondary',
                size: 'medium',
                iconSize: ICON_FRAME_ICON_SIZE.small,
              }}
              onSelectionChange={handleMoreMenuSelection}
            >
              {!showEditWorkbenchButton && (
                <ListBoxItem
                  key={WorkbenchMoreMenuKey.Edit}
                  leftContent={
                    <GearTrainIcon size={ICON_FRAME_ICON_SIZE.small} />
                  }
                  label="Edit workbench"
                />
              )}
              <ListBoxItem
                key={WorkbenchMoreMenuKey.Tools}
                leftContent={<ToolsIcon size={ICON_FRAME_ICON_SIZE.small} />}
                label="Tools"
              />
              <ListBoxItem
                key={WorkbenchMoreMenuKey.Cron}
                leftContent={
                  <EventScheduleIcon size={ICON_FRAME_ICON_SIZE.small} />
                }
                label="Cron schedules"
              />
              <ListBoxItem
                key={WorkbenchMoreMenuKey.Webhook}
                leftContent={<WebhooksIcon size={ICON_FRAME_ICON_SIZE.small} />}
                label="Webhook triggers"
              />
              <ListBoxItem
                key={WorkbenchMoreMenuKey.Chatbots}
                leftContent={<BotIcon size={ICON_FRAME_ICON_SIZE.small} />}
                label="Chatbots"
              />
              <ListBoxItem
                key={WorkbenchMoreMenuKey.SavedPrompts}
                leftContent={<BookmarkIcon size={ICON_FRAME_ICON_SIZE.small} />}
                label="Saved prompts"
              />
              <ListBoxItem
                key={WorkbenchMoreMenuKey.EvalSettings}
                leftContent={<TuningIcon size={ICON_FRAME_ICON_SIZE.small} />}
                label="Eval settings"
              />
              <ListBoxItem
                key={WorkbenchMoreMenuKey.Delete}
                destructive
                leftContent={
                  <TrashCanIcon
                    size={ICON_FRAME_ICON_SIZE.small}
                    color="icon-danger"
                  />
                }
                label="Delete workbench"
              />
            </MoreMenu>
          </PageToolbar>
          <PageRowSC>
            <ContentColumnSC>
              <Outlet context={outletContext} />
            </ContentColumnSC>
            <WorkbenchPanelSlot
              ref={setSidecarEl}
              edge="right"
              width={layout.sidecarWidth}
            />
          </PageRowSC>
        </Flex>
      </Flex>
    </WorkbenchTabsContext.Provider>
  )
}

// reads the status counts rather than a page of jobs, so this poll never
// overwrites the paginated jobs list in the cache
function useWorkbenchHasInProgressJobs(workbenchId: string) {
  const { data } = useWorkbenchJobCountsQuery({
    variables: { id: workbenchId },
    skip: !workbenchId,
    pollInterval: 5_000,
    fetchPolicy: 'cache-and-network',
  })

  return useMemo(
    () =>
      (data?.workbench?.runCounts?.statuses ?? []).some(
        (entry) =>
          !!entry?.count &&
          (entry.status === WorkbenchJobStatus.Pending ||
            entry.status === WorkbenchJobStatus.Running)
      ),
    [data]
  )
}

// scrolls in place of the page column, which the sidecar row clips
const ContentColumnSC = styled(PageColumnSC)({ overflow: 'auto' })

const HeaderActionsSC = styled.div({ display: 'contents' })

const InProgressDotSC = styled.span(({ theme }) => ({
  width: 6,
  height: 6,
  borderRadius: '50%',
  backgroundColor: theme.colors['icon-info'],
  flexShrink: 0,
}))

function renderWorkbenchSidebar(
  sidebar: WorkbenchSidebar,
  workbenchId: string,
  onOpenToolsEdit: () => void
): { node: ReactNode; width: number; resizing: boolean } {
  switch (sidebar.kind) {
    case 'none':
      return { node: null, width: 0, resizing: false }
    case 'tools':
      return {
        node: (
          <WorkbenchSidePanel
            workbenchId={workbenchId}
            onOpenToolsEdit={onOpenToolsEdit}
          />
        ),
        width: WORKBENCH_SIDEBAR_WIDTH,
        resizing: false,
      }
    case 'custom':
      return {
        node: sidebar.content,
        width: sidebar.width,
        resizing: !!sidebar.resizing,
      }
  }
}

export function Workbench() {
  const id = useParams()[WORKBENCH_PARAM_ID]
  const navigate = useNavigate()
  const { popToast } = useSimpleToast()
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [toolsEditOpen, setToolsEditOpen] = useState(false)

  const { data, loading, error } = useWorkbenchQuery({
    variables: { id },
    fetchPolicy: 'cache-and-network',
  })
  const isLoading = !data && loading
  const workbench = data?.workbench

  useWorkbenchJobsDelta(id)

  const openToolsEdit = useCallback(() => setToolsEditOpen(true), [])
  const openDelete = useCallback(() => setDeleteModalOpen(true), [])

  const [deleteWorkbench, { loading: deleteLoading, error: deleteError }] =
    useDeleteWorkbenchMutation({
      awaitRefetchQueries: true,
      refetchQueries: ['Workbenches'],
      onCompleted: () => {
        setDeleteModalOpen(false)
        navigate(WORKBENCHES_ABS_PATH)
        popToast({
          content: `${workbench?.name ?? 'workbench'} deleted`,
          severity: 'success',
        })
      },
    })

  // tabs set breadcrumbs through WorkbenchPageLayout; the not-found and error
  // states below render without it, so set them here instead
  const notFound = !id || !!error?.message?.includes('could not find resource')
  useSetBreadcrumbs(
    useMemo(
      () => (notFound || error ? getWorkbenchBreadcrumbs(null) : undefined),
      [error, notFound]
    )
  )

  const outletContext = useMemo<WorkbenchOutletContext>(
    () => ({
      workbenchId: id ?? '',
      isLoading,
      workbench,
      openToolsEdit,
      openDelete,
    }),
    [id, isLoading, workbench, openToolsEdit, openDelete]
  )

  if (notFound)
    return (
      <WorkbenchEmptyState
        message="Workbench not found"
        description="It may have been deleted, or you may not have access to it."
      >
        <Button
          small
          as={Link}
          to={WORKBENCHES_ABS_PATH}
          startIcon={<ReturnIcon />}
        >
          View all workbenches
        </Button>
      </WorkbenchEmptyState>
    )
  if (error)
    return (
      <GqlError
        margin="large"
        error={error}
      />
    )

  return (
    <>
      <WorkbenchFileContext.Provider
        value={workbench?.filesystemEnabled ? (id ?? null) : null}
      >
        <Outlet context={outletContext} />
      </WorkbenchFileContext.Provider>
      <Confirm
        open={deleteModalOpen}
        close={() => setDeleteModalOpen(false)}
        destructive
        label="Delete workbench"
        loading={deleteLoading}
        error={deleteError}
        submit={() => deleteWorkbench({ variables: { id } })}
        title="Delete workbench"
        confirmationEnabled
        confirmationText="delete workbench"
        text={
          <span>
            Are you sure you want to delete{' '}
            <strong>{workbench?.name ?? 'this workbench'}</strong>?
          </span>
        }
      />
      <WorkbenchToolsEditModal
        workbench={workbench}
        open={toolsEditOpen}
        onClose={() => setToolsEditOpen(false)}
      />
    </>
  )
}
