import {
  Button,
  Flex,
  FormField,
  Input,
  ListBoxItem,
  Modal,
  Select,
  Switch,
} from '@pluralsh/design-system'

import { useUpdateState } from 'components/hooks/useUpdateState'

import { GqlError } from 'components/utils/Alert'
import { ModalMountTransition } from 'components/utils/ModalMountTransition'
import { SearchableWorkbenchSelector } from 'components/workbenches/WorkbenchSelector'
import { useSearchableWorkbenchOptions } from 'components/workbenches/useWorkbenchOptions'
import { WorkbenchAccessibleUserSelect } from 'components/workbenches/workbench/WorkbenchAccessibleUserSelect'
import { WorkbenchModesForm } from 'components/workbenches/workbench/WorkbenchPromptModeSelector/WorkbenchModesForm'
import {
  modesAttributes,
  modesFormValue,
} from 'components/workbenches/workbench/WorkbenchPromptModeSelector/workbenchPromptModes'

import {
  ClusterRemediationAttributes,
  ClusterUpdateAttributes,
  ClustersRowFragment,
  InsightComponentPriority,
  useUpdateClusterMutation,
  WorkbenchJobModesAttributes,
} from 'generated/graphql'
import isEqual from 'lodash/isEqual'
import { ComponentProps, useMemo } from 'react'

import { tagsToNameValue } from '../services/CreateGlobalService'
import { TagSelection } from '../services/TagSelection'

const REMEDIATION_PRIORITIES = [
  { value: InsightComponentPriority.Low, label: 'Low' },
  { value: InsightComponentPriority.Medium, label: 'Medium' },
  { value: InsightComponentPriority.High, label: 'High' },
  { value: InsightComponentPriority.Critical, label: 'Critical' },
]

const DEFAULT_REMEDIATION_WINDOW = 21_600
const DEFAULT_REMEDIATION_MAX_JOBS = 3

type RemediationForm = {
  autoRemediate: boolean
  remediationWorkbenchId: Nullable<string>
  minPriority: InsightComponentPriority
  window: number
  maxJobs: number
  userId: Nullable<string>
  modes: WorkbenchJobModesAttributes | null
}

type ChangedRemediationAttributes = Pick<
  ClusterUpdateAttributes,
  'remediationWorkbenchId' | 'remediation'
>

function changedRemediationAttributes(
  current: RemediationForm,
  initial: RemediationForm
): ChangedRemediationAttributes {
  const attributes: ChangedRemediationAttributes = {}
  const workbenchId = current.autoRemediate
    ? current.remediationWorkbenchId
    : null
  const initialWorkbenchId = initial.autoRemediate
    ? initial.remediationWorkbenchId
    : null
  const remediation: ClusterRemediationAttributes = {}

  if (workbenchId !== initialWorkbenchId)
    attributes.remediationWorkbenchId = workbenchId
  if (current.minPriority !== initial.minPriority)
    remediation.minPriority = current.minPriority
  if (current.window !== initial.window) {
    remediation.window = Number.isFinite(current.window)
      ? current.window
      : DEFAULT_REMEDIATION_WINDOW
  }
  if (current.maxJobs !== initial.maxJobs) {
    remediation.maxJobs = Number.isFinite(current.maxJobs)
      ? current.maxJobs
      : DEFAULT_REMEDIATION_MAX_JOBS
  }
  if (current.userId !== initial.userId) remediation.userId = current.userId
  if (!isEqual(current.modes, initial.modes))
    remediation.modes = modesAttributes(current.modes) ?? null
  if (Object.keys(remediation).length > 0) attributes.remediation = remediation

  return attributes
}

function ClusterSettingsModalInner({
  cluster,
  open,
  onClose,
  ...props
}: ComponentProps<typeof Modal> & {
  cluster: Nullable<ClustersRowFragment>
}) {
  const initialTags: Record<string, string> = useMemo(
    () =>
      Object.fromEntries(
        cluster?.tags
          ?.map((tag) => [tag?.name, tag?.value || ''])
          .filter((t) => !!t[0]) || []
      ),
    [cluster?.tags]
  )

  const {
    state: {
      name,
      protect,
      tags,
      disableAi,
      autoRemediate,
      remediationWorkbenchId,
      minPriority,
      window,
      maxJobs,
      userId,
      modes,
    },
    update: updateState,
    hasUpdates,
    initialState,
  } = useUpdateState(
    {
      name: cluster?.name,
      protect: !!cluster?.protect,
      tags: initialTags,
      disableAi: !!cluster?.disableAi,
      autoRemediate: !!cluster?.remediationWorkbench?.id,
      remediationWorkbenchId: cluster?.remediationWorkbench?.id ?? null,
      minPriority:
        cluster?.remediation?.minPriority ?? InsightComponentPriority.High,
      window: cluster?.remediation?.window ?? DEFAULT_REMEDIATION_WINDOW,
      maxJobs: cluster?.remediation?.maxJobs ?? DEFAULT_REMEDIATION_MAX_JOBS,
      userId: cluster?.remediation?.user?.id ?? null,
      modes: modesFormValue(cluster?.remediation?.modes),
    },
    { tags: (a, b) => !isEqual(a, b) }
  )
  const [mutation, { loading, error }] = useUpdateClusterMutation({
    onCompleted: () => onClose?.(),
  })

  if (!cluster) return null

  const allowSubmit = hasUpdates && (!autoRemediate || !!remediationWorkbenchId)

  return (
    <Modal
      asForm
      size="large"
      open={open}
      onClose={onClose}
      header={props.header || `Cluster settings - ${cluster.name}`}
      formProps={{
        onSubmit: (e) => {
          e.preventDefault()
          if (allowSubmit) {
            mutation({
              variables: {
                id: cluster.id,
                attributes: {
                  name,
                  protect,
                  tags: tagsToNameValue(tags),
                  disableAi,
                  ...changedRemediationAttributes(
                    {
                      autoRemediate,
                      remediationWorkbenchId,
                      minPriority,
                      window,
                      maxJobs,
                      userId,
                      modes,
                    },
                    initialState
                  ),
                },
              },
            })
          }
        },
      }}
      actions={
        <Flex
          direction="row-reverse"
          gap="medium"
        >
          <Button
            primary
            type="submit"
            disabled={!allowSubmit}
            loading={loading}
          >
            Submit
          </Button>
          <Button
            secondary
            type="button"
            onClick={() => onClose?.()}
          >
            Cancel
          </Button>
        </Flex>
      }
      {...props}
    >
      <Flex
        direction="column"
        gap="large"
      >
        <FormField label="Name">
          <Input
            value={name}
            onChange={(e) => updateState({ name: e.target.value })}
          />
        </FormField>
        {!cluster.self && (
          <Switch
            checked={protect}
            onChange={(checked) => updateState({ protect: checked })}
          >
            Protect from deletion
          </Switch>
        )}
        <FormField label="Tags">
          <TagSelection
            tags={tags}
            setTags={(tags) => updateState({ tags })}
          />
        </FormField>
        <Switch
          checked={disableAi}
          onChange={(checked) => updateState({ disableAi: checked })}
        >
          Disable AI insights
        </Switch>
        <Switch
          checked={autoRemediate}
          onChange={(checked) => updateState({ autoRemediate: checked })}
        >
          Auto-remediate cluster insights
        </Switch>
        {autoRemediate && (
          <>
            <RemediationWorkbenchField
              workbenchId={remediationWorkbenchId}
              setWorkbenchId={(id) =>
                updateState({ remediationWorkbenchId: id })
              }
            />
            <FormField label="Minimum severity">
              <Select
                label="Minimum severity"
                selectedKey={minPriority}
                onSelectionChange={(key) =>
                  updateState({
                    minPriority: key
                      ? (String(key) as InsightComponentPriority)
                      : InsightComponentPriority.High,
                  })
                }
              >
                {REMEDIATION_PRIORITIES.map(({ value, label }) => (
                  <ListBoxItem
                    key={value}
                    label={label}
                  />
                ))}
              </Select>
            </FormField>
            <FormField
              label="Throttle window (seconds)"
              hint="Duplicate findings are suppressed for this long. 21600 seconds is 6 hours."
            >
              <Input
                type="number"
                min={1}
                value={window}
                onChange={(event) =>
                  updateState({
                    window: Number.parseInt(event.target.value, 10),
                  })
                }
              />
            </FormField>
            <FormField
              label="Max jobs per window"
              hint="Maximum remediation jobs to start for this cluster during the window."
            >
              <Input
                type="number"
                min={1}
                value={maxJobs}
                onChange={(event) =>
                  updateState({
                    maxJobs: Number.parseInt(event.target.value, 10),
                  })
                }
              />
            </FormField>
            {remediationWorkbenchId && (
              <>
                <WorkbenchAccessibleUserSelect
                  key={remediationWorkbenchId}
                  workbenchId={remediationWorkbenchId}
                  selectedUserId={userId ?? ''}
                  onSelectionChange={(id) => updateState({ userId: id })}
                  hint="Leave unset to run jobs as the workbench bot user. A selected user must be able to read the workbench."
                />
                {userId && (
                  <Button
                    type="button"
                    secondary
                    small
                    alignSelf="flex-start"
                    onClick={() => updateState({ userId: null })}
                  >
                    Use workbench bot
                  </Button>
                )}
                <WorkbenchModesForm
                  workbenchId={remediationWorkbenchId}
                  value={modes}
                  onChange={(next) => updateState({ modes: next })}
                />
              </>
            )}
          </>
        )}
        {error && <GqlError error={error} />}
      </Flex>
    </Modal>
  )
}

function RemediationWorkbenchField({
  workbenchId,
  setWorkbenchId,
}: {
  workbenchId: Nullable<string>
  setWorkbenchId: (id: Nullable<string>) => void
}) {
  const {
    workbenches,
    selectedWorkbench,
    hasWorkbenches,
    loading,
    fetchingMore,
    query,
    setQuery,
    hasNextPage,
    fetchNextPage,
  } = useSearchableWorkbenchOptions(workbenchId)

  return (
    <FormField
      label="Remediation workbench"
      hint={
        !loading && !hasWorkbenches
          ? 'Create a workbench before enabling auto-remediation.'
          : 'Jobs are sent here when an insight component meets the severity below.'
      }
    >
      <SearchableWorkbenchSelector
        workbenchId={workbenchId}
        setWorkbenchId={setWorkbenchId}
        workbenches={workbenches}
        selectedWorkbench={selectedWorkbench}
        loading={loading}
        fetchingMore={fetchingMore}
        query={query}
        onQueryChange={setQuery}
        hasNextPage={hasNextPage}
        onLoadMore={fetchNextPage}
        disabled={!loading && !hasWorkbenches}
      />
    </FormField>
  )
}

export function ClusterSettingsModal(
  props: ComponentProps<typeof ClusterSettingsModalInner>
) {
  return (
    <ModalMountTransition open={props.open}>
      <ClusterSettingsModalInner {...props} />
    </ModalMountTransition>
  )
}
