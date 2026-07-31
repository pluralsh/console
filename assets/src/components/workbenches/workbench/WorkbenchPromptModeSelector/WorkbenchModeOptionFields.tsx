import {
  Checkbox,
  ContainerRuntimeIcon,
  Flex,
  WarningShieldIcon,
} from '@pluralsh/design-system'
import { Overline } from 'components/cd/utils/PermissionsModal'
import { Body2P } from 'components/utils/typography/Text'
import { WorkbenchPromptSupervisionOption } from './WorkbenchPromptSupervisionOption'

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
  showDescription = true,
}: {
  allowUpdates: boolean
  allowDeletes: boolean
  onAllowUpdatesChange: (checked: boolean) => void
  onAllowDeletesChange: (checked: boolean) => void
  showDescription?: boolean
}) {
  return (
    <>
      <Overline>Kubernetes actions</Overline>
      {showDescription && (
        <Body2P $color="text-xlight">
          Reads are always permitted. Every mutation you enable below still
          requires your approval before it runs.
        </Body2P>
      )}
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
