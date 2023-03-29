import {
  Account,
  AvailableFeatures,
  PluralSubscription,
} from 'generated/graphql'
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
  isGrandfathetingExpired: boolean
  refetch: () => void
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  isPaidPlan: false,
  isProPlan: false,
  isEnterprisePlan: false,
  isLegacyUser: false,
  isGrandfathered: false,
  isGrandfathetingExpired: false,
  refetch: () => {},
})

export default SubscriptionContext
