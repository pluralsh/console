import { ReactNode, useContext, useMemo } from 'react'
import { ApolloProvider, useQuery } from '@apollo/client'
import moment from 'moment'
import SubscriptionContext, { SubscriptionContextType } from 'components/contexts//SubscriptionContext'
import { PluralApi } from 'components/PluralApi'
import { client } from 'helpers/client'
import PlatformPlansContext from 'components/contexts/PlatformPlansContext'

import BillingError from './BillingError'
import BillingLoading from './BillingLoading'
import { SUBSCRIPTION_QUERY } from './queries'

type BillingSubscriptionProviderPropsType = {
  children: ReactNode
}

export default function BillingSubscriptionProvider({ children }: BillingSubscriptionProviderPropsType) {
  return (
    <PluralApi> {/* Switch to Plural API. */}
      <BillingSubscriptionProviderInternal>
        <ApolloProvider client={client}> {/* Switch back to Console API. */}
          {children}
        </ApolloProvider>
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
  } = useQuery(SUBSCRIPTION_QUERY, {
    fetchPolicy: 'network-only',
    pollInterval: 60_000,
  })

  const {
    proPlatformPlan,
    proYearlyPlatformPlan,
    enterprisePlatformPlan,
  } = useContext(PlatformPlansContext)

  const pricingFeaturesEnabled = true // TODO: useMemo(() => posthog.isFeatureEnabled('pricing'), [])

  const subscription = useMemo(() => data?.account?.subscription, [data])

  const planId = useMemo(() => subscription?.plan?.id, [subscription])

  const isProPlan = useMemo(() => !!planId && (planId === proPlatformPlan?.id || planId === proYearlyPlatformPlan?.id),
    [planId, proPlatformPlan, proYearlyPlatformPlan])

  const isEnterprisePlan = useMemo(() => !!planId && planId === enterprisePlatformPlan?.id,
    [planId, enterprisePlatformPlan])

  const isPaidPlan = useMemo(() => isProPlan || isEnterprisePlan,
    [isProPlan, isEnterprisePlan])

  const isGrandfathered = useMemo(() => moment().isBefore(moment(data?.account?.grandfatheredUntil)),
    [data])

  const subscriptionContextValue = useMemo<SubscriptionContextType>(() => ({
    pricingFeaturesEnabled,
    subscription,
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
