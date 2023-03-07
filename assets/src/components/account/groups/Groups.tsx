import { useState } from 'react'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import BillingLegacyUserBanner from 'components/billing/BillingLegacyUserBanner'
import BillingFeatureBlockBanner from 'components/billing/BillingFeatureBlockBanner'

import { Flex } from 'honorable'

import { List } from '../../utils/List'

import { GroupsList } from './GroupsList'
import GroupCreate from './GroupCreate'
import GroupSearchHeader from './GroupsSearchHeader'

export function Groups() {
  const [q, setQ] = useState('')

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
        <BillingLegacyUserBanner feature="Groups" />
        <List height="100%">
          <GroupSearchHeader
            q={q}
            setQ={setQ}
          />
          <GroupsList q={q} />
        </List>
        <BillingFeatureBlockBanner
          feature="groups"
          description="Organize your users into groups to more easily apply permissions to sub-sections of your team. e.g. ops, end-users, and admins."
          placeholderImageURL="/placeholder-groups.png"
        />
      </Flex>
    </ScrollablePage>
  )
}
