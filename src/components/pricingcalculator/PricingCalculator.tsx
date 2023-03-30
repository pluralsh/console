import { forwardRef, useMemo, useState } from 'react'

import Callout from '../Callout'

import {
  PROVIDERS,
  PricingCalculatorContainerQuery,
  PricingCalculatorWrap,
  estimateProviderCost,
} from './misc'
import AppsControl from './controls/AppsControl'
import ProviderControl from './controls/ProvidersControl'
import Cost from './costs/Cost'
import Costs from './costs/Costs'
import TotalCost from './costs/TotalCost'

export type PricingCalculatorProps = {
  appsDefault?: number
  expandedDefault?: boolean
}

const PricingCalculator = forwardRef<HTMLDivElement, PricingCalculatorProps>(
  ({ appsDefault = 5, expandedDefault = false }, ref) => {
    const [expanded, setExpanded] = useState(expandedDefault)
    const [providerId, setProviderId] = useState(PROVIDERS[0].id)
    const [apps, setApps] = useState(appsDefault)
    const provider = useMemo(
      () => PROVIDERS.find(({ id }) => id === providerId),
      [providerId]
    )
    const providerCost = useMemo(
      () => estimateProviderCost(provider, apps),
      [provider, apps]
    )

    return (
      <Callout
        expandable
        expanded={expanded}
        onExpand={setExpanded}
        ref={ref}
        title="Estimate your cloud cost."
      >
        <PricingCalculatorContainerQuery>
          <PricingCalculatorWrap>
            <p>
              Estimate your cloud cost to get started with Plural open-source.
            </p>
            <div className="content with-padding">
              <div className="column">
                <ProviderControl
                  header="Cloud provider"
                  providerId={providerId}
                  setProviderId={setProviderId}
                />
                <AppsControl
                  header="Applications"
                  apps={apps}
                  setApps={setApps}
                />
              </div>
              <div className="column">
                <Costs>
                  <Cost
                    cost={providerCost?.k8s}
                    label={`${provider?.name} Kubernetes cost`}
                    tooltip="Cost to deploy this provider's managed version of Kubernetes."
                  />
                  <Cost
                    cost={providerCost?.infra}
                    label={`${provider?.name} infrastructure price`}
                    tooltip="Cost to provision and run standard instances on this provider."
                  />
                  <Cost
                    cost={providerCost?.app}
                    label="Application infrastructure"
                    tooltip="Cost to deploy and run selected number of applications. Default setup includes headroom for a few applications and will scale to meet additional needs."
                  />
                </Costs>
                <TotalCost
                  providerCost={providerCost?.total}
                  provider={provider?.name}
                  marginTop={24}
                />
              </div>
            </div>
          </PricingCalculatorWrap>
        </PricingCalculatorContainerQuery>
      </Callout>
    )
  }
)

export default PricingCalculator
