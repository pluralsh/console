import { Account, AvailableFeatures, PluralSubscription } from 'generated/graphql'
import { createContext } from 'react'

export type SubscriptionContextType = {
  account?: Account
  availableFeatures?: AvailableFeatures
  subscription?: PluralSubscription
  isPaidPlan: boolean
  isProPlan: boolean
  isEnterprisePlan: boolean
  isLegacyUser: boolean
  isGrandfathered: boolean
  isGrandfatheringExpired: boolean
  refetch: () => void
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  isPaidPlan: false,
  isProPlan: false,
  isEnterprisePlan: false,
  isLegacyUser: false,
  isGrandfathered: false,
  isGrandfatheringExpired: false,
  refetch: () => {},
})

export default SubscriptionContext
