import { ReactNode, useMemo, useRef } from 'react'
import { useTheme } from 'styled-components'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  AppIcon,
  Button,
  GitCommitIcon,
  GraphQLToast,
  ReloadIcon,
  SubTab,
  TabList,
} from '@pluralsh/design-system'

import {
  StackRun,
  StackStatus,
  useApproveStackRunMutation,
  useRestartStackRunMutation,
  useUpdateStackRunMutation,
} from '../../../generated/graphql'
import {
  STACK_RUNS_OUTPUT_REL_PATH,
  STACK_RUNS_PLAN_REL_PATH,
  STACK_RUNS_REPOSITORY_REL_PATH,
  STACK_RUNS_STATE_REL_PATH,
  getStackRunsAbsPath,
} from '../../../routes/stacksRoutesConsts'
import { LinkTabWrap } from '../../utils/Tabs'
import { StackTypeIcon } from '../common/StackTypeIcon'
import { TRUNCATE } from '../../utils/truncate'

const DIRECTORY = [
  { path: '', label: 'Progress' },
  { path: STACK_RUNS_REPOSITORY_REL_PATH, label: 'Repository' },
  { path: STACK_RUNS_STATE_REL_PATH, label: 'State' },
  { path: STACK_RUNS_PLAN_REL_PATH, label: 'Plan' },
  { path: STACK_RUNS_OUTPUT_REL_PATH, label: 'Output' },
]

const TERMINAL_STATES = [
  StackStatus.Successful,
  StackStatus.Cancelled,
  StackStatus.Failed,
]

interface StackRunHeaderProps {
  stackRun: StackRun
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
      <StackRunNav />
    </div>
  )
}

function StackRunHeaderInfo({ stackRun }): ReactNode {
  const theme = useTheme()

  return (
    <div
      css={{
        display: 'flex',
        flex: '1 1 auto',
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

function StackRunHeaderButtons({ stackRun, refetch }): ReactNode {
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
        navigate(getStackRunsAbsPath(stackRun.id, restartStackRun?.id)),
    })

  const [cancel, { loading: cancelLoading }] = useUpdateStackRunMutation({
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

function StackRunNav(): ReactNode {
  const { pathname } = useLocation()
  const tabStateRef = useRef<any>(null)
  const currentTab = useMemo(
    () =>
      DIRECTORY.find((d) => d.path && pathname.endsWith(d.path)) ??
      DIRECTORY[0],
    [pathname]
  )

  return (
    <TabList
      scrollable
      gap="xxsmall"
      stateRef={tabStateRef}
      stateProps={{
        orientation: 'horizontal',
        selectedKey: currentTab?.path,
      }}
    >
      {DIRECTORY.map(({ label, path }) => (
        <LinkTabWrap
          subTab
          key={path}
          textValue={label}
          to={path}
        >
          <SubTab
            key={path}
            textValue={label}
          >
            {label}
          </SubTab>
        </LinkTabWrap>
      ))}
    </TabList>
  )
}
