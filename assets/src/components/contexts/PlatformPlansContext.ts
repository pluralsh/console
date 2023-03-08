import { createContext } from 'react'

export type PlatformPlansContextType = {
  platformPlans: any[]
  proPlatformPlan: any
  proYearlyPlatformPlan: any
  enterprisePlatformPlan: any
}

const PlatformPlansContext = createContext<PlatformPlansContextType>({
  platformPlans: [],
  proPlatformPlan: {},
  proYearlyPlatformPlan: {},
  enterprisePlatformPlan: {},
})

export default PlatformPlansContext
