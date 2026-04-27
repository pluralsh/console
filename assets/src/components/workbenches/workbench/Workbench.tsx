import {
  BookmarkIcon,
  Button,
  EmptyState,
  EventScheduleIcon,
  Flex,
  ListBoxItem,
  ReturnIcon,
  TrashCanIcon,
  useSetBreadcrumbs,
  WebhooksIcon,
  ToolsIcon,
} from '@pluralsh/design-system'
import { SubTabs } from 'components/utils/SubTabs'
import { GqlError } from 'components/utils/Alert'
import { Confirm } from 'components/utils/Confirm'
import { MoreMenu } from 'components/utils/MoreMenu'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import {
  useDeleteWorkbenchMutation,
  useWorkbenchQuery,
  WorkbenchTinyFragment,
} from 'generated/graphql'
import { Key, useMemo, useState } from 'react'
import {
  Link,
  Outlet,
  useMatch,
  useNavigate,
  useParams,
} from 'react-router-dom'
import {
  getWorkbenchAbsPath,
  WORKBENCH_PARAM_ID,
  WORKBENCHES_ABS_PATH,
  WORKBENCHES_EDIT_REL_PATH,
  WORKBENCHES_CRON_SCHEDULES_REL_PATH,
  WORKBENCHES_SAVED_PROMPTS_REL_PATH,
  WORKBENCHES_WEBHOOK_TRIGGERS_REL_PATH,
  WORKBENCHES_ALERTS_REL_PATH,
  WORKBENCHES_ISSUES_REL_PATH,
} from 'routes/workbenchesRoutesConsts'
import styled, { useTheme } from 'styled-components'
import { WorkbenchSidePanel } from './WorkbenchSidePanel'
import { WorkbenchToolsEditModal } from './WorkbenchToolsEditModal'
import { Subtitle2H1 } from 'components/utils/typography/Text'
import { TRUNCATE } from 'components/utils/truncate'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'

const directory = [
  { label: 'Jobs', path: '' },
  { label: 'Issues', path: WORKBENCHES_ISSUES_REL_PATH },
  { label: 'Alerts', path: WORKBENCHES_ALERTS_REL_PATH },
]

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
}

export enum WorkbenchMoreMenuKey {
  Cron = 'cron',
  Webhook = 'webhook',
  Tools = 'tools',
  SavedPrompts = 'saved-prompts',
  Delete = 'delete',
}

export function Workbench() {
  const theme = useTheme()
  const id = useParams()[WORKBENCH_PARAM_ID]
  const { tab = '' } =
    useMatch(`${WORKBENCHES_ABS_PATH}/:${WORKBENCH_PARAM_ID}/:tab?/*`)
      ?.params ?? {}
  const navigate = useNavigate()
  const { popToast } = useSimpleToast()
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [toolsEditOpen, setToolsEditOpen] = useState(false)

  const handleMoreMenuSelection = (selectedKey: Key) => {
    switch (selectedKey) {
      case WorkbenchMoreMenuKey.Cron:
        navigate(WORKBENCHES_CRON_SCHEDULES_REL_PATH)
        return
      case WorkbenchMoreMenuKey.Webhook:
        navigate(WORKBENCHES_WEBHOOK_TRIGGERS_REL_PATH)
        return
      case WorkbenchMoreMenuKey.Tools:
        setToolsEditOpen(true)
        return
      case WorkbenchMoreMenuKey.SavedPrompts:
        navigate(WORKBENCHES_SAVED_PROMPTS_REL_PATH)
        return
      case WorkbenchMoreMenuKey.Delete:
        setDeleteModalOpen(true)
        return
      default:
        return
    }
  }

  const { data, loading, error } = useWorkbenchQuery({
    variables: { id },
    fetchPolicy: 'cache-and-network',
  })
  const isLoading = !data && loading
  const workbench = data?.workbench

  const [deleteWorkbench, { loading: deleteLoading, error: deleteError }] =
    useDeleteWorkbenchMutation({
      awaitRefetchQueries: true,
      refetchQueries: ['Workbenches'],
      onCompleted: () => {
        setDeleteModalOpen(false)
        navigate(WORKBENCHES_ABS_PATH)
        popToast({
          name: workbench?.name,
          action: 'deleted',
          severity: 'danger',
        })
      },
    })

  useSetBreadcrumbs(
    useMemo(() => getWorkbenchBreadcrumbs(workbench), [workbench])
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
    <Flex
      height="100%"
      minHeight={0}
      overflow="hidden"
    >
      <WorkbenchSidePanel
        workbenchId={id}
        onOpenToolsEdit={() => setToolsEditOpen(true)}
      />
      <WrapperSC>
        <Flex
          align="center"
          gap="small"
        >
          <SubTabs
            directory={directory}
            activeFn={(path) => path === tab}
          />
          <Flex grow={1} />
          <Button
            secondary
            as={Link}
            to={WORKBENCHES_EDIT_REL_PATH}
          >
            Edit workbench
          </Button>
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
              key={WorkbenchMoreMenuKey.Delete}
              destructive
              leftContent={<TrashCanIcon color="icon-danger" />}
              label="Delete workbench"
            />
          </MoreMenu>
        </Flex>
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
        <Outlet context={{ workbenchId: id, isLoading }} />
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
      </WrapperSC>
    </Flex>
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  gap: theme.spacing.large,
  minHeight: 0,
  minWidth: 0,
  overflow: 'auto',
  padding: theme.spacing.large,
}))
