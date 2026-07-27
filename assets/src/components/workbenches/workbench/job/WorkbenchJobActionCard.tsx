import {
  Button,
  Flex,
  IconFrame,
  KubernetesIcon,
} from '@pluralsh/design-system'
import { StackedText } from 'components/utils/table/StackedText'
import { WorkbenchJobActionFragment } from 'generated/graphql'
import styled, { useTheme } from 'styled-components'
import {
  getActionDetailButtonLabel,
  getActionIcon,
  getActionSubtitle,
  getActionTitle,
} from './workbenchJobActionsUtils'

export function WorkbenchJobActionCard({
  activity,
  onView,
}: {
  activity: WorkbenchJobActionFragment
  onView: () => void
}) {
  const theme = useTheme()
  const icon = getActionIcon(activity)

  return (
    <CardSC>
      <Flex
        align="center"
        gap="small"
        css={{ minWidth: 0, flex: 1 }}
      >
        <IconFrame
          circle
          size="medium"
          type="secondary"
          icon={icon ?? <KubernetesIcon size={16} />}
          css={{
            flexShrink: 0,
            border: theme.borders['fill-two'],
            backgroundColor: 'transparent',
          }}
        />
        <StackedText
          first={getActionTitle(activity)}
          firstPartialType="body2Bold"
          firstColor="text"
          second={getActionSubtitle(activity)}
          secondColor="text-xlight"
          truncate
          css={{ flex: 1, minWidth: 0 }}
        />
      </Flex>
      <Button
        small
        secondary
        onClick={onView}
        css={{ flexShrink: 0 }}
      >
        {getActionDetailButtonLabel(activity.status)}
      </Button>
    </CardSC>
  )
}

const CardSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.medium,
  padding: theme.spacing.medium,
  borderRadius: theme.borderRadiuses.large,
  background: theme.colors['fill-two'],
  border: theme.borders['fill-two'],
}))
