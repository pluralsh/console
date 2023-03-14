import { Account, AvailableFeatures, PluralSubscription } from 'generated/graphql'
import { createContext } from 'react'

export type SubscriptionContextType = {
  account?: Account
  availableFeatures?: AvailableFeatures
  subscription?: PluralSubscription
  isPaidPlan: boolean
  isProPlan: boolean
  isEnterprisePlan: boolean
  isGrandfathered: boolean
  refetch: () => void
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  isPaidPlan: false,
  isProPlan: false,
  isEnterprisePlan: false,
  isGrandfathered: false,
  refetch: () => {},
})

export default SubscriptionContext
