import { ReactNode, useMemo, useRef } from 'react'
import { useTheme } from 'styled-components'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  AppIcon,
  Button,
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
} from '../../../../generated/graphql'
import { StackTypeIcon } from '../../common/StackTypeIcon'
import { LinkTabWrap } from '../../../utils/Tabs'
import { getStackRunsAbsPath } from '../../../../routes/stacksRoutesConsts'
import { GqlError } from '../../../utils/Alert'

const DIRECTORY = [
  { path: '', label: 'Progress' },
  { path: 'repository', label: 'Repository' },
  { path: 'state', label: 'State' },
  { path: 'plan', label: 'Plan' },
  { path: 'output', label: 'Output' },
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
        gap: theme.spacing.xlarge,
        marginBottom: theme.spacing.medium,
      }}
    >
      <div
        css={{
          display: 'flex',
          alignItems: 'center',
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
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
      >
        {stackRun.message}
      </span>
      <span
        css={{
          ...theme.partials.text.body2,
          color: theme.colors['text-light'],
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
      >
        {stackRun.repository?.url}
      </span>
      <span
        css={{
          ...theme.partials.text.caption,
          color: theme.colors['text-xlight'],
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
      >
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
      {error && <GqlError error={error} />}
      {restartError && <GqlError error={restartError} />}
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
