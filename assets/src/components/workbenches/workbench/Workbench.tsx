import {
  BookmarkIcon,
  Button,
  EmptyState,
  EventScheduleIcon,
  Flex,
  ListBoxItem,
  ReturnIcon,
  ToolsIcon,
  TrashCanIcon,
  TuningIcon,
  WebhooksIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
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
import { useTheme } from 'styled-components'
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
  Cron = 'cron',
  Webhook = 'webhook',
  Tools = 'tools',
  SavedPrompts = 'saved-prompts',
  EvalSettings = 'eval-settings',
  Delete = 'delete',
}

const subTabDirectory = [
  { label: 'Jobs', path: '' },
  { label: 'Issues', path: WORKBENCHES_ISSUES_REL_PATH },
  { label: 'Alerts', path: WORKBENCHES_ALERTS_REL_PATH },
  { label: 'Evals', path: WORKBENCHES_EVALS_REL_PATH },
]

export type WorkbenchSidebar =
  | { kind: 'default' }
  | { kind: 'none' }
  | { kind: 'custom'; content: ReactNode }

export type WorkbenchPageLayoutProps = {
  sidebar?: WorkbenchSidebar
  showDescription?: boolean
  headerActions?: ReactNode
  children?: ReactNode
}

export function WorkbenchPageLayout({
  sidebar = { kind: 'default' },
  showDescription = true,
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
  const resolveSubTabTo = useCallback(
    (relPath: string) => {
      const base = getWorkbenchAbsPath(workbenchId)
      return relPath === '' ? base : `${base}/${relPath}`
    },
    [workbenchId]
  )

  const handleMoreMenuSelection = useCallback(
    (selectedKey: Key) => {
      switch (selectedKey) {
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
    [navigate, workbenchId, openToolsEdit, openDelete]
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
              resolveTo={resolveSubTabTo}
              activeFn={(path) =>
                path === (tab === WORKBENCH_JOBS_REL_PATH ? '' : tab)
              }
            />
            <Flex grow={1} />
            <Button
              secondary
              as={Link}
              to={`${workbenchBasePath}/${WORKBENCHES_EDIT_REL_PATH}`}
            >
              Edit workbench
            </Button>
            {headerActions}
            <MoreMenu
              disabled={!workbench}
              triggerProps={{ iconFrameType: 'secondary', size: 'large' }}
              onSelectionChange={handleMoreMenuSelection}
            >
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
    useMemo(() => getWorkbenchBreadcrumbs(workbench), [workbench])
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
