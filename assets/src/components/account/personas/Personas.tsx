import { useContext } from 'react'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import BillingLegacyUserBanner from 'components/billing/BillingLegacyUserBanner'
import BillingFeatureBlockBanner from 'components/billing/BillingFeatureBlockBanner'
import SubscriptionContext from 'components/contexts/SubscriptionContext'

import { List } from '../../utils/List'

import { PersonasList } from './PersonasList'
import PersonaCreate from './PersonaCreate'

export function Personas() {
  const { availableFeatures } = useContext(SubscriptionContext)
  const isAvailable = !!availableFeatures?.userManagement

  return (
    <ScrollablePage
      scrollable={false}
      heading="Personas"
      headingContent={<PersonaCreate />}
    >
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        <BillingLegacyUserBanner feature="personas" />
        {isAvailable ? (
          <List height="100%">
            <PersonasList />
          </List>
        ) : (
          <BillingFeatureBlockBanner
            feature="personas"
            description="Assign personas to your users to limit which parts of the app they can access."
          />
        )}
      </div>
    </ScrollablePage>
  )
}
