import { ReactNode, useMemo } from 'react'
import { useQuery } from '@apollo/client'
import moment from 'moment'
import SubscriptionContext, {
  SubscriptionContextType,
} from 'components/contexts//SubscriptionContext'
import LoadingIndicator from 'components/utils/LoadingIndicator'
import styled from 'styled-components'

import { SUBSCRIPTION_QUERY } from './queries'

const Error = styled.div({ textAlign: 'center' })

type BillingSubscriptionProviderPropsType = {
  children: ReactNode
}

export default function BillingSubscriptionProvider({
  children,
}: BillingSubscriptionProviderPropsType) {
  const { data, loading, error, refetch } = useQuery(SUBSCRIPTION_QUERY, {
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
      isLegacyUser && moment().isBefore(moment(grandfatheredUntil))

    // Marking grandfathering as expired only for a month after expiry date.
    // Afterwards expiry banners will not be visible and UI will be the same as for open-source users.
    const isGrandfathetingExpired =
      isLegacyUser &&
      moment().isBetween(
        moment(grandfatheredUntil),
        moment(grandfatheredUntil).add(1, 'M')
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
      isGrandfathetingExpired,
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
