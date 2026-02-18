import SubscriptionContext, {
  SubscriptionContextType,
} from 'components/contexts/SubscriptionContext'
import { ReactNode, useMemo } from 'react'
import { dayjsExtended as dayjs, isBefore, toDateOrUndef } from 'utils/datetime'

import { useSubscriptionSuspenseQuery } from '../../generated/graphql.ts'

type BillingSubscriptionProviderPropsType = {
  children: ReactNode
}

export function BillingSubscriptionProvider({
  children,
}: BillingSubscriptionProviderPropsType) {
  const { data, refetch } = useSubscriptionSuspenseQuery({
    fetchPolicy: 'network-only',
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
    const licenseExpiry = toDateOrUndef(data?.configuration?.licenseExpiry)
    const isLicenseExpiring =
      !!licenseExpiry &&
      dayjs(licenseExpiry).isBetween(dayjs(), dayjs().add(1, 'week'))

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
      isLicenseExpiring,
      licenseExpiry,
      refetch,
    }
  }, [data, refetch])

  return (
    <SubscriptionContext value={subscriptionContextValue}>
      {children}
    </SubscriptionContext>
  )
}
