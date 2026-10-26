import {
  Button,
  Callout,
  CheckIcon,
  GitCommitIcon,
  GraphQLToast,
  ReloadIcon,
} from '@pluralsh/design-system'

import {
  ServiceErrorsChip,
  ServiceErrorsModal,
} from 'components/cd/services/ServicesTableErrors'
import { InsightsTabLabel } from 'components/utils/AiInsights'
import { isEmpty } from 'lodash'
import { ReactNode, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTheme } from 'styled-components'
import {
  StackRunDetailsFragment,
  StackStatus,
  useApproveStackRunMutation,
  useCompleteStackRunMutation,
  useRestartStackRunMutation,
} from '../../../generated/graphql'
import {
  getStackRunsAbsPath,
  STACK_RUNS_INSIGHTS_REL_PATH,
  STACK_RUNS_JOB_REL_PATH,
  STACK_RUNS_OUTPUT_REL_PATH,
  STACK_RUNS_PLAN_REL_PATH,
  STACK_RUNS_REPOSITORY_REL_PATH,
  STACK_RUNS_STATE_REL_PATH,
  STACK_RUNS_VIOLATIONS_REL_PATH,
} from '../../../routes/stacksRoutesConsts'
import { TRUNCATE } from '../../utils/truncate'
import StackRunIcon from '../common/StackRunIcon.tsx'

export function getStackRunDirectory(stackRun: StackRunDetailsFragment) {
  return [
    { path: '', label: 'Progress' },
    {
      path: STACK_RUNS_INSIGHTS_REL_PATH,
      label: <InsightsTabLabel insight={stackRun.insight} />,
    },
    { path: STACK_RUNS_REPOSITORY_REL_PATH, label: 'Repository' },
    {
      path: STACK_RUNS_STATE_REL_PATH,
      label: 'State',
      condition: (s: StackRunDetailsFragment) => !isEmpty(s.state?.state),
    },
    {
      path: STACK_RUNS_PLAN_REL_PATH,
      label: 'Plan',
      condition: (s: StackRunDetailsFragment) => !isEmpty(s.state?.plan),
    },
    {
      path: STACK_RUNS_OUTPUT_REL_PATH,
      label: 'Output',
      condition: (s: StackRunDetailsFragment) => !isEmpty(s.output),
    },
    { path: STACK_RUNS_JOB_REL_PATH, label: 'Job' },
    {
      path: STACK_RUNS_VIOLATIONS_REL_PATH,
      label: 'Violations',
      condition: (s: StackRunDetailsFragment) => !isEmpty(s.violations),
    },
  ]
}

const TERMINAL_STATES = [
  StackStatus.Successful,
  StackStatus.Cancelled,
  StackStatus.Failed,
]

interface StackRunHeaderProps {
  stackRun: StackRunDetailsFragment
  refetch?: Nullable<() => void>
}

export default function StackRunHeader({
  stackRun,
}: {
  stackRun: StackRunDetailsFragment
}): ReactNode {
  const theme = useTheme()

  return (
    <div
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.medium,
        marginBottom: theme.spacing.medium,
      }}
    >
      <div
        css={{
          display: 'flex',
          gap: theme.spacing.medium,
          paddingBottom: theme.spacing.medium,
          borderBottom: theme.borders.default,
        }}
      >
        <StackRunIcon
          status={stackRun.status}
          deleting={stackRun.stack?.deleteRun?.id === stackRun.id}
          size="small"
        />
        <StackRunHeaderInfo stackRun={stackRun} />
      </div>
      {stackRun.cancellationReason && (
        <Callout
          title="This run has been cancelled"
          severity="neutral"
        >
          {stackRun.cancellationReason}
        </Callout>
      )}
    </div>
  )
}

function StackRunHeaderInfo({ stackRun }): ReactNode {
  const theme = useTheme()

  return (
    <div
      css={{
        display: 'flex',
        flex: 1,
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <span
        css={{
          ...theme.partials.text.subtitle1,
          ...TRUNCATE,
        }}
      >
        {stackRun.message}
      </span>
      <span
        css={{
          ...theme.partials.text.body2,
          ...TRUNCATE,
          color: theme.colors['text-light'],
        }}
      >
        {stackRun.repository?.url}
      </span>
      <span
        css={{
          ...theme.partials.text.caption,
          ...TRUNCATE,
          display: 'flex',
          color: theme.colors['text-xlight'],
          gap: theme.spacing.xsmall,
          marginTop: theme.spacing.xxsmall,
        }}
      >
        <GitCommitIcon />
        {stackRun.git?.ref}
        {stackRun.committer && <span>{stackRun.committer}</span>}
      </span>
    </div>
  )
}

export function StackRunHeaderButtons({
  stackRun,
  refetch,
}: StackRunHeaderProps) {
  const theme = useTheme()
  const navigate = useNavigate()
  const { stackId } = useParams()
  const [serviceErrorsOpen, setServiceErrorsOpen] = useState(false)

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

  const [cancel, { loading: cancelLoading, error: cancelError }] =
    useCompleteStackRunMutation({
      variables: {
        id: stackRun.id,
        attributes: {
          status: StackStatus.Cancelled,
        },
      },
      onCompleted: () => refetch?.(),
    })

  const terminal = TERMINAL_STATES.includes(stackRun.status)

  return (
    <>
      {error && (
        <GraphQLToast
          error={{ graphQLErrors: [...(error?.graphQLErrors ?? [])] }}
          header="Error (500)"
          margin="xlarge"
          marginTop="xxxlarge"
          marginBottom="xxxlarge"
        />
      )}
      {restartError && (
        <GraphQLToast
          error={{ graphQLErrors: [...(restartError?.graphQLErrors ?? [])] }}
          header="Error (500)"
          margin="xlarge"
          marginTop="xxxlarge"
          marginBottom="xxxlarge"
        />
      )}
      {cancelError && (
        <GraphQLToast
          error={{ graphQLErrors: [...(cancelError?.graphQLErrors ?? [])] }}
          header="Error (500)"
          margin="xlarge"
          marginTop="xxxlarge"
          marginBottom="xxxlarge"
        />
      )}
      <div
        css={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.small,
        }}
      >
        {!isEmpty(stackRun.errors) && (
          <>
            <ServiceErrorsChip
              onClick={() => setServiceErrorsOpen(true)}
              clickable
              errors={stackRun.errors}
            />
            <ServiceErrorsModal
              isOpen={serviceErrorsOpen}
              setIsOpen={setServiceErrorsOpen}
              header="Service errors"
              errors={stackRun.errors}
            />
          </>
        )}
        {terminal && (
          <Button
            secondary
            small
            onClick={() => restart()}
            loading={restartLoading}
            startIcon={<ReloadIcon size={12} />}
          >
            Restart Run
          </Button>
        )}
        {!terminal && (
          <Button
            secondary
            small
            onClick={() => cancel()}
            loading={cancelLoading}
          >
            Cancel
          </Button>
        )}
        {stackRun.status === StackStatus.PendingApproval &&
          (stackRun.approvedAt ? (
            <Button
              small
              disabled
              startIcon={<CheckIcon size={12} />}
            >
              Approved
            </Button>
          ) : (
            <Button
              small
              onClick={() => mutation()}
              loading={loading}
            >
              Approve
            </Button>
          ))}
      </div>
    </>
  )
}
