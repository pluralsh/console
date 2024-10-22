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

export function AiInsightSummaryIcon({
  insight,
  navPath,
  iconFrameType = 'tertiary',
  ...props
}: {
  insight: Nullable<AiInsightSummaryFragment>
  navPath?: string
  iconFrameType?: IconFrameProps['type']
} & IconProps) {
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
    navigate(navPath ?? '')
  }

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
    >
      <IconFrame
        {...(navPath && { clickable: true, onClick: handleClick })}
        type={iconFrameType}
        icon={
          isNew ? (
            <AiSparkleFilledIcon
              color="icon-info"
              {...props}
            />
          ) : (
            <AiSparkleOutlineIcon {...props} />
          )
        }
      />
    </Tooltip>
  )
}
