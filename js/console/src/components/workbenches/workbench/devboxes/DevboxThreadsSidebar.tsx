import {
  BotIcon,
  Button,
  Checkbox,
  Chip,
  Flex,
  FormField,
  Input,
  ListBoxItem,
  Modal,
  PlusIcon,
  Select,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { Confirm } from 'components/utils/Confirm'
import { MoreMenu } from 'components/utils/MoreMenu'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { CaptionP } from 'components/utils/typography/Text'
import {
  DevboxAgentType,
  DevboxInstanceFragment,
  DevboxThreadFragment,
  useCloseDevboxThreadMutation,
  useCreateDevboxThreadMutation,
  useDeleteDevboxThreadMutation,
  useDevboxImportableSessionsQuery,
  useForkDevboxThreadMutation,
  useImportDevboxThreadMutation,
  useRenameDevboxThreadMutation,
  useResumeDevboxThreadMutation,
} from 'generated/graphql'
import { ApolloError } from '@apollo/client'
import { useState } from 'react'
import styled from 'styled-components'
import { fromNow } from 'utils/datetime'
import { isNonNullable } from 'utils/isNonNullable'
import { isUnsupportedError } from './devboxErrors'
import {
  agentLabel,
  agentsOf,
  defaultModelOf,
  findAgent,
  modelsOf,
} from './devboxStartForm'
import {
  ALL_REPOSITORIES_CWD,
  availableThreadActions,
  buildThreadTree,
  canImportSessions,
  capabilitiesFor,
  DevboxThreadAction,
  repoCwd,
  threadState,
  threadTitle,
} from './devboxThreads'

const STATE_SEVERITY = {
  running: 'info',
  'needs you': 'warning',
  waiting: 'neutral',
  idle: 'neutral',
  closed: 'neutral',
} as const

export function DevboxThreadsSidebar({
  instance,
  selectedThreadId,
  onSelect,
  unread,
  disabled,
}: {
  instance: DevboxInstanceFragment
  selectedThreadId: Nullable<string>
  onSelect: (threadId: string) => void
  unread: ReadonlySet<string>
  disabled?: boolean
}) {
  const { popToast } = useSimpleToast()
  const agents = instance.devbox?.agents
  const tree = buildThreadTree(instance.threads)
  const [newOpen, setNewOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [renaming, setRenaming] = useState<Nullable<DevboxThreadFragment>>(null)
  const [deleting, setDeleting] = useState<Nullable<DevboxThreadFragment>>(null)
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

  return (
    <SidebarSC>
      <Flex
        justify="space-between"
        align="center"
        gap="xsmall"
      >
        <CaptionP $color="text-light">Threads</CaptionP>
        <Flex gap="xxsmall">
          {canImportSessions(agents) && (
            <Button
              small
              tertiary
              disabled={disabled}
              onClick={() => setImportOpen(true)}
            >
              Import
            </Button>
          )}
          <Button
            small
            secondary
            startIcon={<PlusIcon />}
            disabled={disabled}
            onClick={() => setNewOpen(true)}
          >
            New
          </Button>
        </Flex>
      </Flex>
      {!tree.length && (
        <CaptionP $color="text-xlight">
          No threads yet. Start one to talk to the agent.
        </CaptionP>
      )}
      {tree.map((thread) => {
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
              onSelect={() => onSelect(thread.id)}
              actions={
                actions.length && !disabled ? (
                  <MoreMenu
                    onSelectionChange={(key) =>
                      run(thread, key as DevboxThreadAction)
                    }
                  >
                    {actions.map((action) => (
                      <ListBoxItem
                        key={action}
                        label={ACTION_LABELS[action]}
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
                onSelect={() => onSelect(child.id)}
              />
            ))}
          </div>
        )
      })}
      {newOpen && (
        <NewThreadModal
          instance={instance}
          onClose={() => setNewOpen(false)}
          onCreated={onSelect}
        />
      )}
      {importOpen && (
        <ImportThreadModal
          instance={instance}
          onClose={() => setImportOpen(false)}
          onImported={onSelect}
        />
      )}
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
    </SidebarSC>
  )
}

const ACTION_LABELS: Record<DevboxThreadAction, string> = {
  rename: 'Rename',
  fork: 'Fork',
  close: 'Close',
  resume: 'Resume',
  delete: 'Delete',
}

function ThreadRow({
  thread,
  selected,
  unread,
  nested = false,
  onSelect,
  actions,
}: {
  thread: DevboxThreadFragment
  selected: boolean
  unread: boolean
  nested?: boolean
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
        </Flex>
        <Flex
          gap="xsmall"
          align="center"
        >
          {state !== 'idle' && (
            <Chip
              size="small"
              severity={STATE_SEVERITY[state]}
            >
              {state}
            </Chip>
          )}
          <CaptionP $color="text-xlight">
            {agentLabel(thread.agent)}
            {thread.lastActivityAt
              ? ` · ${fromNow(thread.lastActivityAt)}`
              : ''}
          </CaptionP>
        </Flex>
      </ThreadButtonSC>
      {actions}
    </ThreadRowSC>
  )
}

export function NewThreadModal({
  instance,
  onClose,
  onCreated,
}: {
  instance: DevboxInstanceFragment
  onClose: () => void
  onCreated: (threadId: string) => void
}) {
  const box = instance.devbox
  const agents = agentsOf(box)
  const checkouts = (instance.checkouts ?? []).filter(isNonNullable)
  const [agent, setAgent] = useState<Nullable<DevboxAgentType>>(
    instance.agent ?? agents.find((a) => a.default)?.type ?? null
  )
  const agentEntry = findAgent(box, agent)
  const models = modelsOf(agentEntry)
  const [model, setModel] = useState<Nullable<string>>(() =>
    defaultModelOf(agentEntry)
  )
  const [title, setTitle] = useState('')
  const [cwd, setCwd] = useState(ALL_REPOSITORIES_CWD)
  const [worktrees, setWorktrees] = useState<string[]>([])
  const [create, { loading, error }] = useCreateDevboxThreadMutation({
    onCompleted: (d) => {
      if (d.createDevboxThread?.id) onCreated(d.createDevboxThread.id)
      onClose()
    },
  })

  return (
    <Modal
      open
      onClose={onClose}
      header="New thread"
      size="large"
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
            disabled={!agent}
            onClick={() =>
              create({
                variables: {
                  instanceId: instance.id,
                  attributes: {
                    agent,
                    ...(model ? { model } : {}),
                    ...(title.trim() ? { title: title.trim() } : {}),
                    cwd,
                    ...(worktrees.length ? { worktreeRepos: worktrees } : {}),
                  },
                },
              })
            }
          >
            Start thread
          </Button>
        </Flex>
      }
    >
      <Flex
        direction="column"
        gap="large"
      >
        {error && <GqlError error={error} />}
        <Flex gap="medium">
          <FormField
            label="Agent"
            css={{ flex: 1 }}
          >
            <Select
              label="Pick an agent"
              selectedKey={agent}
              onSelectionChange={(key) => {
                const next = key as DevboxAgentType
                setAgent(next)
                setModel(defaultModelOf(findAgent(box, next)))
              }}
            >
              {agents.map((a) => (
                <ListBoxItem
                  key={a.type}
                  label={agentLabel(a.type)}
                />
              ))}
            </Select>
          </FormField>
          <FormField
            label="Model"
            css={{ flex: 1 }}
          >
            <Select
              label={models.length ? 'Pick a model' : "The agent's default"}
              isDisabled={!models.length}
              selectedKey={model}
              onSelectionChange={(key) => setModel(`${key}`)}
            >
              {models.map((m) => (
                <ListBoxItem
                  key={m.id}
                  label={m.name}
                />
              ))}
            </Select>
          </FormField>
        </Flex>
        <FormField
          label="Working directory"
          hint="Threads share the checkout unless you give them a worktree"
        >
          <Select
            label="All repositories"
            selectedKey={cwd}
            onSelectionChange={(key) => setCwd(`${key}`)}
          >
            {[
              <ListBoxItem
                key={ALL_REPOSITORIES_CWD}
                label="All repositories (~)"
              />,
              ...checkouts.map((c) => (
                <ListBoxItem
                  key={repoCwd(c.name ?? c.path ?? '')}
                  label={c.name ?? c.path ?? ''}
                  description={c.branch ?? undefined}
                />
              )),
            ]}
          </Select>
        </FormField>
        {!!checkouts.length && (
          <FormField
            label="Worktrees"
            hint="Isolate this thread's changes on its own branch"
          >
            <Flex
              direction="column"
              gap="xxsmall"
            >
              {checkouts.map((c) => {
                const name = c.name ?? c.path ?? ''
                return (
                  <Checkbox
                    key={name}
                    small
                    checked={worktrees.includes(name)}
                    onChange={(e) =>
                      setWorktrees((w) =>
                        e.target.checked
                          ? [...w, name]
                          : w.filter((n) => n !== name)
                      )
                    }
                  >
                    {name}
                  </Checkbox>
                )
              })}
            </Flex>
          </FormField>
        )}
        <FormField
          label="Title"
          hint="Optional; the agent usually names the thread"
        >
          <Input
            value={title}
            onChange={(e) => setTitle(e.currentTarget.value)}
          />
        </FormField>
      </Flex>
    </Modal>
  )
}

function ImportThreadModal({
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

const SidebarSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  padding: theme.spacing.medium,
  height: '100%',
  overflowY: 'auto',
}))

const ThreadRowSC = styled.div<{ $selected: boolean; $nested: boolean }>(
  ({ theme, $selected, $nested }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.xxsmall,
    marginLeft: $nested ? theme.spacing.medium : 0,
    borderRadius: theme.borderRadiuses.medium,
    backgroundColor: $selected
      ? theme.colors['fill-zero-selected']
      : 'transparent',
    '&:hover': { backgroundColor: theme.colors['fill-zero-hover'] },
  })
)

const ThreadButtonSC = styled.button(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xxxsmall,
  padding: `${theme.spacing.xsmall}px ${theme.spacing.small}px`,
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  textAlign: 'left',
  color: theme.colors.text,
}))

const ThreadTitleSC = styled.span<{ $unread: boolean }>(
  ({ theme, $unread }) => ({
    ...($unread ? theme.partials.text.body2Bold : theme.partials.text.body2),
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  })
)

const UnreadDotSC = styled.span(({ theme }) => ({
  width: 6,
  height: 6,
  borderRadius: '50%',
  flexShrink: 0,
  backgroundColor: theme.colors['icon-info'],
}))
