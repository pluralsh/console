import { useContext, useState } from 'react'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { Flex } from 'honorable'
import BillingLegacyUserBanner from 'components/billing/BillingLegacyUserBanner'
import BillingFeatureBlockBanner from 'components/billing/BillingFeatureBlockBanner'
import { useQuery } from '@apollo/client'
import isEmpty from 'lodash/isEmpty'
import SubscriptionContext from 'components/contexts/SubscriptionContext'

import { List } from '../../utils/List'

import RoleCreate from './RoleCreate'
import RolesList from './RolesList'
import RolesSearchHeader from './RolesSearchHeader'
import { ROLES_Q } from './queries'

export default function Roles() {
  const [q, setQ] = useState('')
  const { data, loading, fetchMore } = useQuery(ROLES_Q, { variables: { q } })
  const { availableFeatures, isPaidPlan } = useContext(SubscriptionContext)
  const isAvailable = !!availableFeatures?.userManagement || isPaidPlan || !isEmpty(data?.roles?.edges)

  return (
    <ScrollablePage
      scrollable={false}
      heading="Roles"
      headingContent={<RoleCreate q={q} />}
    >
      <Flex
        direction="column"
        height="100%"
      >
        <BillingLegacyUserBanner feature="Roles" />
        {isAvailable ? (
          <List height="100%">
            <RolesSearchHeader
              q={q}
              setQ={setQ}
            />
            <RolesList
              q={q}
              data={data}
              loading={loading}
              fetchMore={fetchMore}
            />
          </List>
        ) : (
          <BillingFeatureBlockBanner
            feature="roles"
            description="Define granular permissions for your organization’s users and apply them to groups or individuals."
            placeholderImageURL="/placeholder-roles.png"
          />
        )}
      </Flex>
    </ScrollablePage>
  )
}
