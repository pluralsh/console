import {
  Checkbox,
  ContainerRuntimeIcon,
  Flex,
  InfoOutlineIcon,
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
  onApprovalChange,
  onBabysitChange,
}: {
  approval: boolean
  babysit: boolean
  onApprovalChange: (approval: boolean) => void
  onBabysitChange: (babysit: boolean) => void
}) {
  return (
    <>
      <Overline>Supervision</Overline>
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
  onAllowUpdatesChange,
  onAllowDeletesChange,
}: {
  allowUpdates: boolean
  allowDeletes: boolean
  onAllowUpdatesChange: (checked: boolean) => void
  onAllowDeletesChange: (checked: boolean) => void
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
          onChange={(e) => onAllowUpdatesChange(e.target.checked)}
        >
          Allow updates
        </Checkbox>
        <Checkbox
          small
          checked={allowDeletes}
          onChange={(e) => onAllowDeletesChange(e.target.checked)}
        >
          Allow deletes
        </Checkbox>
      </Flex>
    </>
  )
}
