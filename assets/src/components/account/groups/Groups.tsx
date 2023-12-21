import { useContext, useState } from 'react'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { Flex } from 'honorable'
import BillingLegacyUserBanner from 'components/billing/BillingLegacyUserBanner'
import BillingFeatureBlockBanner from 'components/billing/BillingFeatureBlockBanner'
import SubscriptionContext from 'components/contexts/SubscriptionContext'

import { List } from '../../utils/List'

import { GroupsList } from './GroupsList'
import GroupCreate from './GroupCreate'
import GroupSearchHeader from './GroupsSearchHeader'

export default function Groups() {
  const [q, setQ] = useState('')
  const { availableFeatures } = useContext(SubscriptionContext)
  const isAvailable = !!availableFeatures?.userManagement

  return (
    <ScrollablePage
      scrollable={false}
      heading="Groups"
      headingContent={<GroupCreate q={q} />}
    >
      <Flex
        direction="column"
        height="100%"
      >
        <BillingLegacyUserBanner feature="groups" />
        {isAvailable ? (
          <List height="100%">
            <GroupSearchHeader
              q={q}
              setQ={setQ}
            />
            <GroupsList q={q} />
          </List>
        ) : (
          <BillingFeatureBlockBanner
            feature="groups"
            description="Organize your users into groups to more easily apply permissions to sub-sections of your team. e.g. ops, end-users, and admins."
            placeholderImageURL="/placeholder-groups.png"
          />
        )}
      </Flex>
    </ScrollablePage>
  )
}
