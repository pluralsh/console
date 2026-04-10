import {
  Button,
  EmptyState,
  Flex,
  ListBoxItem,
  ReturnIcon,
  TrashCanIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import { SubTabs } from 'components/utils/SubTabs'
import { GqlError } from 'components/utils/Alert'
import { Confirm } from 'components/utils/Confirm'
import { MoreMenu } from 'components/utils/MoreMenu'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { StretchedFlex } from 'components/utils/StretchedFlex'
import { StackedText } from 'components/utils/table/StackedText'
import {
  useDeleteWorkbenchMutation,
  useWorkbenchQuery,
  WorkbenchTinyFragment,
} from 'generated/graphql'
import { useMemo, useState } from 'react'
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
  WORKBENCHES_WEBHOOK_TRIGGERS_REL_PATH,
  WORKBENCHES_ALERTS_REL_PATH,
  WORKBENCHES_ISSUES_REL_PATH,
} from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { WorkbenchSidePanel } from './WorkbenchSidePanel'

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

export function Workbench() {
  const id = useParams()[WORKBENCH_PARAM_ID]
  const { tab = '' } =
    useMatch(`${WORKBENCHES_ABS_PATH}/:${WORKBENCH_PARAM_ID}/:tab?/*`)
      ?.params ?? {}
  const navigate = useNavigate()
  const { popToast } = useSimpleToast()
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  const { data, loading, error } = useWorkbenchQuery({ variables: { id } })
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
          color: 'icon-danger',
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
      direction="row"
      gap="large"
      css={{
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <WorkbenchSidePanel workbenchId={id} />
      <WrapperSC>
        <SubTabs
          directory={directory}
          activeFn={(path) => path === tab}
        />
        <StretchedFlex>
          <StackedText
            loading={isLoading}
            first={workbench?.name}
            firstPartialType="subtitle2"
            firstColor="text"
            second={workbench?.description}
            secondPartialType="body2"
            secondColor="text-xlight"
            gap="xxsmall"
          />
          <Flex gap="small">
            <Button
              small
              secondary
              as={Link}
              to={WORKBENCHES_EDIT_REL_PATH}
            >
              Edit
            </Button>
            <Button
              small
              secondary
              as={Link}
              to={WORKBENCHES_CRON_SCHEDULES_REL_PATH}
            >
              Crons
            </Button>
            <Button
              small
              secondary
              as={Link}
              to={WORKBENCHES_WEBHOOK_TRIGGERS_REL_PATH}
            >
              Webhooks
            </Button>
            <MoreMenu
              disabled={!workbench}
              triggerProps={{ iconFrameType: 'secondary' }}
              onSelectionChange={() => setDeleteModalOpen(true)}
            >
              <ListBoxItem
                key="delete"
                destructive
                leftContent={<TrashCanIcon color="icon-danger" />}
                label="Delete workbench"
              />
            </MoreMenu>
          </Flex>
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
  overflow: 'hidden',
  padding: theme.spacing.large,
}))
