import { useState } from 'react'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import BillingLegacyUserBanner from 'components/billing/BillingLegacyUserBanner'
import BillingFeatureBlockBanner from 'components/billing/BillingFeatureBlockBanner'

import { List } from '../../utils/List'

import RoleCreate from './RoleCreate'
import RolesList from './RolesList'
import RolesSearchHeader from './RolesSearchHeader'

export default function Roles() {
  const [q, setQ] = useState('')

  return (
    <ScrollablePage
      scrollable={false}
      heading="Roles"
      headingContent={<RoleCreate q={q} />}
    >
      <BillingLegacyUserBanner feature="Roles" />
      <List height="100%"> {/* TODO: Fix height. */}
        <RolesSearchHeader
          q={q}
          setQ={setQ}
        />
        <RolesList q={q} />
      </List>
      <BillingFeatureBlockBanner
        feature="roles"
        description="Define granular permissions for your organization's users and apply them to groups or individuals."
        placeholderImageURL="/placeholder-roles.png"
      />
    </ScrollablePage>
  )
}
