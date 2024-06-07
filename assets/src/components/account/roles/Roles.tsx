import { useContext, useMemo, useState } from 'react'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { Flex } from 'honorable'
import BillingLegacyUserBanner from 'components/billing/BillingLegacyUserBanner'
import BillingFeatureBlockBanner from 'components/billing/BillingFeatureBlockBanner'
import SubscriptionContext from 'components/contexts/SubscriptionContext'

import { Input, SearchIcon, useSetBreadcrumbs } from '@pluralsh/design-system'

import { List } from '../../utils/List'

import { BREADCRUMBS } from '../Account'

import RoleCreate from './RoleCreate'
import RolesList from './RolesList'

export default function Roles() {
  const [q, setQ] = useState('')
  const { availableFeatures } = useContext(SubscriptionContext)
  const isAvailable = !!availableFeatures?.userManagement

  useSetBreadcrumbs(
    useMemo(
      () => [...BREADCRUMBS, { label: 'roles', url: '/account/roles' }],
      []
    )
  )

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
        <BillingLegacyUserBanner feature="roles" />
        {isAvailable ? (
          <>
            <Input
              value={q}
              placeholder="Search a role"
              startIcon={<SearchIcon color="text-light" />}
              onChange={({ target: { value } }) => setQ(value)}
              backgroundColor="fill-one"
              marginBottom="small"
            />
            <List height="100%">
              <RolesList q={q} />
            </List>
          </>
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
