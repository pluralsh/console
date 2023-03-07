import { useState } from 'react'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import BillingLegacyUserBanner from 'components/billing/BillingLegacyUserBanner'

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
      <BillingLegacyUserBanner feature="Groups" />
      <List height="100%"> {/* TODO: Fix height. */}
        <GroupSearchHeader
          q={q}
          setQ={setQ}
        />
        <GroupsList q={q} />
      </List>
    </ScrollablePage>
  )
}
