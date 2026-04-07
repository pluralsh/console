import {
  Button,
  Divider,
  EmptyState,
  Flex,
  ListBoxItem,
  ReturnIcon,
  TrashCanIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
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
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  getWorkbenchAbsPath,
  WORKBENCH_PARAM_ID,
  WORKBENCHES_ABS_PATH,
  WORKBENCHES_EDIT_REL_PATH,
  WORKBENCHES_CRON_SCHEDULES_REL_PATH,
  WORKBENCHES_WEBHOOK_TRIGGERS_REL_PATH,
} from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { WorkbenchJobCreateInput } from './WorkbenchJobCreateInput'
import { WorkbenchJobsTable } from './WorkbenchJobsTable'

export const getWorkbenchBreadcrumbs = (
  workbench: Nullable<WorkbenchTinyFragment>
) => [
  { label: 'workbenches', url: WORKBENCHES_ABS_PATH },
  ...(workbench
    ? [{ label: workbench.name, url: getWorkbenchAbsPath(workbench?.id) }]
    : []),
]

export function Workbench() {
  const id = useParams()[WORKBENCH_PARAM_ID]
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
    <WrapperSC>
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
      <WorkbenchJobCreateInput
        workbenchId={id}
        workbenchLoading={isLoading}
      />
      <Divider backgroundColor="border" />
      <StackedText
        first="Workbench jobs"
        firstPartialType="body2Bold"
        firstColor="text"
        second="Current and previous jobs"
        secondPartialType="body2"
        secondColor="text-light"
      />
      <WorkbenchJobsTable workbenchId={id} />
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
  )
}

const WrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.large,
  padding: theme.spacing.large,
  minHeight: 0,
}))
