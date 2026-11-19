import {
  Button,
  Card,
  Flex,
  FormField,
  ListBoxItem,
  Select,
} from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { Confirm } from 'components/utils/Confirm'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { CaptionP, Subtitle1H1 } from 'components/utils/typography/Text'
import {
  DevboxSnapshotFidelity,
  DevboxSnapshotStatus,
  DevboxTinyFragment,
  useCreateDevboxInstanceMutation,
  useDeleteDevboxSnapshotMutation,
  useRestoreDevboxSnapshotMutation,
  useWorkbenchDevboxesQuery,
  useWorkbenchDevboxSnapshotsQuery,
} from 'generated/graphql'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  getWorkbenchAbsPath,
  getWorkbenchDevboxInstanceAbsPath,
  WORKBENCH_DEVBOX_START_BOX_QUERY_PARAM,
  WORKBENCH_DEVBOX_START_SNAPSHOT_QUERY_PARAM,
  WORKBENCHES_EDIT_REL_PATH,
} from 'routes/workbenchesRoutesConsts'
import styled from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import { WorkbenchEmptyState } from '../../common/WorkbenchEmptyState'
import {
  defaultBillingFrom,
  useAgentCredentials,
  useWorkbenchAllowsSubscriptions,
} from './devboxCredentials'
import { devboxSizing } from './devboxSizing'
import {
  defaultStartValues,
  toInstanceAttributes,
  validateStartValues,
} from './devboxStartForm'
import { NEW_SESSION } from './devboxThreads'

const FRESH_START = 'fresh'

export function DevboxNewInstance({ workbenchId }: { workbenchId: string }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [deleting, setDeleting] = useState(false)

  const { data, loading, error } = useWorkbenchDevboxesQuery({
    variables: { id: workbenchId },
    skip: !workbenchId,
    fetchPolicy: 'cache-and-network',
  })
  const { data: snapshotsData } = useWorkbenchDevboxSnapshotsQuery({
    variables: { id: workbenchId },
    skip: !workbenchId,
    fetchPolicy: 'cache-and-network',
  })
  const boxes = useMemo(
    () => (data?.workbench?.devboxes ?? []).filter(isNonNullable),
    [data]
  )
  const snapshots = mapExistingNodes(
    snapshotsData?.workbench?.devboxSnapshots
  ).filter((s) => s.status === DevboxSnapshotStatus.Ready)

  const snapshotId = params.get(WORKBENCH_DEVBOX_START_SNAPSHOT_QUERY_PARAM)
  const snapshot = snapshots.find((s) => s.id === snapshotId)
  const boxId =
    snapshot?.devbox?.id ?? params.get(WORKBENCH_DEVBOX_START_BOX_QUERY_PARAM)
  const box = boxes.find((b) => b.id === boxId) ?? boxes[0]
  const boxSnapshots = snapshots.filter((s) => s.devbox?.id === box?.id)

  const setSelection = (devboxId: Nullable<string>, snapshot?: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (devboxId) next.set(WORKBENCH_DEVBOX_START_BOX_QUERY_PARAM, devboxId)
        if (snapshot)
          next.set(WORKBENCH_DEVBOX_START_SNAPSHOT_QUERY_PARAM, snapshot)
        else next.delete(WORKBENCH_DEVBOX_START_SNAPSHOT_QUERY_PARAM)
        return next
      },
      { replace: true }
    )

  const credentials = useAgentCredentials()
  const allowsSubscriptions = useWorkbenchAllowsSubscriptions(workbenchId)
  const onStarted = (id: Nullable<string>) =>
    id &&
    navigate(
      getWorkbenchDevboxInstanceAbsPath({
        workbenchId,
        instanceId: id,
        threadId: NEW_SESSION,
      })
    )
  const [create, createState] = useCreateDevboxInstanceMutation({
    onCompleted: (d) => onStarted(d.createDevboxInstance?.id),
  })
  const [restore, restoreState] = useRestoreDevboxSnapshotMutation({
    onCompleted: (d) => onStarted(d.restoreDevboxSnapshot?.id),
  })
  const [deleteSnapshot, deleteState] = useDeleteDevboxSnapshotMutation({
    refetchQueries: ['WorkbenchDevboxSnapshots'],
    awaitRefetchQueries: true,
    onCompleted: () => {
      setDeleting(false)
      setSelection(box?.id)
    },
  })

  const values = {
    ...defaultStartValues(
      box,
      data?.workbench?.configuration?.coding?.repositories
    ),
    snapshotId: snapshot?.id,
  }
  const invalid = Object.values(validateStartValues(values, box)).find(Boolean)

  const start = () => {
    if (invalid) return
    const attributes = toInstanceAttributes({
      ...values,
      billing: allowsSubscriptions
        ? defaultBillingFrom(credentials.credentials)
        : {},
    })
    if (snapshot) {
      const { snapshotId: _s, devboxId: _d, ...rest } = attributes
      restore({ variables: { id: snapshot.id, attributes: rest } })
    } else create({ variables: { workbenchId, attributes } })
  }

  if (!data && loading)
    return (
      <CenterSC>
        <RectangleSkeleton
          $height={240}
          $width="100%"
        />
      </CenterSC>
    )

  if (!boxes.length)
    return (
      <CenterSC>
        {error && <GqlError error={error} />}
        <WorkbenchEmptyState
          message="No devboxes attached"
          description="Attach a devbox to this workbench's coding agent to start instances."
          inset={false}
        >
          <Button
            small
            as={Link}
            to={`${getWorkbenchAbsPath(workbenchId)}/${WORKBENCHES_EDIT_REL_PATH}`}
          >
            Edit workbench
          </Button>
        </WorkbenchEmptyState>
      </CenterSC>
    )

  const mutationError = createState.error ?? restoreState.error
  return (
    <CenterSC>
      <Card
        css={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <Subtitle1H1>New instance</Subtitle1H1>
        {mutationError && <GqlError error={mutationError} />}
        <FormField
          label="Devbox"
          error={!!invalid}
          hint={invalid ?? (box ? boxDescription(box) : undefined)}
        >
          <Select
            label="Pick a devbox"
            selectedKey={box?.id ?? null}
            onSelectionChange={(key) => setSelection(`${key}`)}
          >
            {boxes.map((b) => (
              <ListBoxItem
                key={b.id}
                label={b.name}
                description={boxDescription(b)}
              />
            ))}
          </Select>
        </FormField>
        {!!boxSnapshots.length && (
          <FormField
            label="Snapshot"
            hint={
              snapshot?.fidelity === DevboxSnapshotFidelity.Filesystem
                ? 'Restores files only; processes and agent memory start fresh'
                : undefined
            }
          >
            <Flex
              gap="small"
              align="center"
            >
              <SelectWrapSC>
                <Select
                  label="Fresh start"
                  selectedKey={snapshot?.id ?? FRESH_START}
                  onSelectionChange={(key) =>
                    setSelection(
                      box?.id,
                      key === FRESH_START ? undefined : `${key}`
                    )
                  }
                >
                  {[
                    <ListBoxItem
                      key={FRESH_START}
                      label="Fresh start"
                    />,
                    ...boxSnapshots.map((s) => (
                      <ListBoxItem
                        key={s.id}
                        label={s.name || s.id.slice(0, 8)}
                        description={
                          s.instance?.name
                            ? `from ${s.instance.name}`
                            : undefined
                        }
                      />
                    )),
                  ]}
                </Select>
              </SelectWrapSC>
              {snapshot && (
                <Button
                  small
                  tertiary
                  destructive
                  onClick={() => setDeleting(true)}
                >
                  Delete
                </Button>
              )}
            </Flex>
          </FormField>
        )}
        <Flex justify="flex-end">
          <Button
            loading={createState.loading || restoreState.loading}
            disabled={!!invalid}
            onClick={start}
          >
            Start instance
          </Button>
        </Flex>
      </Card>
      <CaptionP $color="text-xlight">
        Sessions with the agents start once you&apos;re in the instance.
      </CaptionP>
      <Confirm
        open={deleting}
        close={() => setDeleting(false)}
        destructive
        label="Delete"
        loading={deleteState.loading}
        error={deleteState.error}
        submit={() =>
          snapshot && deleteSnapshot({ variables: { id: snapshot.id } })
        }
        title="Delete snapshot"
        text={`Delete ${snapshot?.name || 'this snapshot'}? Instances can no longer be started from it.`}
      />
    </CenterSC>
  )
}

function boxDescription(
  box: Pick<DevboxTinyFragment, 'resources' | 'cluster'>
) {
  return [devboxSizing(box.resources), box.cluster?.name]
    .filter(Boolean)
    .join(' · ')
}

const CenterSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: theme.spacing.small,
  width: '100%',
  maxWidth: 520,
  height: '100%',
  margin: '0 auto',
  padding: theme.spacing.large,
  boxSizing: 'border-box',
}))

const SelectWrapSC = styled.div({ flex: 1 })
