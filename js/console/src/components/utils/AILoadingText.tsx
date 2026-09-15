import { AgentLoadingIcon, Flex, FlexProps } from '@pluralsh/design-system'
import { Body2P } from 'components/utils/typography/Text'
import {
  useWorkbenchJobActivityWhimseyTextQuery,
  useWorkbenchJobWhimseyTextQuery,
} from 'generated/graphql'
import { EaseIn } from './EaseIn'

const WHIMSEY_POLL_INTERVAL = 12_000

export function AILoadingText({
  jobId,
  activityId,
  defaultText = 'Planning next moves',
  ...props
}: {
  jobId?: string
  activityId?: string
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
      <AgentLoadingIcon
        color="icon-xlight"
        size={12}
      />
      <EaseIn currentKey={whimseyText}>
        <Body2P
          $color="text-xlight"
          $shimmer
        >
          {whimseyText}
        </Body2P>
      </EaseIn>
    </Flex>
  )
}
