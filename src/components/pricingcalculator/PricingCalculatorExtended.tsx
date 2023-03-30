import { forwardRef, useEffect, useMemo, useState } from 'react'
import { Switch } from 'honorable'

import Card, { CardProps } from '../Card'

import {
  PROVIDERS,
  PricingCalculatorContainerQuery,
  PricingCalculatorWrap,
  estimatePluralCost,
  estimateProviderCost,
} from './misc'
import AppsControl from './controls/AppsControl'
import ProviderControl from './controls/ProvidersControl'
import Cost from './costs/Cost'
import UsersControl from './controls/UsersControl'
import ClustersControl from './controls/ClustersControl'
import Costs from './costs/Costs'
import TotalCost from './costs/TotalCost'

export type PricingCalculatorProps = {
  appsDefault?: number
  clustersDefault?: number
  usersDefault?: number
  professionalDefault?: boolean
} & CardProps

const PricingCalculatorExtended = forwardRef<
  HTMLDivElement,
  PricingCalculatorProps
>(
  (
    {
      appsDefault = 5,
      clustersDefault = 1,
      usersDefault = 0,
      professionalDefault = false,
      ...props
    },
    ref
  ) => {
    const [providerId, setProviderId] = useState(PROVIDERS[0].id)
    const [clusters, setClusters] = useState(clustersDefault)
    const [apps, setApps] = useState(appsDefault)
    const [users, setUsers] = useState(usersDefault)
    const [enforcedPro, setEnforcedPro] = useState(users > 5)
    const [professional, setProfessional] = useState(
      professionalDefault || enforcedPro
    )
    const provider = useMemo(
      () => PROVIDERS.find(({ id }) => id === providerId),
      [providerId]
    )
    const providerCost = useMemo(
      () => estimateProviderCost(provider, apps, clusters),
      [provider, apps, clusters]
    )
    const pluralCost = useMemo(
      () => estimatePluralCost(professional, clusters, users),
      [professional, clusters, users]
    )

    useEffect(() => {
      if (users > 5 && !professional) {
        setProfessional(true)
        setEnforcedPro(true)
      }
      if (users <= 5 && enforcedPro) {
        setProfessional(false)
        setEnforcedPro(false)
      }
    }, [users, professional, setProfessional, enforcedPro, setEnforcedPro])

    return (
      <Card
        padding="xlarge"
        {...props}
        ref={ref}
      >
        <PricingCalculatorContainerQuery>
          <PricingCalculatorWrap>
            <div className="content">
              <div className="column">
                <ProviderControl
                  header="What cloud provider will you use?"
                  providerId={providerId}
                  setProviderId={setProviderId}
                />
                <ClustersControl
                  clusters={clusters}
                  setClusters={setClusters}
                />
                <AppsControl
                  header="How many applications do you plan to install?"
                  caption="The default deployment includes headroom for a few applications, but will scale as necessary to accommodate more."
                  apps={apps}
                  setApps={setApps}
                />
                <UsersControl
                  users={users}
                  setUsers={setUsers}
                />
                <div className="hint">
                  *Accounts requiring {'>'}6 clusters or {'>'}60 users should
                  reach out to discuss our Enterprise option to optimize plan
                  costs to your specific needs.
                </div>
              </div>
              <div className="column">
                <Switch
                  disabled={users > 5}
                  checked={professional}
                  onChange={({ target: { checked } }) =>
                    setProfessional(checked)
                  }
                  marginBottom="xlarge"
                >
                  Professional plan
                </Switch>
                <Costs header="Cloud costs">
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
                <Costs
                  header="Plural costs"
                  marginTop={48}
                >
                  <Cost
                    cost={pluralCost?.clusters}
                    label={`for ${clusters} cluster${
                      clusters !== 1 ? 's' : ''
                    }`}
                  />
                  <Cost
                    cost={pluralCost?.users}
                    label={`for ${users === 0 ? '0-5' : users} users`}
                  />
                </Costs>
                <TotalCost
                  providerCost={providerCost?.total}
                  provider={provider?.name}
                  proPlan={professional}
                  pluralCost={pluralCost?.total}
                />
              </div>
            </div>
          </PricingCalculatorWrap>
        </PricingCalculatorContainerQuery>
      </Card>
    )
  }
)

export default PricingCalculatorExtended
