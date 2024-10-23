import {
  AiSparkleFilledIcon,
  AiSparkleOutlineIcon,
  Flex,
  IconFrame,
  IconFrameProps,
  Tooltip,
} from '@pluralsh/design-system'
import { IconProps } from '@pluralsh/design-system/dist/components/icons/createIcon'
import { Overline } from 'components/cd/utils/PermissionsModal'
import { AiInsightSummaryFragment } from 'generated/graphql'
import { useNavigate } from 'react-router-dom'
import { useTheme } from 'styled-components'

export function AiInsightSummaryIcon({
  insight,
  navPath,
  asIconFrame = true,
  iconFrameType = 'tertiary',
  ...props
}: {
  insight: Nullable<AiInsightSummaryFragment>
  navPath?: string
  asIconFrame?: boolean
  iconFrameType?: IconFrameProps['type']
} & IconProps) {
  const theme = useTheme()
  const navigate = useNavigate()

  // if updated within the last 10 min
  const isNew =
    !!insight?.updatedAt &&
    new Date().getTime() - new Date(insight.updatedAt).getTime() <
      10 * 60 * 1000

  // if updated more than 1 hour ago
  const isStale =
    !!insight?.updatedAt &&
    new Date().getTime() - new Date(insight.updatedAt).getTime() >
      60 * 60 * 1000

  // transparent icon just for even spacing
  if (!insight?.summary || isStale)
    return (
      <IconFrame
        icon={
          <AiSparkleFilledIcon
            {...props}
            color="transparent"
          />
        }
      />
    )

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    navigate(navPath ?? '')
  }

  const icon = isNew ? (
    <AiSparkleFilledIcon
      color="icon-info"
      {...props}
    />
  ) : (
    <AiSparkleOutlineIcon {...props} />
  )

  return (
    <Tooltip
      placement="top"
      label={
        <Flex
          direction="column"
          gap="xxsmall"
          maxWidth={320}
        >
          <Overline>insights summary</Overline>
          {insight.summary}
        </Flex>
      }
      border={'1px solid transparent'}
      borderRadius={theme.borderRadiuses.medium}
      backgroundImage={`linear-gradient(${theme.colors['fill-two']}, ${theme.colors['fill-two']}), linear-gradient(to bottom, ${theme.colors.semanticBlue}, ${theme.colors['border-input']})`}
      backgroundOrigin={'border-box'}
      backgroundClip={'padding-box, border-box'}
    >
      {asIconFrame ? (
        <IconFrame
          {...(navPath && { clickable: true, onClick: handleClick })}
          type={iconFrameType}
          icon={icon}
        />
      ) : (
        icon
      )}
    </Tooltip>
  )
}
export function InsightsTabLabel({
  insight,
}: {
  insight: Nullable<AiInsightSummaryFragment>
}) {
  return (
    <Flex
      gap="small"
      align="center"
      justify="space-between"
    >
      <span>Insights</span>
      {insight && (
        <AiInsightSummaryIcon
          insight={insight}
          asIconFrame={false}
        />
      )}
    </Flex>
  )
}
