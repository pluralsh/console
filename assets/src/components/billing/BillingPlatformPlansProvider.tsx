import { ReactNode, useMemo } from 'react'
import { ApolloProvider, useQuery } from '@apollo/client'
import { client } from 'helpers/client'
import { PluralApi } from 'components/PluralApi'

import PlatformPlansContext, { PlatformPlansContextType } from '../contexts/PlatformPlansContext'

import { PLATFORM_PLANS_QUERY } from './queries'
import BillingError from './BillingError'
import BillingLoading from './BillingLoading'

type BillingPlatformPlansProviderPropsType = {
  children: ReactNode
}

export default function BillingPlatformPlansProvider({ children }: BillingPlatformPlansProviderPropsType) {
  return (
    <PluralApi> {/* Switch to Plural API. */}
      <BillingPlatformPlansProviderInternal>
        <ApolloProvider client={client}> {/* Switch back to Console API. */}
          {children}
        </ApolloProvider>
      </BillingPlatformPlansProviderInternal>
    </PluralApi>
  )
}

function BillingPlatformPlansProviderInternal({ children }: BillingPlatformPlansProviderPropsType) {
  const { data, loading, error } = useQuery(PLATFORM_PLANS_QUERY)

  const platformPlans = useMemo(() => data?.platformPlans, [data])
  const proPlatformPlan = useMemo(() => (platformPlans ? platformPlans.find(p => p.name === 'Pro' && p.period === 'MONTHLY')! : {}), [platformPlans])
  const proYearlyPlatformPlan = useMemo(() => (platformPlans ? platformPlans.find(p => p.name === 'Pro' && p.period === 'YEARLY')! : {}), [platformPlans])
  const enterprisePlatformPlan = useMemo(() => (platformPlans ? platformPlans.find(p => p.name === 'Enterprise')! : {}), [platformPlans])

  const platformPlansContextValue = useMemo<PlatformPlansContextType>(() => ({
    platformPlans,
    proPlatformPlan,
    proYearlyPlatformPlan,
    enterprisePlatformPlan,
  }), [
    platformPlans,
    proPlatformPlan,
    proYearlyPlatformPlan,
    enterprisePlatformPlan,
  ])

  if (error) return <BillingError />
  if (loading) return <BillingLoading />
  if (!(platformPlans?.length && proPlatformPlan)) return <BillingError /> // The children should always have access to the core data

  return (
    <PlatformPlansContext.Provider value={platformPlansContextValue}>
      {children}
    </PlatformPlansContext.Provider>
  )
}
