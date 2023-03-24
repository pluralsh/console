import { useContext, useState } from 'react'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { Flex } from 'honorable'
import BillingLegacyUserBanner from 'components/billing/BillingLegacyUserBanner'
import BillingFeatureBlockBanner from 'components/billing/BillingFeatureBlockBanner'
import { useGroupsQuery } from 'generated/graphql'
import SubscriptionContext from 'components/contexts/SubscriptionContext'
import { isEmpty } from 'lodash'

import { List } from '../../utils/List'

import { GroupsList } from './GroupsList'
import GroupCreate from './GroupCreate'
import GroupSearchHeader from './GroupsSearchHeader'

export function Groups() {
  const [q, setQ] = useState('')
  const { data, loading, fetchMore } = useGroupsQuery({ variables: { q } })
  const { availableFeatures, isPaidPlan } = useContext(SubscriptionContext)
  const isAvailable = !!availableFeatures?.userManagement || isPaidPlan || !isEmpty(data?.groups?.edges)

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
        {isAvailable ? (
          <List height="100%">
            <GroupSearchHeader
              q={q}
              setQ={setQ}
            />
            <GroupsList
              q={q}
              data={data}
              loading={loading}
              fetchMore={fetchMore}
            />
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
