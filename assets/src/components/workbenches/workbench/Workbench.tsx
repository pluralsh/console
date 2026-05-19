import {
  BookmarkIcon,
  Button,
  EmptyState,
  EventScheduleIcon,
  Flex,
  GearTrainIcon,
  ListBoxItem,
  ReturnIcon,
  ToolsIcon,
  TrashCanIcon,
  TuningIcon,
  WebhooksIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { useWorkbenchJobsQuery, WorkbenchJobStatus } from 'generated/graphql'
import { GqlError } from 'components/utils/Alert'
import { Confirm } from 'components/utils/Confirm'
import { MoreMenu } from 'components/utils/MoreMenu'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { SubTabs } from 'components/utils/SubTabs'
import { TRUNCATE } from 'components/utils/truncate'
import { Subtitle2H1 } from 'components/utils/typography/Text'
import {
  useDeleteWorkbenchMutation,
  useWorkbenchQuery,
  WorkbenchQuery,
  WorkbenchTinyFragment,
} from 'generated/graphql'
import { Key, ReactNode, useCallback, useMemo, useState } from 'react'
import { mapExistingNodes } from 'utils/graphql'
import {
  Link,
  Outlet,
  useLocation,
  useMatch,
  useNavigate,
  useOutletContext,
  useParams,
} from 'react-router-dom'
import {
  getWorkbenchAbsPath,
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
  WORKBENCHES_ISSUES_REL_PATH,
} from 'routes/workbenchesRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { WorkbenchSidePanel } from './WorkbenchSidePanel'
import { WorkbenchToolsEditModal } from './WorkbenchToolsEditModal'

export const getWorkbenchBreadcrumbs = (
  workbench: Nullable<WorkbenchTinyFragment>
) => [
  { label: 'workbenches', url: WORKBENCHES_ABS_PATH },
  ...(workbench
    ? [{ label: workbench.name, url: getWorkbenchAbsPath(workbench?.id) }]
    : []),
]

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
  Tools = 'tools',
  SavedPrompts = 'saved-prompts',
  EvalSettings = 'eval-settings',
  Delete = 'delete',
}

export type WorkbenchSidebar =
  | { kind: 'default' }
  | { kind: 'none' }
  | { kind: 'custom'; content: ReactNode }

export type WorkbenchPageLayoutProps = {
  sidebar?: WorkbenchSidebar
  showDescription?: boolean
  showEditWorkbenchButton?: boolean
  headerActions?: ReactNode
  children?: ReactNode
}

export function WorkbenchPageLayout({
  sidebar = { kind: 'default' },
  showDescription = true,
  showEditWorkbenchButton = true,
  headerActions,
  children,
}: WorkbenchPageLayoutProps) {
  const theme = useTheme()
  const navigate = useNavigate()
  const { workbenchId, isLoading, workbench, openToolsEdit, openDelete } =
    useOutletContext<WorkbenchOutletContext>()

  const { tab = '' } =
    useMatch(`${WORKBENCHES_ABS_PATH}/:${WORKBENCH_PARAM_ID}/:tab?/*`)
      ?.params ?? {}

  const sidebarNode = renderWorkbenchSidebar(
    sidebar,
    workbenchId,
    openToolsEdit
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
    [workbenchBasePath, jobsTabPath, hasInProgressJobs]
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
    <Flex
      height="100%"
      minHeight={0}
      overflow="hidden"
    >
      {sidebarNode}
      <Flex
        direction="column"
        flex={1}
        minHeight={0}
        minWidth={0}
        overflow="auto"
      >
        <Flex
          direction="column"
          gap="large"
          css={{
            padding: `${theme.spacing.medium}px ${theme.spacing.large}px`,
          }}
        >
          <Flex
            align="center"
            gap="small"
          >
            <SubTabs
              directory={subTabDirectory}
              activeFn={(path) => {
                if (path === workbenchBasePath) return !tab
                if (path === jobsTabPath) return tab === WORKBENCH_JOBS_REL_PATH
                return path === `${workbenchBasePath}/${tab}`
              }}
            />
            <Flex grow={1} />
            {showEditWorkbenchButton && (
              <Button
                secondary
                as={Link}
                to={`${workbenchBasePath}/${WORKBENCHES_EDIT_REL_PATH}`}
              >
                Edit workbench
              </Button>
            )}
            {headerActions}
            <MoreMenu
              disabled={!workbench}
              maxHeight="min(80vh, 520px)"
              triggerProps={{ iconFrameType: 'secondary', size: 'large' }}
              onSelectionChange={handleMoreMenuSelection}
            >
              {!showEditWorkbenchButton && (
                <ListBoxItem
                  key={WorkbenchMoreMenuKey.Edit}
                  leftContent={<GearTrainIcon />}
                  label="Edit workbench"
                />
              )}
              <ListBoxItem
                key={WorkbenchMoreMenuKey.Tools}
                leftContent={<ToolsIcon />}
                label="Tools"
              />
              <ListBoxItem
                key={WorkbenchMoreMenuKey.Cron}
                leftContent={<EventScheduleIcon />}
                label="Cron schedules"
              />
              <ListBoxItem
                key={WorkbenchMoreMenuKey.Webhook}
                leftContent={<WebhooksIcon />}
                label="Webhook triggers"
              />
              <ListBoxItem
                key={WorkbenchMoreMenuKey.SavedPrompts}
                leftContent={<BookmarkIcon />}
                label="Saved prompts"
              />
              <ListBoxItem
                key={WorkbenchMoreMenuKey.EvalSettings}
                leftContent={<TuningIcon />}
                label="Eval settings"
              />
              <ListBoxItem
                key={WorkbenchMoreMenuKey.Delete}
                destructive
                leftContent={<TrashCanIcon color="icon-danger" />}
                label="Delete workbench"
              />
            </MoreMenu>
          </Flex>
          {showDescription && (
            <StretchedFlex>
              {isLoading ? (
                <RectangleSkeleton
                  $height={18}
                  $width="100%"
                />
              ) : (
                <Subtitle2H1
                  $color="text-xlight"
                  css={{ ...TRUNCATE, paddingRight: theme.spacing.large }}
                >
                  {workbench?.description}
                </Subtitle2H1>
              )}
            </StretchedFlex>
          )}
        </Flex>
        {children}
      </Flex>
    </Flex>
  )
}

function useWorkbenchHasInProgressJobs(workbenchId: string) {
  const { data } = useWorkbenchJobsQuery({
    variables: { id: workbenchId, first: 50 },
    skip: !workbenchId,
    pollInterval: 5_000,
    fetchPolicy: 'cache-and-network',
  })

  return useMemo(() => {
    return mapExistingNodes(data?.workbench?.runs).some(
      (job) =>
        job.status === WorkbenchJobStatus.Pending ||
        job.status === WorkbenchJobStatus.Running
    )
  }, [data])
}

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
): ReactNode {
  switch (sidebar.kind) {
    case 'none':
      return null
    case 'default':
      return (
        <WorkbenchSidePanel
          workbenchId={workbenchId}
          onOpenToolsEdit={onOpenToolsEdit}
        />
      )
    case 'custom':
      return sidebar.content
  }
}

export function Workbench() {
  const id = useParams()[WORKBENCH_PARAM_ID]
  const { pathname } = useLocation()
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
          severity: 'danger',
        })
      },
    })

  useSetBreadcrumbs(
    useMemo(() => {
      void pathname
      return getWorkbenchBreadcrumbs(workbench)
    }, [pathname, workbench])
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

  if (!id || error?.message?.includes('could not find resource'))
    return (
      <EmptyState message="Workbench not found.">
        <Button
          as={Link}
          to={WORKBENCHES_ABS_PATH}
          startIcon={<ReturnIcon />}
        >
          View all workbenches
        </Button>
      </EmptyState>
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
      <Outlet context={outletContext} />
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
