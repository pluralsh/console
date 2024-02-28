import { useContext, useState } from 'react'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { Flex } from 'honorable'
import BillingLegacyUserBanner from 'components/billing/BillingLegacyUserBanner'
import BillingFeatureBlockBanner from 'components/billing/BillingFeatureBlockBanner'
import SubscriptionContext from 'components/contexts/SubscriptionContext'

import { List } from '../../utils/List'

import { PersonasList } from './PersonasList'
import PersonaCreate from './PersonaCreate'
import PersonaSearchHeader from './PersonasSearchHeader'

export function Personas() {
  const [q, setQ] = useState('')
  const { availableFeatures } = useContext(SubscriptionContext)
  const isAvailable = !!availableFeatures?.userManagement

  return (
    <ScrollablePage
      scrollable={false}
      heading="Personas"
      headingContent={<PersonaCreate q={q} />}
    >
      <Flex
        direction="column"
        height="100%"
      >
        <BillingLegacyUserBanner feature="personas" />
        {isAvailable ? (
          <List height="100%">
            <PersonaSearchHeader
              q={q}
              setQ={setQ}
            />
            <PersonasList q={q} />
          </List>
        ) : (
          <BillingFeatureBlockBanner
            feature="personas"
            description="Organize your users into personas to more easily apply permissions to sub-sections of your team. e.g. ops, end-users, and admins."
            placeholderImageURL="/placeholder-personas.png"
          />
        )}
      </Flex>
    </ScrollablePage>
  )
}
