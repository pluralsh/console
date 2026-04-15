import { Flex, FlexProps, LoaderIcon } from '@pluralsh/design-system'
import { Body2P, CaptionP } from 'components/utils/typography/Text'
import {
  useWorkbenchJobActivityWhimseyTextQuery,
  useWorkbenchJobWhimseyTextQuery,
} from 'generated/graphql'
import { EaseIn } from './EaseIn'

const WHIMSEY_POLL_INTERVAL = 12_000

export function AILoadingText({
  jobId,
  activityId,
  size = 'medium',
  defaultText = 'Planning next moves',
  ...props
}: {
  jobId?: string
  activityId?: string
  size?: 'small' | 'medium'
  defaultText?: string
} & FlexProps) {
  const { data: jobData } = useWorkbenchJobWhimseyTextQuery({
    variables: { id: jobId ?? '' },
    skip: !jobId,
    errorPolicy: 'ignore',
    pollInterval: WHIMSEY_POLL_INTERVAL,
    context: { noRetry: true },
  })
  const { data: activityData } = useWorkbenchJobActivityWhimseyTextQuery({
    variables: { id: activityId ?? '' },
    skip: !activityId,
    errorPolicy: 'ignore',
    pollInterval: WHIMSEY_POLL_INTERVAL,
    context: { noRetry: true },
  })
  const whimseyText =
    jobData?.workbenchJob?.whimsey ||
    activityData?.workbenchJobActivity?.whimsey ||
    defaultText
  return (
    <Flex
      alignItems="center"
      gap="xsmall"
      {...props}
    >
      <LoaderIcon
        color="icon-xlight"
        size={size === 'small' ? 12 : 16}
        css={{
          animation: 'workbench-loader-pulse 1.2s ease-in-out infinite',
          '@keyframes workbench-loader-pulse': {
            '0%': { opacity: 1, transform: 'scale(1) rotate(0deg)' },
            '50%': { opacity: 0.5, transform: 'scale(1.18) rotate(90deg)' },
            '100%': { opacity: 1, transform: 'scale(1) rotate(180deg)' },
          },
        }}
      />
      <EaseIn currentKey={whimseyText}>
        {size === 'small' ? (
          <CaptionP $shimmer>{whimseyText}</CaptionP>
        ) : (
          <Body2P $shimmer>{whimseyText}</Body2P>
        )}
      </EaseIn>
    </Flex>
  )
}
