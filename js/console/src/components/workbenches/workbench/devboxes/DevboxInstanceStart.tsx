import { Button, Callout, Card, Flex } from '@pluralsh/design-system'
import { GqlError } from 'components/utils/Alert'
import { RectangleSkeleton } from 'components/utils/SkeletonLoaders'
import { Subtitle2H1 } from 'components/utils/typography/Text'
import {
  DevboxSnapshotFidelity,
  useCreateDevboxInstanceMutation,
  useRestoreDevboxSnapshotMutation,
  useWorkbenchDevboxesQuery,
  useWorkbenchDevboxSnapshotsQuery,
} from 'generated/graphql'
import { useMemo, useState } from 'react'
import {
  Link,
  useNavigate,
  useOutletContext,
  useSearchParams,
} from 'react-router-dom'
import {
  getWorkbenchDevboxesAbsPath,
  getWorkbenchDevboxInstanceAbsPath,
  WORKBENCH_DEVBOX_START_BOX_QUERY_PARAM,
  WORKBENCH_DEVBOX_START_SNAPSHOT_QUERY_PARAM,
} from 'routes/workbenchesRoutesConsts'
import { mapExistingNodes } from 'utils/graphql'
import { isNonNullable } from 'utils/isNonNullable'
import { WorkbenchOutletContext, WorkbenchPageLayout } from '../Workbench'
import {
  AI_SUBSCRIPTIONS_ABS_PATH,
  defaultBillingFrom,
  linkedAgentsFrom,
  useAgentCredentials,
  useWorkbenchAllowsSubscriptions,
} from './devboxCredentials'
import { DevboxStartFormFields } from './DevboxStartFormFields'
import {
  defaultStartValues,
  DevboxStartValues,
  hasStartErrors,
  toInstanceAttributes,
  validateStartValues,
} from './devboxStartForm'

export function DevboxInstanceStart() {
  const { workbenchId } = useOutletContext<WorkbenchOutletContext>()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const boxParam = params.get(WORKBENCH_DEVBOX_START_BOX_QUERY_PARAM)
  const snapshotId = params.get(WORKBENCH_DEVBOX_START_SNAPSHOT_QUERY_PARAM)

  const { data, loading, error } = useWorkbenchDevboxesQuery({
    variables: { id: workbenchId },
    skip: !workbenchId,
    fetchPolicy: 'cache-and-network',
  })
  const { data: snapshotsData } = useWorkbenchDevboxSnapshotsQuery({
    variables: { id: workbenchId },
    skip: !workbenchId || !snapshotId,
  })
  const snapshot = mapExistingNodes(
    snapshotsData?.workbench?.devboxSnapshots
  ).find(({ id }) => id === snapshotId)

  const boxes = useMemo(
    () => (data?.workbench?.devboxes ?? []).filter(isNonNullable),
    [data]
  )
  const workbenchRepos = useMemo(
    () =>
      (data?.workbench?.configuration?.coding?.repositories ?? []).filter(
        isNonNullable
      ),
    [data]
  )

  const credentials = useAgentCredentials()
  const allowsSubscriptions = useWorkbenchAllowsSubscriptions(workbenchId)

  const [values, setValues] = useState<Nullable<DevboxStartValues>>(null)
  const initialBoxId = snapshot?.devbox?.id ?? boxParam
  if (!values && boxes.length && !(snapshotId && !snapshot)) {
    const initialBox = boxes.find(({ id }) => id === initialBoxId) ?? boxes[0]
    setValues({ ...defaultStartValues(initialBox, workbenchRepos), snapshotId })
  }

  const box = boxes.find(({ id }) => id === values?.devboxId)
  const errors = values ? validateStartValues(values, box) : {}

  const onCompleted = (id: Nullable<string>) =>
    id &&
    navigate(getWorkbenchDevboxInstanceAbsPath({ workbenchId, instanceId: id }))

  const [create, createState] = useCreateDevboxInstanceMutation({
    onCompleted: (d) => onCompleted(d.createDevboxInstance?.id),
  })
  const [restore, restoreState] = useRestoreDevboxSnapshotMutation({
    onCompleted: (d) => onCompleted(d.restoreDevboxSnapshot?.id),
  })
  const mutationError = createState.error ?? restoreState.error
  const submitting = createState.loading || restoreState.loading

  const billingDefaults = defaultBillingFrom(credentials.credentials)
  const submit = () => {
    if (!values || hasStartErrors(errors)) return
    const attributes = toInstanceAttributes({
      ...values,
      billing: allowsSubscriptions
        ? { ...billingDefaults, ...values.billing }
        : {},
    })
    if (snapshotId) {
      const { snapshotId: _s, devboxId: _d, ...rest } = attributes
      restore({ variables: { id: snapshotId, attributes: rest } })
    } else create({ variables: { workbenchId, attributes } })
  }

  return (
    <WorkbenchPageLayout showEditWorkbenchButton={false}>
      <Flex
        direction="column"
        gap="large"
        padding="large"
        css={{ maxWidth: 720 }}
      >
        <Subtitle2H1>
          {snapshot ? `Restore ${snapshot.name}` : 'Start a devbox instance'}
        </Subtitle2H1>
        {error && <GqlError error={error} />}
        {snapshot &&
          snapshot.fidelity === DevboxSnapshotFidelity.Filesystem && (
            <Callout
              severity="warning"
              title="Files only"
            >
              This snapshot restores the workspace files; running processes and
              in-memory agent state are not restored
              {snapshot.templateRevision !== snapshot.devbox?.templateRevision
                ? ", and the box's template has changed since it was taken"
                : ''}
              .
            </Callout>
          )}
        {!loading && !boxes.length && (
          <Callout
            severity="info"
            title="No boxes attached"
          >
            Attach a box to this workbench before starting an instance.
          </Callout>
        )}
        {!values ? (
          loading && <RectangleSkeleton $height={320} />
        ) : (
          <Card css={{ padding: 24 }}>
            <DevboxStartFormFields
              boxes={boxes}
              values={values}
              onChange={setValues}
              errors={errors}
              candidateRepositories={workbenchRepos}
              boxLocked={!!snapshotId}
              billing={
                allowsSubscriptions
                  ? {
                      allowed: true,
                      linkedAgents: linkedAgentsFrom(credentials.credentials),
                      defaults: billingDefaults,
                      settingsPath: AI_SUBSCRIPTIONS_ABS_PATH,
                    }
                  : undefined
              }
            />
          </Card>
        )}
        {mutationError && <GqlError error={mutationError} />}
        <Flex
          gap="small"
          justify="flex-end"
        >
          <Button
            secondary
            as={Link}
            to={getWorkbenchDevboxesAbsPath(workbenchId)}
          >
            Cancel
          </Button>
          <Button
            loading={submitting}
            disabled={!values || hasStartErrors(errors)}
            onClick={submit}
          >
            {snapshotId ? 'Restore' : 'Start'}
          </Button>
        </Flex>
      </Flex>
    </WorkbenchPageLayout>
  )
}
