import {
  Checkbox,
  ContainerRuntimeIcon,
  Flex,
  InfoOutlineIcon,
  PrOpenIcon,
  Switch,
  Tooltip,
  WarningShieldIcon,
} from '@pluralsh/design-system'
import { Overline } from 'components/cd/utils/PermissionsModal'
import { Body2BoldP, CaptionP } from 'components/utils/typography/Text'
import {
  KUBERNETES_ACTIONS_HINT,
  VERIFICATION_LOOP_HINT,
  VERIFICATION_LOOP_LABEL,
} from './workbenchPromptModes'
import { WorkbenchPromptSupervisionOption } from './WorkbenchPromptSupervisionOption'

export function WorkbenchVerificationLoopControl({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <Flex
      align="center"
      gap="small"
    >
      <Switch
        aria-label={VERIFICATION_LOOP_LABEL}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <Body2BoldP>{VERIFICATION_LOOP_LABEL}</Body2BoldP>
      <CaptionP $color="text-xlight">{VERIFICATION_LOOP_HINT}</CaptionP>
      <Tooltip label="Confirms if PR is merged and followup if it didn’t.">
        <InfoOutlineIcon
          size={12}
          color="icon-xlight"
        />
      </Tooltip>
    </Flex>
  )
}

export function WorkbenchCodingSupervisionFields({
  approval,
  babysit,
  review,
  onApprovalChange,
  onBabysitChange,
  onReviewChange,
}: {
  approval: boolean
  babysit: boolean
  review: boolean
  onApprovalChange: (approval: boolean) => void
  onBabysitChange: (babysit: boolean) => void
  onReviewChange: (review: boolean) => void
}) {
  return (
    <>
      <Overline>Supervision</Overline>
      <WorkbenchPromptSupervisionOption
        icon={
          <PrOpenIcon
            size={16}
            color="icon-light"
          />
        }
        label="PR review"
        hint="Allows coding agents to check out an existing pull request branch and publish a structured review."
        checked={review}
        onChange={onReviewChange}
      />
      <WorkbenchPromptSupervisionOption
        icon={
          <WarningShieldIcon
            size={16}
            color="icon-light"
          />
        }
        label="Requires approval"
        hint="Pause for your sign-off before it edits anything or opens a PR."
        checked={approval}
        onChange={onApprovalChange}
      />
      <WorkbenchPromptSupervisionOption
        icon={
          <ContainerRuntimeIcon
            size={16}
            color="icon-light"
          />
        }
        label="Babysit"
        hint="Stays active after opening the PR to monitor review feedback and requested changes, then follows up until it’s ready to merge."
        checked={babysit}
        onChange={onBabysitChange}
      />
    </>
  )
}

export function WorkbenchKubernetesMutationFields({
  allowUpdates,
  allowDeletes,
  allowExec,
  allowDrain,
  onAllowUpdatesChange,
  onAllowDeletesChange,
  onAllowExecChange,
  onAllowDrainChange,
  updatesDisabled = false,
  deletesDisabled = false,
  execDisabled = false,
  drainDisabled = false,
}: {
  allowUpdates: boolean
  allowDeletes: boolean
  allowExec: boolean
  allowDrain: boolean
  onAllowUpdatesChange: (checked: boolean) => void
  onAllowDeletesChange: (checked: boolean) => void
  onAllowExecChange: (checked: boolean) => void
  onAllowDrainChange: (checked: boolean) => void
  updatesDisabled?: boolean
  deletesDisabled?: boolean
  execDisabled?: boolean
  drainDisabled?: boolean
}) {
  return (
    <>
      <Overline>Kubernetes actions</Overline>
      <CaptionP $color="text-xlight">{KUBERNETES_ACTIONS_HINT}</CaptionP>
      <Flex
        direction="column"
        gap="xxsmall"
      >
        <Checkbox
          small
          checked={allowUpdates}
          disabled={updatesDisabled}
          onChange={(e) => onAllowUpdatesChange(e.target.checked)}
        >
          Allow updates
        </Checkbox>
        <Checkbox
          small
          checked={allowDeletes}
          disabled={deletesDisabled}
          onChange={(e) => onAllowDeletesChange(e.target.checked)}
        >
          Allow deletes
        </Checkbox>
        <Checkbox
          small
          checked={allowExec}
          disabled={execDisabled}
          onChange={(e) => onAllowExecChange(e.target.checked)}
        >
          Allow command execution
        </Checkbox>
        <Checkbox
          small
          checked={allowDrain}
          disabled={drainDisabled}
          onChange={(e) => onAllowDrainChange(e.target.checked)}
        >
          Allow node drain
        </Checkbox>
      </Flex>
    </>
  )
}
