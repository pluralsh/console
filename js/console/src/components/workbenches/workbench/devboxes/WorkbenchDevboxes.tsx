import {
  Button,
  Card,
  Chip,
  Flex,
  ListBoxItem,
  PlusIcon,
  Switch,
  Table,
  TrashCanIcon,
} from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { GqlError } from 'components/utils/Alert'
import { Confirm } from 'components/utils/Confirm'
import { MoreMenu } from 'components/utils/MoreMenu'
import { useSimpleToast } from 'components/utils/SimpleToastContext'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { StackedText } from 'components/utils/table/StackedText'
import {
  Body2BoldP,
  CaptionP,
  Subtitle2H1,
} from 'components/utils/typography/Text'
import {
  DevboxInstanceTinyFragment,
  DevboxInteractionFragment,
  DevboxSnapshotFragment,
  DevboxSnapshotStatus,
  DevboxTinyFragment,
  useDeleteDevboxSnapshotMutation,
  useDetachDevboxMutation,
  useWorkbenchDevboxesQuery,
  useWorkbenchDevboxInboxQuery,
  useWorkbenchDevboxInstancesQuery,
  useWorkbenchDevboxSnapshotsQuery,
} from 'generated/graphql'
import { filesize } from 'filesize'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import {
  getWorkbenchDevboxAbsPath,
  getWorkbenchDevboxInstanceAbsPath,
  getWorkbenchDevboxStartAbsPath,
} from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { fromNow } from 'utils/datetime'
import { mapExistingNodes } from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import { WorkbenchEmptyState } from '../../common/WorkbenchEmptyState'
import { WorkbenchOutletContext, WorkbenchPageLayout } from '../Workbench'
import {
  DevboxInstanceStatusChip,
  DevboxSnapshotStatusChip,
  DevboxStatusChip,
  shortDigest,
} from './DevboxChips'
import { DevboxAttachModal } from './DevboxAttachModal'
import { agentLabel } from './devboxStartForm'
import { useDevboxWorkbenchDeltas } from './useDevboxWorkbenchDeltas'

export function WorkbenchDevboxes() {
  const { workbenchId } = useOutletContext<WorkbenchOutletContext>()
  const [attachOpen, setAttachOpen] = useState(false)
  const [mine, setMine] = useState(false)

  const boxesQuery = useWorkbenchDevboxesQuery({
    variables: { id: workbenchId },
    skip: !workbenchId,
    fetchPolicy: 'cache-and-network',
  })
  const instancesQuery = useWorkbenchDevboxInstancesQuery({
    variables: { id: workbenchId, mine },
    skip: !workbenchId,
    fetchPolicy: 'cache-and-network',
  })
  const snapshotsQuery = useWorkbenchDevboxSnapshotsQuery({
    variables: { id: workbenchId },
    skip: !workbenchId,
    fetchPolicy: 'cache-and-network',
  })
  const inboxQuery = useWorkbenchDevboxInboxQuery({
    variables: { id: workbenchId },
    skip: !workbenchId,
    fetchPolicy: 'cache-and-network',
    pollInterval: 30_000,
  })

  useDevboxWorkbenchDeltas(workbenchId, {
    onInstanceListChange: () => instancesQuery.refetch(),
    onSnapshotChange: () => snapshotsQuery.refetch(),
  })

  const boxes = (boxesQuery.data?.workbench?.devboxes ?? []).filter(
    isNonNullable
  )
  const instances = mapExistingNodes(
    instancesQuery.data?.workbench?.devboxInstances
  )
  const snapshots = mapExistingNodes(
    snapshotsQuery.data?.workbench?.devboxSnapshots
  )
  const inbox = (inboxQuery.data?.workbench?.devboxInbox ?? []).filter(
    isNonNullable
  )

  return (
    <WorkbenchPageLayout
      showEditWorkbenchButton={false}
      headerActions={
        <Button
          small
          startIcon={<PlusIcon />}
          as={Link}
          to={getWorkbenchDevboxStartAbsPath({ workbenchId })}
          disabled={!boxes.length}
        >
          Start instance
        </Button>
      }
    >
      <Flex
        direction="column"
        gap="large"
        padding="large"
      >
        {boxesQuery.error && <GqlError error={boxesQuery.error} />}
        {!!inbox.length && (
          <DevboxInbox
            workbenchId={workbenchId}
            interactions={inbox}
          />
        )}
        <SectionSC>
          <SectionHeader
            title="Boxes"
            action={
              <Button
                small
                secondary
                onClick={() => setAttachOpen(true)}
              >
                Attach box
              </Button>
            }
          />
          {!boxesQuery.data && boxesQuery.loading ? (
            <RectangleSkeleton
              $height={120}
              $width="100%"
            />
          ) : boxes.length ? (
            <BoxGridSC>
              {boxes.map((box) => (
                <DevboxCard
                  key={box.id}
                  workbenchId={workbenchId}
                  box={box}
                />
              ))}
            </BoxGridSC>
          ) : (
            <WorkbenchEmptyState
              message="No boxes attached"
              description="Attach a box registered by a DevboxRunner to start cloud coding instances from this workbench."
              inset={false}
            >
              <Button
                small
                onClick={() => setAttachOpen(true)}
              >
                Attach box
              </Button>
            </WorkbenchEmptyState>
          )}
        </SectionSC>
        <SectionSC>
          <SectionHeader
            title="Instances"
            action={
              <Switch
                checked={mine}
                onChange={setMine}
              >
                Only mine
              </Switch>
            }
          />
          {instancesQuery.error && <GqlError error={instancesQuery.error} />}
          <DevboxInstancesTable
            workbenchId={workbenchId}
            instances={instances}
            loading={!instancesQuery.data && instancesQuery.loading}
          />
        </SectionSC>
        <SectionSC>
          <SectionHeader title="Snapshots" />
          {snapshotsQuery.error && <GqlError error={snapshotsQuery.error} />}
          <DevboxSnapshotsTable
            workbenchId={workbenchId}
            snapshots={snapshots}
            loading={!snapshotsQuery.data && snapshotsQuery.loading}
          />
        </SectionSC>
      </Flex>
      <DevboxAttachModal
        open={attachOpen}
        onClose={() => setAttachOpen(false)}
        workbenchId={workbenchId}
        attachedIds={boxes.map(({ id }) => id)}
        onAttached={() => boxesQuery.refetch()}
      />
    </WorkbenchPageLayout>
  )
}

function SectionHeader({
  title,
  action,
}: {
  title: string
  action?: React.ReactNode
}) {
  return (
    <Flex
      justify="space-between"
      align="center"
    >
      <Subtitle2H1>{title}</Subtitle2H1>
      {action}
    </Flex>
  )
}

function DevboxCard({
  workbenchId,
  box,
}: {
  workbenchId: string
  box: DevboxTinyFragment
}) {
  const navigate = useNavigate()
  const { popToast } = useSimpleToast()
  const [confirmDetach, setConfirmDetach] = useState(false)
  const [detach, { loading, error }] = useDetachDevboxMutation({
    variables: { workbenchId, devboxId: box.id },
    refetchQueries: ['WorkbenchDevboxes'],
    awaitRefetchQueries: true,
    onCompleted: () => {
      setConfirmDetach(false)
      popToast({ content: `${box.name} detached`, severity: 'success' })
    },
  })
  const agents = (box.agents ?? []).filter(isNonNullable)

  return (
    <Card
      clickable
      onClick={() =>
        navigate(getWorkbenchDevboxAbsPath({ workbenchId, devboxId: box.id }))
      }
      css={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <Flex
        justify="space-between"
        align="center"
        gap="small"
      >
        <Body2BoldP>{box.name}</Body2BoldP>
        <Flex
          gap="xsmall"
          align="center"
          onClick={(e) => e.stopPropagation()}
        >
          <DevboxStatusChip status={box.status} />
          <MoreMenu
            onSelectionChange={(key) => {
              if (key === 'start')
                navigate(
                  getWorkbenchDevboxStartAbsPath({
                    workbenchId,
                    devboxId: box.id,
                  })
                )
              if (key === 'detach') setConfirmDetach(true)
            }}
          >
            <ListBoxItem
              key="start"
              label="Start instance"
            />
            <ListBoxItem
              key="detach"
              label="Detach from workbench"
              destructive
              leftContent={<TrashCanIcon color="icon-danger" />}
            />
          </MoreMenu>
        </Flex>
      </Flex>
      <CaptionP $color="text-xlight">
        {box.cluster?.name ?? 'unknown cluster'}
        {box.resolvedImage ? ` · ${shortDigest(box.resolvedImage)}` : ''}
      </CaptionP>
      <Flex
        gap="xxsmall"
        wrap="wrap"
      >
        {agents.map((a) => (
          <Chip
            key={a.type}
            size="small"
            severity={a.default ? 'info' : 'neutral'}
          >
            {agentLabel(a.type)}
          </Chip>
        ))}
        {box.browser && <Chip size="small">browser</Chip>}
      </Flex>
      <Confirm
        open={confirmDetach}
        close={() => setConfirmDetach(false)}
        destructive
        label="Detach"
        loading={loading}
        error={error}
        submit={() => detach()}
        title="Detach box"
        text={`New instances can't be started from ${box.name} in this workbench. Running instances keep running.`}
      />
    </Card>
  )
}

const instanceColumnHelper = createColumnHelper<DevboxInstanceTinyFragment>()

function DevboxInstancesTable({
  workbenchId,
  instances,
  loading,
}: {
  workbenchId: string
  instances: DevboxInstanceTinyFragment[]
  loading: boolean
}) {
  const columns = useMemo(
    () => [
      instanceColumnHelper.accessor((i) => i.name, {
        id: 'name',
        header: 'Instance',
        cell: ({ row: { original: i } }) => (
          <StackedText
            first={i.name || i.id.slice(0, 8)}
            second={i.devbox?.name}
          />
        ),
      }),
      instanceColumnHelper.accessor((i) => i.agent, {
        id: 'agent',
        header: 'Agent',
        cell: ({ row: { original: i } }) => (
          <StackedText
            first={agentLabel(i.agent)}
            second={i.requestedModel}
          />
        ),
      }),
      instanceColumnHelper.accessor((i) => i.status, {
        id: 'status',
        header: 'Status',
        cell: ({ row: { original: i } }) => (
          <Flex
            gap="xxsmall"
            align="center"
          >
            <DevboxInstanceStatusChip status={i.status} />
            {i.foregroundState === 'REQUIRES_ACTION' && (
              <Chip
                size="small"
                severity="warning"
              >
                needs you
              </Chip>
            )}
          </Flex>
        ),
      }),
      instanceColumnHelper.accessor((i) => i.runningThreads, {
        id: 'threads',
        header: 'Threads',
        cell: ({ row: { original: i } }) =>
          `${i.runningThreads ?? 0} running${i.waitingThreads ? `, ${i.waitingThreads} waiting` : ''}`,
      }),
      instanceColumnHelper.accessor((i) => i.lastActivityAt, {
        id: 'activity',
        header: 'Last activity',
        cell: ({ row: { original: i } }) => (
          <StackedText
            first={fromNow(i.lastActivityAt ?? i.insertedAt)}
            second={i.user?.name}
          />
        ),
      }),
    ],
    []
  )

  return (
    <Table
      fullHeightWrap
      data={instances}
      columns={columns}
      loading={loading}
      getRowLink={({ original }) =>
        getWorkbenchDevboxInstanceAbsPath({
          workbenchId,
          instanceId: (original as DevboxInstanceTinyFragment).id,
        })
      }
      emptyStateProps={{ message: 'No instances yet' }}
    />
  )
}

const snapshotColumnHelper = createColumnHelper<DevboxSnapshotFragment>()

function DevboxSnapshotsTable({
  workbenchId,
  snapshots,
  loading,
}: {
  workbenchId: string
  snapshots: DevboxSnapshotFragment[]
  loading: boolean
}) {
  const navigate = useNavigate()
  const [toDelete, setToDelete] = useState<Nullable<DevboxSnapshotFragment>>()
  const [deleteSnapshot, { loading: deleting, error }] =
    useDeleteDevboxSnapshotMutation({
      refetchQueries: ['WorkbenchDevboxSnapshots'],
      awaitRefetchQueries: true,
      onCompleted: () => setToDelete(null),
    })

  const columns = useMemo(
    () => [
      snapshotColumnHelper.accessor((s) => s.name, {
        id: 'name',
        header: 'Snapshot',
        cell: ({ row: { original: s } }) => (
          <StackedText
            first={s.name || s.id.slice(0, 8)}
            second={`${s.devbox?.name ?? ''}${s.instance ? ` · from ${s.instance.name || s.instance.id.slice(0, 8)}` : ''}`}
          />
        ),
      }),
      snapshotColumnHelper.accessor((s) => s.status, {
        id: 'status',
        header: 'Status',
        cell: ({ row: { original: s } }) => (
          <Flex
            gap="xxsmall"
            align="center"
          >
            <DevboxSnapshotStatusChip status={s.status} />
            {s.fidelity && <Chip size="small">{s.fidelity.toLowerCase()}</Chip>}
            {s.templateRevision &&
              s.devbox?.templateRevision &&
              s.templateRevision !== s.devbox.templateRevision && (
                <Chip
                  size="small"
                  severity="warning"
                  tooltip="The box's template changed since this snapshot, so a restore cold-boots with files only."
                >
                  files only
                </Chip>
              )}
          </Flex>
        ),
      }),
      snapshotColumnHelper.accessor((s) => s.sizeBytes, {
        id: 'size',
        header: 'Size',
        cell: ({ getValue }) => {
          const size = getValue()
          return size ? filesize(Number(size)) : '—'
        },
      }),
      snapshotColumnHelper.accessor((s) => s.insertedAt, {
        id: 'created',
        header: 'Created',
        cell: ({ row: { original: s } }) => (
          <StackedText
            first={fromNow(s.insertedAt)}
            second={s.user?.name}
          />
        ),
      }),
      snapshotColumnHelper.display({
        id: 'actions',
        header: '',
        cell: ({ row: { original: s } }) => (
          <Flex
            gap="xsmall"
            justify="flex-end"
          >
            <Button
              small
              secondary
              disabled={s.status !== DevboxSnapshotStatus.Ready}
              onClick={() =>
                navigate(
                  getWorkbenchDevboxStartAbsPath({
                    workbenchId,
                    snapshotId: s.id,
                  })
                )
              }
            >
              Restore
            </Button>
            <Button
              small
              tertiary
              destructive
              onClick={() => setToDelete(s)}
            >
              Delete
            </Button>
          </Flex>
        ),
      }),
    ],
    [navigate, workbenchId]
  )

  return (
    <>
      <Table
        fullHeightWrap
        data={snapshots}
        columns={columns}
        loading={loading}
        emptyStateProps={{ message: 'No snapshots yet' }}
      />
      <Confirm
        open={!!toDelete}
        close={() => setToDelete(null)}
        destructive
        label="Delete"
        loading={deleting}
        error={error}
        submit={() =>
          toDelete && deleteSnapshot({ variables: { id: toDelete.id } })
        }
        title="Delete snapshot"
        text={`Delete ${toDelete?.name || 'this snapshot'}? Instances can no longer be restored from it.`}
      />
    </>
  )
}

function DevboxInbox({
  workbenchId,
  interactions,
}: {
  workbenchId: string
  interactions: DevboxInteractionFragment[]
}) {
  return (
    <InboxCardSC>
      <Body2BoldP>
        {interactions.length} agent{interactions.length === 1 ? '' : 's'}{' '}
        waiting on you
      </Body2BoldP>
      {interactions.map((i) => (
        <Flex
          key={i.id}
          justify="space-between"
          align="center"
          gap="small"
        >
          <CaptionP>
            {i.title || i.message || i.kind.toLowerCase().replace('_', ' ')}
            {i.thread?.title ? ` · ${i.thread.title}` : ''}
          </CaptionP>
          <Button
            small
            secondary
            as={Link}
            to={getWorkbenchDevboxInstanceAbsPath({
              workbenchId,
              instanceId: i.instance?.id,
              threadId: i.thread?.id,
            })}
          >
            Respond
          </Button>
        </Flex>
      ))}
    </InboxCardSC>
  )
}

const InboxCardSC = styled(Card)(({ theme }) => ({
  padding: theme.spacing.medium,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  borderColor: theme.colors['border-warning'],
}))

const SectionSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
}))

const BoxGridSC = styled.div(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: theme.spacing.medium,
}))
