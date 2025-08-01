import {
  AiSparkleFilledIcon,
  AiSparkleOutlineIcon,
  Flex,
  IconFrame,
  IconFrameProps,
  IconProps,
} from '@pluralsh/design-system'
import { Overline } from 'components/cd/utils/PermissionsModal'
import { AiInsightSummaryFragment, InsightFreshness } from 'generated/graphql'
import { MouseEventHandler } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from 'styled-components'
import { fromNow } from 'utils/datetime'
import { CaptionP } from './typography/Text'

export function AiInsightSummaryIcon({
  insight,
  navPath,
  preserveSpace = false,
  iconFrameType = 'tertiary',
  noPadding = false,
  ...props
}: {
  insight: Nullable<AiInsightSummaryFragment>
  navPath?: string
  preserveSpace?: boolean
  iconFrameType?: IconFrameProps['type']
  noPadding?: boolean
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

  return (
    <IconFrame
      {...(noPadding && { style: { height: 'auto', width: 'auto' } })}
      {...(navPath && { clickable: true, onClick: handleClick })}
      type={iconFrameType}
      tooltipProps={{
        style: {
          ...theme.partials.text.body2,
          padding: theme.spacing.large,
          border: '1px solid transparent',
          borderRadius: theme.borderRadiuses.medium,
          backgroundImage: `linear-gradient(${theme.colors['fill-two']}, ${theme.colors['fill-two']}), linear-gradient(to bottom, ${theme.colors.semanticBlue}, ${theme.colors['border-input']})`,
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
        },
      }}
      tooltip={
        <Flex
          direction="column"
          gap="small"
          maxWidth={320}
          color={theme.colors.text}
        >
          <Flex
            gap="xsmall"
            justify="space-between"
          >
            <Overline>insights summary</Overline>
            <CaptionP $color="text-xlight">
              {fromNow(insight.updatedAt)}
            </CaptionP>
          </Flex>
          {insight.summary}
        </Flex>
      }
      icon={
        insight.freshness === InsightFreshness.Fresh ? (
          <AiSparkleFilledIcon
            color="icon-info"
            {...props}
          />
        ) : (
          <AiSparkleOutlineIcon {...props} />
        )
      }
    />
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
        noPadding
        insight={insight}
      />
    </Flex>
  )
}
