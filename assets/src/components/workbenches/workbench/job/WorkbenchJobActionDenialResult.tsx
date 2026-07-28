import { Flex } from '@pluralsh/design-system'
import { Body2P, CaptionP } from 'components/utils/typography/Text'
import {
  WorkbenchJobActionFragment,
  WorkbenchJobActivityFragment,
  WorkbenchJobActivityStatus,
} from 'generated/graphql'
import { useTheme } from 'styled-components'

type ActionActivity = WorkbenchJobActionFragment | WorkbenchJobActivityFragment

export function getActionDenialReason(activity: ActionActivity): string | null {
  if (
    activity.status !== WorkbenchJobActivityStatus.Cancelled &&
    activity.status !== WorkbenchJobActivityStatus.Rejected
  )
    return null
  return activity.result?.output?.trim() || null
}

export function WorkbenchJobActionDenialResult({
  activity,
}: {
  activity: ActionActivity
}) {
  const theme = useTheme()
  const reason = getActionDenialReason(activity)
  if (!reason) return null

  const deniedBy = activity.user?.name?.trim()

  return (
    <Flex
      direction="column"
      gap="xsmall"
    >
      <Body2P $color="text-light">{`“${reason}”`}</Body2P>
      {!!deniedBy && (
        <CaptionP $color="text-xlight">
          Denied by{' '}
          <span css={{ color: theme.colors['text-light'] }}>{deniedBy}</span>
        </CaptionP>
      )}
    </Flex>
  )
}
