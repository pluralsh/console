import {
  AiSparkleFilledIcon,
  AiSparkleOutlineIcon,
  Flex,
  IconFrame,
  IconFrameProps,
  Tooltip,
  IconProps,
} from '@pluralsh/design-system'
import { Overline } from 'components/cd/utils/PermissionsModal'
import { AiInsightSummaryFragment, InsightFreshness } from 'generated/graphql'
import { useNavigate } from 'react-router-dom'
import { useTheme } from 'styled-components'
import { CaptionP } from './typography/Text'
import dayjs from 'dayjs'
import { MouseEventHandler } from 'react'

export function AiInsightSummaryIcon({
  insight,
  navPath,
  preserveSpace = false,
  asIconFrame = true,
  iconFrameType = 'tertiary',
  ...props
}: {
  insight: Nullable<AiInsightSummaryFragment>
  navPath?: string
  preserveSpace?: boolean
  asIconFrame?: boolean
  iconFrameType?: IconFrameProps['type']
} & IconProps) {
  const theme = useTheme()
  const navigate = useNavigate()

  if (!insight?.summary || insight.freshness === InsightFreshness.Expired)
    return preserveSpace ? (
      <IconFrame
        icon={
          <AiSparkleFilledIcon
            {...props}
            color="transparent"
          />
        }
      />
    ) : null

  const handleClick: MouseEventHandler = (e) => {
    e.stopPropagation()
    e.preventDefault()
    navigate(navPath ?? '')
  }

  const icon =
    insight.freshness === InsightFreshness.Fresh ? (
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
          gap="xsmall"
          maxWidth={320}
          color={theme.colors.text}
        >
          <Flex
            gap="xsmall"
            justify="space-between"
          >
            <Overline>insights summary</Overline>
            <CaptionP $color="text-xlight">
              {dayjs(insight.updatedAt).fromNow()}
            </CaptionP>
          </Flex>
          {insight.summary}
        </Flex>
      }
      css={{
        border: '1px solid transparent',
        borderRadius: theme.borderRadiuses.medium,
        backgroundImage: `linear-gradient(${theme.colors['fill-two']}, ${theme.colors['fill-two']}), linear-gradient(to bottom, ${theme.colors.semanticBlue}, ${theme.colors['border-input']})`,
        backgroundOrigin: 'border-box',
        backgroundClip: 'padding-box, border-box',
      }}
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
      <AiInsightSummaryIcon
        insight={insight}
        asIconFrame={false}
      />
    </Flex>
  )
}
