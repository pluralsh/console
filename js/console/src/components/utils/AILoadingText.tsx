import { Flex, FlexProps } from '@pluralsh/design-system'
import { Body2P } from 'components/utils/typography/Text'
import {
  useWorkbenchJobActivityWhimseyTextQuery,
  useWorkbenchJobWhimseyTextQuery,
} from 'generated/graphql'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { EaseIn } from './EaseIn'

// each whimsey is an LLM completion, so it's only regenerated when the work it
// describes moves on (`refreshKey` changes), and at most this often
const WHIMSEY_MIN_REFRESH_INTERVAL = 20_000

export function AILoadingText({
  jobId,
  activityId,
  refreshKey,
  defaultText = 'Planning next moves',
  ...props
}: {
  jobId?: string
  activityId?: string
  refreshKey?: unknown
  defaultText?: string
} & FlexProps) {
  const { data: jobData, refetch: refetchJob } =
    useWorkbenchJobWhimseyTextQuery({
      variables: { id: jobId ?? '' },
      skip: !jobId,
      errorPolicy: 'ignore',
      context: { noRetry: true },
    })
  const { data: activityData, refetch: refetchActivity } =
    useWorkbenchJobActivityWhimseyTextQuery({
      variables: { id: activityId ?? '' },
      skip: !activityId,
      errorPolicy: 'ignore',
      context: { noRetry: true },
    })
  useThrottledRefresh(refreshKey, () => {
    if (jobId) refetchJob()
    if (activityId) refetchActivity()
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

// calls `refresh` when `key` changes, delaying it so calls are at least
// WHIMSEY_MIN_REFRESH_INTERVAL apart (counting from mount's initial fetch)
function useThrottledRefresh(key: unknown, refresh: () => void) {
  const refreshRef = useRef(refresh)
  const keyRef = useRef(key)
  const lastRef = useRef(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useLayoutEffect(() => {
    refreshRef.current = refresh
  })

  useEffect(() => {
    lastRef.current = Date.now()
    return () => clearTimeout(timeoutRef.current)
  }, [])

  useEffect(() => {
    if (Object.is(key, keyRef.current)) return
    keyRef.current = key
    clearTimeout(timeoutRef.current)
    const wait = lastRef.current + WHIMSEY_MIN_REFRESH_INTERVAL - Date.now()
    timeoutRef.current = setTimeout(
      () => {
        lastRef.current = Date.now()
        refreshRef.current()
      },
      Math.max(0, wait)
    )
  }, [key])
}
