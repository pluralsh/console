import {
  AppIcon,
  Button,
  Callout,
  GitCommitIcon,
  GraphQLToast,
  ReloadIcon,
  SubTab,
  TabList,
} from '@pluralsh/design-system'
import { ReactNode, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from 'styled-components'

import { isEmpty } from 'lodash'

import {
  ServiceErrorsChip,
  ServiceErrorsModal,
} from 'components/cd/services/ServicesTableErrors'
import { InsightsTabLabel } from 'components/utils/AiInsights'
import {
  StackRunDetailsFragment,
  StackStatus,
  useApproveStackRunMutation,
  useCompleteStackRunMutation,
  useRestartStackRunMutation,
} from '../../../generated/graphql'
import {
  STACK_RUNS_INSIGHTS_REL_PATH,
  STACK_RUNS_JOB_REL_PATH,
  STACK_RUNS_OUTPUT_REL_PATH,
  STACK_RUNS_PLAN_REL_PATH,
  STACK_RUNS_REPOSITORY_REL_PATH,
  STACK_RUNS_STATE_REL_PATH,
  getStackRunsAbsPath,
  STACK_RUNS_VIOLATIONS_REL_PATH,
} from '../../../routes/stacksRoutesConsts'
import { LinkTabWrap } from '../../utils/Tabs'
import { TRUNCATE } from '../../utils/truncate'
import { StackTypeIcon } from '../common/StackTypeIcon'

function getDirectory(stackRun: StackRunDetailsFragment) {
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
  refetch,
}: StackRunHeaderProps): ReactNode {
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
        <AppIcon
          icon={
            <StackTypeIcon
              stackType={stackRun.type}
              size={36}
            />
          }
          size="small"
        />
        <StackRunHeaderInfo stackRun={stackRun} />
        <StackRunHeaderButtons
          stackRun={stackRun}
          refetch={refetch}
        />
      </div>
      {stackRun.cancellationReason && (
        <Callout
          title="This run has been cancelled"
          severity="neutral"
        >
          {stackRun.cancellationReason}
        </Callout>
      )}
      <StackRunNav stackRun={stackRun} />
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
      </span>
    </div>
  )
}

function StackRunHeaderButtons({ stackRun, refetch }: StackRunHeaderProps) {
  const theme = useTheme()
  const navigate = useNavigate()
  const [serviceErrorsOpen, setServiceErrorsOpen] = useState(false)

  const [mutation, { loading, error }] = useApproveStackRunMutation({
    variables: { id: stackRun.id },
    onCompleted: () => refetch?.(),
  })

  const [restart, { loading: restartLoading, error: restartError }] =
    useRestartStackRunMutation({
      variables: { id: stackRun.id },
      onCompleted: ({ restartStackRun }) =>
        navigate(getStackRunsAbsPath(stackRun.id, restartStackRun?.id)),
    })

  const [cancel, { loading: cancelLoading }] = useCompleteStackRunMutation({
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
          marginVertical="xxxlarge"
        />
      )}
      {restartError && (
        <GraphQLToast
          error={{ graphQLErrors: [...(restartError?.graphQLErrors ?? [])] }}
          header="Error (500)"
          margin="xlarge"
          marginVertical="xxxlarge"
        />
      )}
      <div
        css={{
          display: 'flex',
          height: 'fit-content',
          gap: theme.spacing.medium,
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
            onClick={restart}
            loading={restartLoading}
            startIcon={<ReloadIcon />}
          >
            Restart Run
          </Button>
        )}
        {!terminal && (
          <Button
            secondary
            onClick={cancel}
            loading={cancelLoading}
          >
            Cancel
          </Button>
        )}
        {stackRun.status === StackStatus.PendingApproval &&
          !stackRun.approvedAt && (
            <Button
              onClick={mutation}
              loading={loading}
            >
              Approve
            </Button>
          )}
      </div>
    </>
  )
}

function StackRunNav({
  stackRun,
}: {
  stackRun: StackRunDetailsFragment
}): ReactNode {
  const { pathname } = useLocation()
  const tabStateRef = useRef<any>(null)
  const directory = getDirectory(stackRun)
  const currentTab = useMemo(
    () =>
      directory.find((d) => d.path && pathname.includes(d.path)) ??
      directory[0],
    [directory, pathname]
  )

  return (
    <TabList
      scrollable
      stateRef={tabStateRef}
      stateProps={{
        orientation: 'horizontal',
        selectedKey: currentTab?.path,
      }}
    >
      {directory
        .filter((d) => d.condition?.(stackRun) ?? true)
        .map(({ label, path }) => (
          <LinkTabWrap
            subTab
            key={path}
            to={path}
          >
            <SubTab key={path}>{label}</SubTab>
          </LinkTabWrap>
        ))}
    </TabList>
  )
}
