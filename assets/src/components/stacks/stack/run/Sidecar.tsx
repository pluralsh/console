import { ReactNode } from 'react'
import {
  Button,
  ReloadIcon,
  Sidecar,
  SidecarItem,
} from '@pluralsh/design-system'

import { useTheme } from 'styled-components'
import moment from 'moment'
import { useNavigate, useParams } from 'react-router-dom'
import { getStackRunsAbsPath } from 'routes/stacksRoutesConsts'
import { GqlError } from 'components/utils/Alert'

import { StackRun,
  StackStatus,
  useApproveStackRunMutation,
  useRestartStackRunMutation } from '../../../../generated/graphql'
import { ResponsiveLayoutSidecarContainer } from '../../../utils/layout/ResponsiveLayoutSidecarContainer'
import UserInfo from '../../../utils/UserInfo'
import { ClusterProviderIcon } from '../../../utils/Provider'

interface StackRunSidecarProps {
  stackRun: StackRun
  refetch?: Nullable<() => void>
}

const TERMINAL_STATES = [
  StackStatus.Successful,
  StackStatus.Cancelled,
  StackStatus.Failed,
]

export default function StackRunSidecar({
  stackRun,
  refetch,
}: StackRunSidecarProps): ReactNode {
  const { stackId } = useParams()
  const theme = useTheme()
  const navigate = useNavigate()

  const [mutation, { loading, error }] = useApproveStackRunMutation({
    variables: { id: stackRun.id },
    onCompleted: () => refetch?.(),
  })

  const [restart, { loading: restartLoading, error: restartError }] =
    useRestartStackRunMutation({
      variables: { id: stackRun.id },
      onCompleted: ({ restartStackRun }) =>
        navigate(getStackRunsAbsPath(stackId, restartStackRun?.id)),
    })

  const terminal = TERMINAL_STATES.includes(stackRun.status)

  if (error) return <GqlError error={error} />
  if (restartError) return <GqlError error={restartError} />

  return (
    <ResponsiveLayoutSidecarContainer
      display="flex"
      flexDirection="column"
      gap="small"
    >
      {stackRun.approval && !stackRun.approvedAt && (
        <Button
          onClick={mutation}
          loading={loading}
        >
          Approve Run
        </Button>
      )}
      {terminal && (
        <Button
          secondary
          onClick={restart}
          loading={restartLoading}
          startIcon={<ReloadIcon />}
        >
          Restart Run
        </Button>
      )}
      <Sidecar>
        <SidecarItem heading="Status">
          <StackRunStatusChip
            status={stackRun.status}
            size="small"
          />
        </SidecarItem>
        <SidecarItem heading="Needs approval">
          {stackRun.approval ? 'Required' : 'Not required'}
        </SidecarItem>
        {stackRun.approvedAt && (
          <SidecarItem heading="Approved at">
            {moment(stackRun.approvedAt).format('lll')}
          </SidecarItem>
        )}
        {stackRun.approver && (
          <SidecarItem heading="Approver">
            <UserInfo user={stackRun.approver} />
          </SidecarItem>
        )}
        {stackRun.message && (
          <SidecarItem heading="Commit message">{stackRun.message}</SidecarItem>
        )}
        <SidecarItem heading="Cluster">
          <div css={{ display: 'flex', gap: theme.spacing.xsmall }}>
            <ClusterProviderIcon
              cluster={stackRun?.cluster}
              size={16}
            />
            {stackRun?.cluster?.name}
          </div>
        </SidecarItem>
        <SidecarItem heading="Repository">
          {stackRun.repository?.url}
        </SidecarItem>
        <SidecarItem heading="Created at">
          {moment(stackRun.insertedAt).format('lll')}
        </SidecarItem>
        <SidecarItem heading="Updated at">
          {moment(stackRun.updatedAt).format('lll')}
        </SidecarItem>
      </Sidecar>
    </ResponsiveLayoutSidecarContainer>
  )
}
