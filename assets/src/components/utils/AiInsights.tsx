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
import { AiInsightFragment } from 'generated/graphql'
import { useNavigate } from 'react-router-dom'

export function AiInsightSummaryIcon({
  insight,
  navPath,
  iconFrameType = 'tertiary',
  ...props
}: {
  insight: Nullable<Pick<AiInsightFragment, 'summary' | 'updatedAt'>>
  navPath?: string
  iconFrameType?: IconFrameProps['type']
} & IconProps) {
  const navigate = useNavigate()

  // transparent icon just for even spacing
  if (!insight?.summary)
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

  // if updated within the last 30 min
  const isFresh =
    !!insight.updatedAt &&
    new Date(insight.updatedAt).getTime() - new Date().getTime() <
      30 * 60 * 1000

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
          isFresh ? (
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
