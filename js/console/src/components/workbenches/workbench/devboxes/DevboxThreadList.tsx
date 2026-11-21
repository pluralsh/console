import {
  BotIcon,
  Button,
  Chip,
  CloseIcon,
  EditIcon,
  Flex,
  GitForkIcon,
  ICON_FRAME_ICON_SIZE,
  Input,
  ListBoxItem,
  Modal,
  PlayIcon,
  Tooltip,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { PrStatusIcon } from 'components/workbenches/common/WorkbenchJobPrIcon'
import { ApolloError } from '@apollo/client'
import usePersistedState from 'components/hooks/usePersistedState'
import { ProgressRingGlyph } from 'components/workbenches/common/IssueStatusGlyph'
import {
  ListGroup,
  ListGroupHeader,
} from 'components/workbenches/common/WorkbenchGroupedList'
import { GqlError } from 'components/utils/Alert'
import { Confirm } from 'components/utils/Confirm'
import { MoreMenu } from 'components/utils/MoreMenu'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { TRUNCATE } from 'components/utils/truncate'
import { CaptionP } from 'components/utils/typography/Text'
import {
  DevboxAgentType,
  DevboxInstanceFragment,
  DevboxPullRequestFragment,
  DevboxThreadFragment,
  DevboxThreadStage,
  PrStatus,
  useCloseDevboxThreadMutation,
  useDeleteDevboxThreadMutation,
  useDevboxImportableSessionsQuery,
  useForkDevboxThreadMutation,
  useImportDevboxThreadMutation,
  useRenameDevboxThreadMutation,
  useResumeDevboxThreadMutation,
  WorkbenchJobStatus,
} from 'generated/graphql'
import { ReactNode, useMemo, useState } from 'react'
import { JOB_STATUS_COLORS, JobStatusIcon } from '../WorkbenchJobsGroupedList'
import styled from 'styled-components'
import { fromNow } from 'utils/datetime'
import { isNonNullable } from 'utils/isNonNullable'
import { isUnsupportedError } from './devboxErrors'
import {
  openPullRequestsByThread,
  useDevboxPullRequests,
} from './devboxPullRequests'
import { agentLabel } from './devboxStartForm'
import {
  availableThreadActions,
  buildThreadTree,
  capabilitiesFor,
  DevboxThreadAction,
  DevboxThreadNode,
  DevboxThreadState,
  groupThreadsByStage,
  threadState,
  threadTitle,
} from './devboxThreads'

const COLLAPSED_STAGES_KEY = 'plural-devbox-collapsed-thread-stages'

// running and completed read like the matching job statuses; needs review is
// Linear's In Review ring
const STAGE_STYLES: Record<
  DevboxThreadStage,
  Pick<ListGroup<DevboxThreadStage>, 'icon' | 'color'>
> = {
  [DevboxThreadStage.NeedsReview]: {
    color: 'icon-warning',
    icon: (
      <ProgressRingGlyph
        progress={0.75}
        color="icon-warning"
      />
    ),
  },
  [DevboxThreadStage.Running]: {
    color: JOB_STATUS_COLORS[WorkbenchJobStatus.Running],
    icon: <JobStatusIcon status={WorkbenchJobStatus.Running} />,
  },
  [DevboxThreadStage.Completed]: {
    color: JOB_STATUS_COLORS[WorkbenchJobStatus.Successful],
    icon: <JobStatusIcon status={WorkbenchJobStatus.Successful} />,
  },
}

// the group already says running, idle or closed; only these add anything
const STATE_SEVERITY: Partial<
  Record<DevboxThreadState, 'warning' | 'neutral'>
> = { 'needs you': 'warning', waiting: 'neutral' }

const ACTION_LABELS: Record<DevboxThreadAction, string> = {
  rename: 'Rename',
  fork: 'Fork',
  close: 'Close',
  resume: 'Resume',
  delete: 'Delete',
}

const ACTION_ICONS: Record<DevboxThreadAction, ReactNode> = {
  rename: <EditIcon size={ICON_FRAME_ICON_SIZE.small} />,
  fork: <GitForkIcon size={ICON_FRAME_ICON_SIZE.small} />,
  close: <CloseIcon size={ICON_FRAME_ICON_SIZE.small} />,
  resume: <PlayIcon size={ICON_FRAME_ICON_SIZE.small} />,
  delete: (
    <TrashCanIcon
      size={ICON_FRAME_ICON_SIZE.small}
      color="icon-danger"
    />
  ),
}

export function DevboxThreadList({
  instance,
  selectedThreadId,
  onSelect,
  disabled,
}: {
  instance: DevboxInstanceFragment
  selectedThreadId: Nullable<string>
  onSelect: (threadId: string) => void
  disabled?: boolean
}) {
  const { popToast } = useSimpleToast()
  const agents = instance.devbox?.agents
  const tree = buildThreadTree(instance.threads)
  const unread = useUnreadThreads(
    (instance.threads ?? []).filter(isNonNullable),
    selectedThreadId
  )
  const { pullRequests } = useDevboxPullRequests(instance.id)
  const openPrs = useMemo(
    () => openPullRequestsByThread(pullRequests),
    [pullRequests]
  )
  const [renaming, setRenaming] = useState<Nullable<DevboxThreadFragment>>(null)
  const [deleting, setDeleting] = useState<Nullable<DevboxThreadFragment>>(null)
  const [collapsed, setCollapsed] = usePersistedState<DevboxThreadStage[]>(
    COLLAPSED_STAGES_KEY,
    [DevboxThreadStage.Completed]
  )
  // per agent: actions that came back UNSUPPORTED at runtime
  const [unsupported, setUnsupported] = useState<
    Partial<Record<DevboxAgentType, Set<DevboxThreadAction>>>
  >({})

  const onActionError =
    (thread: DevboxThreadFragment, action: DevboxThreadAction) =>
    (error: ApolloError) => {
      if (isUnsupportedError(error) && thread.agent) {
        const agent = thread.agent
        setUnsupported((u) => ({
          ...u,
          [agent]: new Set([...(u[agent] ?? []), action]),
        }))
        popToast({
          content: `${agentLabel(agent)} doesn't support ${action} here`,
          severity: 'info',
        })
      } else popToast({ content: error.message, severity: 'danger' })
    }

  const [fork] = useForkDevboxThreadMutation()
  const [close] = useCloseDevboxThreadMutation()
  const [resume] = useResumeDevboxThreadMutation()
  const [del, delState] = useDeleteDevboxThreadMutation()

  const run = (thread: DevboxThreadFragment, action: DevboxThreadAction) => {
    const variables = { id: thread.id }
    const onError = onActionError(thread, action)
    switch (action) {
      case 'rename':
        return setRenaming(thread)
      case 'delete':
        return setDeleting(thread)
      case 'fork':
        return fork({
          variables: { ...variables, title: `${threadTitle(thread)} (fork)` },
          onCompleted: (d) =>
            d.forkDevboxThread?.id && onSelect(d.forkDevboxThread.id),
          onError,
        })
      case 'close':
        return close({ variables, onError })
      case 'resume':
        return resume({ variables, onError })
    }
  }

  if (!tree.length)
    return <EmptySC $color="text-xlight">No threads yet</EmptySC>

  const renderThread = (thread: DevboxThreadNode) => {
    const actions = availableThreadActions(
      thread,
      capabilitiesFor(agents, thread.agent),
      thread.agent ? unsupported[thread.agent] : undefined
    )
    return (
      <div key={thread.id}>
        <ThreadRow
          thread={thread}
          selected={thread.id === selectedThreadId}
          unread={unread.has(thread.id)}
          openPrs={openPrs.get(thread.id)}
          onSelect={() => onSelect(thread.id)}
          actions={
            actions.length && !disabled ? (
              <MoreMenu
                triggerProps={{ size: 'small' }}
                onSelectionChange={(key) =>
                  run(thread, key as DevboxThreadAction)
                }
              >
                {actions.map((action) => (
                  <ListBoxItem
                    key={action}
                    label={ACTION_LABELS[action]}
                    leftContent={ACTION_ICONS[action]}
                    destructive={action === 'delete'}
                  />
                ))}
              </MoreMenu>
            ) : null
          }
        />
        {thread.children.map((child) => (
          <ThreadRow
            key={child.id}
            nested
            thread={child}
            selected={child.id === selectedThreadId}
            unread={unread.has(child.id)}
            openPrs={openPrs.get(child.id)}
            onSelect={() => onSelect(child.id)}
          />
        ))}
      </div>
    )
  }

  return (
    <ListSC>
      {groupThreadsByStage(tree).map((group) => {
        const holdsSelected = group.threads.some(
          (t) =>
            t.id === selectedThreadId ||
            t.children.some((c) => c.id === selectedThreadId)
        )
        const open = holdsSelected || !collapsed.includes(group.stage)
        return (
          <div key={group.stage}>
            <GroupHeaderWrapSC>
              <ListGroupHeader
                group={{
                  key: group.stage,
                  label: group.label,
                  count: group.threads.length,
                  ...STAGE_STYLES[group.stage],
                }}
                collapsed={!open}
                onToggle={() =>
                  setCollapsed(
                    collapsed.includes(group.stage)
                      ? collapsed.filter((s) => s !== group.stage)
                      : [...collapsed, group.stage]
                  )
                }
              />
            </GroupHeaderWrapSC>
            {open && group.threads.map(renderThread)}
          </div>
        )
      })}
      {renaming && (
        <RenameThreadModal
          thread={renaming}
          onClose={() => setRenaming(null)}
        />
      )}
      <Confirm
        open={!!deleting}
        close={() => setDeleting(null)}
        destructive
        label="Delete"
        title="Delete thread"
        text={`Delete "${deleting ? threadTitle(deleting) : ''}"? Its transcript stays archived for audit but disappears from the instance.`}
        loading={delState.loading}
        error={delState.error}
        submit={() =>
          deleting &&
          del({
            variables: { id: deleting.id },
            onCompleted: () => setDeleting(null),
            onError: (e) => {
              if (isUnsupportedError(e)) {
                onActionError(deleting, 'delete')(e)
                setDeleting(null)
              }
            },
          })
        }
      />
    </ListSC>
  )
}

// a thread is unread when it has activity the viewer hasn't opened since
function useUnreadThreads(
  threads: { id: string; lastActivityAt?: Nullable<string> }[],
  selectedId: Nullable<string>
) {
  // the last activity the user saw per thread; first sight counts as read
  const [seen, setSeen] = useState<Record<string, string>>({})
  const newlySeen = Object.fromEntries(
    threads
      .filter((t) => !(t.id in seen) || t.id === selectedId)
      .map((t) => [t.id, t.lastActivityAt ?? ''])
      .filter(([id, activity]) => seen[id] !== activity)
  )
  if (Object.keys(newlySeen).length) setSeen({ ...seen, ...newlySeen })
  return new Set(
    threads
      .filter(
        (t) =>
          t.id !== selectedId &&
          t.id in seen &&
          (t.lastActivityAt ?? '') > seen[t.id]
      )
      .map((t) => t.id)
  )
}

function ThreadRow({
  thread,
  selected,
  unread,
  nested = false,
  openPrs,
  onSelect,
  actions,
}: {
  thread: DevboxThreadFragment
  selected: boolean
  unread: boolean
  nested?: boolean
  openPrs?: DevboxPullRequestFragment[]
  onSelect: () => void
  actions?: React.ReactNode
}) {
  const state = threadState(thread)
  return (
    <ThreadRowSC
      $selected={selected}
      $nested={nested}
    >
      <ThreadButtonSC
        type="button"
        onClick={onSelect}
        aria-current={selected}
      >
        <Flex
          gap="xsmall"
          align="center"
          css={{ minWidth: 0 }}
        >
          {nested && <BotIcon size={10} />}
          {unread && <UnreadDotSC aria-label="unread" />}
          <ThreadTitleSC $unread={unread}>{threadTitle(thread)}</ThreadTitleSC>
          {STATE_SEVERITY[state] && (
            <Chip
              size="small"
              severity={STATE_SEVERITY[state]}
            >
              {state}
            </Chip>
          )}
        </Flex>
        <ThreadMetaSC>
          {agentLabel(thread.agent)}
          {thread.lastActivityAt ? ` · ${fromNow(thread.lastActivityAt)}` : ''}
        </ThreadMetaSC>
      </ThreadButtonSC>
      {!!openPrs?.length && (
        <Tooltip
          label={`Open ${openPrs.length === 1 ? 'pull request' : 'pull requests'}: ${openPrs.map((pr) => pr.title).join(', ')}`}
        >
          <PrBadgeSC aria-label={`${openPrs.length} open pull requests`}>
            <PrStatusIcon
              status={PrStatus.Open}
              size={12}
            />
          </PrBadgeSC>
        </Tooltip>
      )}
      {actions}
    </ThreadRowSC>
  )
}

export function ImportThreadModal({
  instance,
  onClose,
  onImported,
}: {
  instance: DevboxInstanceFragment
  onClose: () => void
  onImported: (threadId: string) => void
}) {
  const { data, loading, error } = useDevboxImportableSessionsQuery({
    variables: { instanceId: instance.id },
    fetchPolicy: 'network-only',
  })
  const sessions = (data?.devboxImportableSessions ?? []).filter(isNonNullable)
  const [importSession, importState] = useImportDevboxThreadMutation({
    onCompleted: (d) => {
      if (d.importDevboxThread?.id) onImported(d.importDevboxThread.id)
      onClose()
    },
  })

  return (
    <Modal
      open
      onClose={onClose}
      header="Import a session"
      size="large"
    >
      <Flex
        direction="column"
        gap="small"
      >
        <CaptionP $color="text-light">
          Sessions the agents already have on this box, e.g. from a CLI run in
          the terminal.
        </CaptionP>
        {error && <GqlError error={error} />}
        {importState.error && <GqlError error={importState.error} />}
        {loading && <CaptionP $color="text-xlight">Loading sessions…</CaptionP>}
        {!loading && !sessions.length && (
          <CaptionP $color="text-xlight">No importable sessions.</CaptionP>
        )}
        {sessions.map((s) => (
          <Flex
            key={`${s.agent}:${s.sessionId}`}
            justify="space-between"
            align="center"
            gap="small"
          >
            <Flex direction="column">
              <span>{s.title || s.sessionId}</span>
              <CaptionP $color="text-xlight">
                {agentLabel(s.agent)}
                {s.cwd ? ` · ${s.cwd}` : ''}
                {s.updatedAt ? ` · ${fromNow(s.updatedAt)}` : ''}
              </CaptionP>
            </Flex>
            <Button
              small
              secondary
              disabled={importState.loading || !s.agent}
              onClick={() =>
                s.agent &&
                importSession({
                  variables: {
                    instanceId: instance.id,
                    attributes: {
                      agent: s.agent,
                      sessionId: s.sessionId,
                      cwd: s.cwd,
                      title: s.title,
                    },
                  },
                })
              }
            >
              Import
            </Button>
          </Flex>
        ))}
      </Flex>
    </Modal>
  )
}

function RenameThreadModal({
  thread,
  onClose,
}: {
  thread: DevboxThreadFragment
  onClose: () => void
}) {
  const [title, setTitle] = useState(threadTitle(thread))
  const [rename, { loading, error }] = useRenameDevboxThreadMutation({
    onCompleted: onClose,
  })
  return (
    <Modal
      open
      onClose={onClose}
      header="Rename thread"
      actions={
        <Flex gap="small">
          <Button
            secondary
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            loading={loading}
            disabled={!title.trim()}
            onClick={() =>
              rename({ variables: { id: thread.id, title: title.trim() } })
            }
          >
            Rename
          </Button>
        </Flex>
      }
    >
      {error && <GqlError error={error} />}
      <Input
        value={title}
        onChange={(e) => setTitle(e.currentTarget.value)}
      />
    </Modal>
  )
}

const ListSC = styled.div({ display: 'flex', flexDirection: 'column' })

const GroupHeaderWrapSC = styled.div(({ theme }) => ({
  position: 'sticky',
  top: 0,
  zIndex: 1,
  display: 'flex',
  flexDirection: 'column',
  padding: `${theme.spacing.xsmall} ${theme.spacing.xsmall} 0`,
  backgroundColor: theme.colors['fill-accent'],
}))

const EmptySC = styled(CaptionP)(({ theme }) => ({
  padding: `${theme.spacing.xsmall} ${theme.spacing.medium}`,
}))

const ThreadRowSC = styled.div<{ $selected: boolean; $nested: boolean }>(
  ({ theme, $selected, $nested }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.xxsmall,
    paddingLeft: $nested ? theme.spacing.xlarge : theme.spacing.medium,
    paddingRight: theme.spacing.xsmall,
    backgroundColor: $selected
      ? theme.colors['fill-zero-selected']
      : 'transparent',
    '&:hover': { backgroundColor: theme.colors['fill-zero-hover'] },
  })
)

const ThreadButtonSC = styled.button(({ theme }) => ({
  ...theme.partials.reset.button,
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xxxsmall,
  padding: `${theme.spacing.xsmall} 0`,
  textAlign: 'left',
  color: theme.colors.text,
}))

const ThreadTitleSC = styled.span<{ $unread: boolean }>(
  ({ theme, $unread }) => ({
    ...TRUNCATE,
    ...($unread ? theme.partials.text.body2Bold : theme.partials.text.body2),
    flex: 1,
    minWidth: 0,
  })
)

const ThreadMetaSC = styled.span(({ theme }) => ({
  ...TRUNCATE,
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
}))

const PrBadgeSC = styled.span({ display: 'flex', flexShrink: 0 })

const UnreadDotSC = styled.span(({ theme }) => ({
  width: 6,
  height: 6,
  borderRadius: '50%',
  flexShrink: 0,
  backgroundColor: theme.colors['icon-info'],
}))
