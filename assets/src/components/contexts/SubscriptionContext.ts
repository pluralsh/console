import { createContext } from 'react'

export type SubscriptionContextType = {
  pricingFeaturesEnabled: boolean
  account: any | null
  isPaidPlan: boolean
  isProPlan: boolean
  isEnterprisePlan: boolean
  isGrandfathered: boolean
  refetch: () => void
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  pricingFeaturesEnabled: false, // TODO: Put everything behind feature flag?
  account: null,
  isPaidPlan: false,
  isProPlan: false,
  isEnterprisePlan: false,
  isGrandfathered: false,
  refetch: () => {},
})

export default SubscriptionContext
