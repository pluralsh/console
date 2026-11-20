import {
  AddIcon,
  Button,
  ICON_FRAME_ICON_SIZE,
  ListBoxFooterPlus,
  ListBoxItem,
  PlusIcon,
  Select,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import {
  DevboxForegroundState,
  DevboxInstanceStatus,
  DevboxInstanceTinyFragment,
  useDevboxInstanceQuery,
  useWorkbenchDevboxInstancesQuery,
} from 'generated/graphql'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  getWorkbenchDevboxInstanceAbsPath,
  getWorkbenchDevboxStartAbsPath,
  WORKBENCH_DEVBOX_POSITION_QUERY_PARAM,
  WORKBENCH_DEVBOX_THREAD_QUERY_PARAM,
} from 'routes/workbenchesRoutesConsts'
import styled, { DefaultTheme, useTheme } from 'styled-components'
import { fromNow } from 'utils/datetime'
import { mapExistingNodes } from 'utils/graphql'
import { isInstanceLive, isInstanceTerminal } from './devboxIdle'
import { DevboxThreadList } from './DevboxThreadList'
import { buildThreadTree, NEW_SESSION, selectedThread } from './devboxThreads'
import { useDevboxWorkbenchDeltas } from './useDevboxWorkbenchDeltas'

export const DEVBOX_SESSIONS_SIDEBAR_WIDTH = 280

export const DEVBOX_SWITCHER_PAGE_SIZE = 100

// live instances first, ended ones last
const rank = (i: DevboxInstanceTinyFragment) =>
  i.foregroundState === DevboxForegroundState.RequiresAction
    ? 0
    : isInstanceTerminal(i.status)
      ? 2
      : 1

export const sortInstances = (instances: DevboxInstanceTinyFragment[]) =>
  instances.toSorted((a, b) => rank(a) - rank(b))

export function DevboxSessionsSidebar({
  workbenchId,
  instanceId,
}: {
  workbenchId: string
  instanceId: Nullable<string>
}) {
  return (
    <WrapperSC>
      <HeaderSC>
        <InstanceSwitcher
          workbenchId={workbenchId}
          instanceId={instanceId}
        />
      </HeaderSC>
      {instanceId ? (
        <InstanceSessions instanceId={instanceId} />
      ) : (
        <HintSC>
          Pick a devbox to start an instance, then open sessions in it.
        </HintSC>
      )}
    </WrapperSC>
  )
}

function InstanceSwitcher({
  workbenchId,
  instanceId,
}: {
  workbenchId: string
  instanceId: Nullable<string>
}) {
  const theme = useTheme()
  const navigate = useNavigate()
  const { data, error, refetch } = useWorkbenchDevboxInstancesQuery({
    variables: { id: workbenchId, first: DEVBOX_SWITCHER_PAGE_SIZE },
    skip: !workbenchId,
    fetchPolicy: 'cache-and-network',
  })
  useDevboxWorkbenchDeltas(workbenchId, { onInstanceListChange: refetch })
  // an ended instance opened by link stays selectable while ended ones are hidden
  const { data: currentData } = useDevboxInstanceQuery({
    variables: { id: instanceId ?? '' },
    skip: !instanceId,
    fetchPolicy: 'cache-first',
  })
  const listed = mapExistingNodes(data?.workbench?.devboxInstances)
  const opened = currentData?.devboxInstance
  const instances = sortInstances(
    opened && !listed.some((i) => i.id === opened.id)
      ? [...listed, opened]
      : listed
  )
  const current = instances.find((i) => i.id === instanceId)

  return (
    <>
      {error && <GqlError error={error} />}
      <Select
        label="Select an instance"
        selectedKey={instanceId ?? null}
        leftContent={
          current && <StatusDotSC $color={statusColor(theme, current)} />
        }
        onSelectionChange={(key) =>
          navigate(
            getWorkbenchDevboxInstanceAbsPath({
              workbenchId,
              instanceId: `${key}`,
            })
          )
        }
        dropdownFooterFixed={
          <ListBoxFooterPlus
            leftContent={
              <AddIcon
                size={16}
                color="text-primary-accent"
              />
            }
            onClick={() =>
              navigate(getWorkbenchDevboxStartAbsPath({ workbenchId }))
            }
          >
            New instance
          </ListBoxFooterPlus>
        }
      >
        {instances.map((i) => (
          <ListBoxItem
            key={i.id}
            label={i.name || i.id.slice(0, 8)}
            description={[
              i.devbox?.name,
              i.status.toLowerCase(),
              fromNow(i.lastActivityAt ?? i.insertedAt),
            ]
              .filter(Boolean)
              .join(' · ')}
            leftContent={<StatusDotSC $color={statusColor(theme, i)} />}
          />
        ))}
      </Select>
    </>
  )
}

function InstanceSessions({ instanceId }: { instanceId: string }) {
  const [params, setParams] = useSearchParams()
  const threadId = params.get(WORKBENCH_DEVBOX_THREAD_QUERY_PARAM)
  // shares the instance view's query, so this costs no extra request
  const { data, loading } = useDevboxInstanceQuery({
    variables: { id: instanceId },
    fetchPolicy: 'cache-first',
  })
  const instance = data?.devboxInstance
  const select = (id: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set(WORKBENCH_DEVBOX_THREAD_QUERY_PARAM, id)
        next.delete(WORKBENCH_DEVBOX_POSITION_QUERY_PARAM)
        return next
      },
      { replace: true }
    )

  if (!instance)
    return loading ? (
      <PaddedSC>
        <RectangleSkeleton
          $height={120}
          $width="100%"
        />
      </PaddedSC>
    ) : null

  const live = isInstanceLive(instance.status)
  // without threads the instance view already shows the new-session composer
  const hasThreads = buildThreadTree(instance.threads).length > 0
  return (
    <>
      <SessionsHeaderSC>
        <span>Sessions</span>
        {hasThreads && (
          <Button
            small
            tertiary
            startIcon={<PlusIcon size={ICON_FRAME_ICON_SIZE.small} />}
            disabled={isInstanceTerminal(instance.status)}
            onClick={() => select(NEW_SESSION)}
          >
            New session
          </Button>
        )}
      </SessionsHeaderSC>
      <ScrollSC>
        <DevboxThreadList
          instance={instance}
          selectedThreadId={selectedThread(instance.threads, threadId)?.id}
          onSelect={select}
          disabled={!live}
        />
      </ScrollSC>
    </>
  )
}

function statusColor(
  theme: DefaultTheme,
  instance: DevboxInstanceTinyFragment
) {
  if (instance.foregroundState === DevboxForegroundState.RequiresAction)
    return theme.colors['icon-warning']
  switch (instance.status) {
    case DevboxInstanceStatus.Running:
    case DevboxInstanceStatus.Snapshotting:
      return theme.colors['icon-success']
    case DevboxInstanceStatus.Pending:
    case DevboxInstanceStatus.Provisioning:
      return theme.colors['icon-info']
    case DevboxInstanceStatus.Failed:
      return theme.colors['icon-danger']
    default:
      return theme.colors['icon-xlight']
  }
}

const WrapperSC = styled.div(({ theme }) => ({
  alignSelf: 'stretch',
  backgroundColor: theme.colors['fill-accent'],
  borderRight: theme.borders.hairline,
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0,
  overflow: 'hidden',
  width: DEVBOX_SESSIONS_SIDEBAR_WIDTH,
}))

const HeaderSC = styled.div(({ theme }) => ({
  padding: theme.spacing.medium,
  borderBottom: theme.borders.hairline,
}))

const SessionsHeaderSC = styled.div(({ theme }) => ({
  ...theme.partials.text.caption,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: `${theme.spacing.small} ${theme.spacing.xsmall} ${theme.spacing.xxsmall} ${theme.spacing.medium}`,
  color: theme.colors['text-xlight'],
}))

const ScrollSC = styled.div(({ theme }) => ({
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  paddingBottom: theme.spacing.medium,
}))

const PaddedSC = styled.div(({ theme }) => ({ padding: theme.spacing.medium }))

const HintSC = styled.p(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
  margin: 0,
  padding: theme.spacing.medium,
}))

const StatusDotSC = styled.span<{ $color: string }>(({ $color }) => ({
  display: 'inline-block',
  width: 8,
  height: 8,
  borderRadius: '50%',
  flexShrink: 0,
  backgroundColor: $color,
}))
