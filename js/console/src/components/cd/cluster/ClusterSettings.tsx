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
import { WorkbenchSelector } from 'components/workbenches/WorkbenchSelector'
import { useWorkbenchOptions } from 'components/workbenches/useWorkbenchOptions'

import {
  ClustersRowFragment,
  InsightComponentPriority,
  useUpdateClusterMutation,
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
    workbenches,
    hasWorkbenches,
    loading: workbenchesLoading,
  } = useWorkbenchOptions()
  const {
    state: {
      name,
      protect,
      tags,
      disableAi,
      autoRemediate,
      remediationWorkbenchId,
      remediationMinPriority,
      remediationWindow,
      remediationMaxJobs,
    },
    update: updateState,
    hasUpdates,
  } = useUpdateState(
    {
      name: cluster?.name,
      protect: !!cluster?.protect,
      tags: initialTags,
      disableAi: !!cluster?.disableAi,
      autoRemediate: !!cluster?.remediationWorkbench?.id,
      remediationWorkbenchId: cluster?.remediationWorkbench?.id ?? null,
      remediationMinPriority:
        cluster?.remediationMinPriority ?? InsightComponentPriority.High,
      remediationWindow: cluster?.remediationWindow ?? DEFAULT_REMEDIATION_WINDOW,
      remediationMaxJobs:
        cluster?.remediationMaxJobs ?? DEFAULT_REMEDIATION_MAX_JOBS,
    },
    { tags: (a, b) => !isEqual(a, b) }
  )
  const [mutation, { loading, error }] = useUpdateClusterMutation({
    onCompleted: () => onClose?.(),
  })

  if (!cluster) return null

  const allowSubmit =
    hasUpdates && (!autoRemediate || !!remediationWorkbenchId)

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
                  remediationWorkbenchId: autoRemediate
                    ? remediationWorkbenchId
                    : null,
                  remediationMinPriority,
                  remediationWindow: Number.isFinite(remediationWindow)
                    ? remediationWindow
                    : DEFAULT_REMEDIATION_WINDOW,
                  remediationMaxJobs: Number.isFinite(remediationMaxJobs)
                    ? remediationMaxJobs
                    : DEFAULT_REMEDIATION_MAX_JOBS,
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
            <FormField
              label="Remediation workbench"
              hint={
                !workbenchesLoading && !hasWorkbenches
                  ? 'Create a workbench before enabling auto-remediation.'
                  : 'Jobs are sent here when an insight component meets the severity below.'
              }
            >
              <WorkbenchSelector
                workbenchId={remediationWorkbenchId}
                setWorkbenchId={(id) =>
                  updateState({ remediationWorkbenchId: id })
                }
                workbenches={workbenches}
                loading={workbenchesLoading}
              />
            </FormField>
            <FormField label="Minimum severity">
              <Select
                label="Minimum severity"
                selectedKey={remediationMinPriority}
                onSelectionChange={(key) =>
                  updateState({
                    remediationMinPriority: key
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
                value={remediationWindow}
                onChange={(event) =>
                  updateState({
                    remediationWindow: Number.parseInt(event.target.value, 10),
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
                value={remediationMaxJobs}
                onChange={(event) =>
                  updateState({
                    remediationMaxJobs: Number.parseInt(event.target.value, 10),
                  })
                }
              />
            </FormField>
          </>
        )}
        {error && <GqlError error={error} />}
      </Flex>
    </Modal>
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
