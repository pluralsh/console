import {
  Button,
  Flex,
  IconFrame,
  KubernetesIcon,
} from '@pluralsh/design-system'
import { StatusAccentFrameSC } from 'components/utils/StatusAccentFrame'
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
    <StatusAccentFrameSC
      $accent={getActionStatusBorderColor(theme, activity.status)}
    >
      <CardSC>
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
            drain={!!activity.result?.kubeDrain}
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
    </StatusAccentFrameSC>
  )
}

const CardSC = styled.div(({ theme }) => ({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  gap: theme.spacing.xsmall,
  minWidth: 0,
  padding: `${theme.spacing.medium}px ${theme.spacing.small}px`,
  background: theme.colors['fill-one'],
  borderTop: theme.borders.default,
  borderRight: theme.borders.default,
  borderBottom: theme.borders.default,
  borderTopRightRadius: theme.borderRadiuses.medium,
  borderBottomRightRadius: theme.borderRadiuses.medium,
}))

const HeaderSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.medium,
  minWidth: 0,
  width: '100%',
}))
