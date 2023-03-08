import { createContext } from 'react'

export type SubscriptionContextType = {
  account: any | null
  isPaidPlan: boolean
  isProPlan: boolean
  isEnterprisePlan: boolean
  isGrandfathered: boolean
  refetch: () => void
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  account: null,
  isPaidPlan: false,
  isProPlan: false,
  isEnterprisePlan: false,
  isGrandfathered: false,
  refetch: () => {},
})

export default SubscriptionContext
