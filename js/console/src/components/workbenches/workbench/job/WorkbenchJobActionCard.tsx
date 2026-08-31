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
  getActionStatusBorderColor,
  getActionSubtitle,
  getActionTitle,
} from './workbenchJobActionsUtils'
import { WorkbenchJobActionDetails } from './WorkbenchJobActionDetails'
import { WorkbenchJobKubeActionChips } from './WorkbenchJobKubeUpdateDiff'

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
    <CardSC $status={activity.status}>
      <HeaderSC>
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
            firstColor="text-light"
            second={getActionSubtitle(activity)}
            secondColor="text-xlight"
            truncate
            css={{ flex: 1, minWidth: 0 }}
          />
        </Flex>
        <WorkbenchJobKubeActionChips
          type={activity.type}
          method={activity.result?.kubeRequest?.method}
        />
        <Button
          small
          secondary
          onClick={onView}
          css={{ flexShrink: 0 }}
        >
          {getActionDetailButtonLabel(activity)}
        </Button>
      </HeaderSC>
      <WorkbenchJobActionDetails activity={activity} />
    </CardSC>
  )
}

const CardSC = styled.div<{
  $status: WorkbenchJobActionFragment['status']
}>(({ theme, $status }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  padding: `${theme.spacing.medium}px ${theme.spacing.small}px`,
  borderRadius: theme.borderRadiuses.large,
  background: theme.colors['fill-one'],
  borderLeft: `${theme.borderRadiuses.large / 2}px solid ${getActionStatusBorderColor(theme, $status)}`,
}))

const HeaderSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.medium,
  minWidth: 0,
  width: '100%',
}))
