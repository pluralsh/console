import { ReactNode, useMemo } from 'react'
import { dayjsExtended as dayjs, isBefore } from 'utils/datetime'
import SubscriptionContext, {
  SubscriptionContextType,
} from 'components/contexts/SubscriptionContext'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import styled from 'styled-components'

import { useSubscriptionQuery } from '../../generated/graphql.ts'

const Error = styled.div({ textAlign: 'center' })

type BillingSubscriptionProviderPropsType = {
  children: ReactNode
}

export default function BillingSubscriptionProvider({
  children,
}: BillingSubscriptionProviderPropsType) {
  const { data, loading, error, refetch } = useSubscriptionQuery({
    fetchPolicy: 'network-only',
    pollInterval: 60_000,
  })

  const subscriptionContextValue = useMemo<SubscriptionContextType>(() => {
    const account = data?.account
    const availableFeatures = account?.availableFeatures
    const subscription = account?.subscription
    const plan = subscription?.plan
    const isProPlan = plan?.name === 'Pro'
    const isEnterprisePlan = plan?.name === 'Enterprise'
    const isPaidPlan = isProPlan || isEnterprisePlan
    const grandfatheredUntil = account?.grandfatheredUntil
    const isLegacyUser = !!grandfatheredUntil
    const isGrandfathered =
      isLegacyUser && isBefore(new Date(), grandfatheredUntil)

    // Marking grandfathering as expired only for a month after expiry date.
    // Afterwards expiry banners will not be visible and UI will be the same as for open-source users.
    const isGrandfatheringExpired =
      isLegacyUser &&
      dayjs().isBetween(
        dayjs(grandfatheredUntil),
        dayjs(grandfatheredUntil).add(1, 'month'),
        null,
        '[)'
      )

    return {
      account,
      availableFeatures,
      subscription,
      isProPlan,
      isEnterprisePlan,
      isPaidPlan,
      isLegacyUser,
      isGrandfathered,
      isGrandfatheringExpired,
      refetch,
    }
  }, [data, refetch])

  if (error)
    return (
      <Error>
        An error occured, please reload the page or contact support.
      </Error>
    )
  if (loading) return <LoadingIndicator />

  return (
    <SubscriptionContext.Provider value={subscriptionContextValue}>
      {children}
    </SubscriptionContext.Provider>
  )
}
