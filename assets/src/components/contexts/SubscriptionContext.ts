import { Account, AvailableFeatures, PluralSubscription } from 'generated/graphql'
import { createContext } from 'react'

export type SubscriptionContextType = {
  account: Account | null
  availableFeatures: AvailableFeatures | null
  subscription: PluralSubscription | null
  isPaidPlan: boolean
  isProPlan: boolean
  isEnterprisePlan: boolean
  isGrandfathered: boolean
  refetch: () => void
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  account: null,
  availableFeatures: null,
  subscription: null,
  isPaidPlan: false,
  isProPlan: false,
  isEnterprisePlan: false,
  isGrandfathered: false,
  refetch: () => {},
})

export default SubscriptionContext
