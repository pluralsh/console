import { useContext, useState } from 'react'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import BillingLegacyUserBanner from 'components/billing/BillingLegacyUserBanner'
import BillingFeatureBlockBanner from 'components/billing/BillingFeatureBlockBanner'
import SubscriptionContext from 'components/contexts/SubscriptionContext'

import { Input, SearchIcon } from '@pluralsh/design-system'

import { GroupsList } from './GroupsList'
import GroupCreate from './GroupCreate'

export function Groups() {
  const [q, setQ] = useState('')
  const { availableFeatures } = useContext(SubscriptionContext)
  const isAvailable = !!availableFeatures?.userManagement

  return (
    <ScrollablePage
      scrollable={false}
      heading="Groups"
      headingContent={<GroupCreate q={q} />}
    >
      <BillingLegacyUserBanner feature="groups" />
      {isAvailable ? (
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          }}
        >
          <Input
            value={q}
            placeholder="Search a group"
            startIcon={<SearchIcon color="text-light" />}
            onChange={({ target: { value } }) => setQ(value)}
            backgroundColor="fill-one"
            marginBottom="small"
          />
          <GroupsList q={q} />
        </div>
      ) : (
        <BillingFeatureBlockBanner
          feature="groups"
          description="Organize your users into groups to more easily apply permissions to sub-sections of your team. e.g. ops, end-users, and admins."
          placeholderImageURL="/placeholder-groups.png"
        />
      )}
    </ScrollablePage>
  )
}
