import { ReactNode, useMemo } from 'react'
import { useQuery } from '@apollo/client'
import moment from 'moment'
// import posthog from 'posthog-js'

import SubscriptionContext, { SubscriptionContextType } from 'components/contexts//SubscriptionContext'

import { PluralApi } from 'components/PluralApi'

import BillingError from './BillingError'
import BillingLoading from './BillingLoading'
import { SUBSCRIPTION_QUERY } from './queries'

type BillingSubscriptionProviderPropsType = {
  children: ReactNode
}

export default function BillingSubscriptionProvider({ children }: BillingSubscriptionProviderPropsType) {
  return (
    <PluralApi>
      <BillingSubscriptionProviderInternal>
        {children}
      </BillingSubscriptionProviderInternal>
    </PluralApi>
  )
}

function BillingSubscriptionProviderInternal({ children }: BillingSubscriptionProviderPropsType) {
  const {
    data,
    loading,
    error,
    refetch,
  } = useQuery(SUBSCRIPTION_QUERY, { fetchPolicy: 'network-only', pollInterval: 60_000 })

  // const { proPlatformPlan, proYearlyPlatformPlan, enterprisePlatformPlan } = useContext(PlatformPlansContext)
  const proPlatformPlan = { id: '' }
  const proYearlyPlatformPlan = { id: '' }
  const enterprisePlatformPlan = { id: '' }

  const pricingFeaturesEnabled = useMemo(() => true, []) // posthog.isFeatureEnabled('pricing'), [])
  const subscription = useMemo(() => data?.account?.subscription, [data])
  const billingAddress = useMemo(() => data?.account?.billingAddress ?? null, [data])
  const isProPlan = useMemo(() => !!subscription?.plan?.id && (subscription.plan.id === proPlatformPlan?.id || subscription.plan.id === proYearlyPlatformPlan?.id), [subscription, proPlatformPlan, proYearlyPlatformPlan])
  const isEnterprisePlan = useMemo(() => !!subscription?.plan?.id && subscription.plan.id === enterprisePlatformPlan?.id, [subscription, enterprisePlatformPlan])
  const isPaidPlan = useMemo(() => isProPlan || isEnterprisePlan, [isProPlan, isEnterprisePlan])
  const isGrandfathered = useMemo(() => moment().isBefore(moment(data?.account?.grandfatheredUntil)), [data])
  const subscriptionContextValue = useMemo<SubscriptionContextType>(() => ({
    pricingFeaturesEnabled,
    subscription,
    billingAddress,
    isProPlan,
    isEnterprisePlan,
    isPaidPlan,
    isGrandfathered,
    account: data?.account,
    availableFeatures: data?.account?.availableFeatures,
    refetch,
  }), [
    pricingFeaturesEnabled,
    subscription,
    billingAddress,
    isProPlan,
    isEnterprisePlan,
    isPaidPlan,
    isGrandfathered,
    refetch,
    data,
  ])

  if (error) return <BillingError />
  if (loading) return <BillingLoading />

  return (
    <SubscriptionContext.Provider value={subscriptionContextValue}>
      {children}
    </SubscriptionContext.Provider>
  )
}
