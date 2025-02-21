import {
  Flex,
  Input,
  SearchIcon,
  useSetBreadcrumbs,
} from '@pluralsh/design-system'
import BillingFeatureBlockBanner from 'components/billing/BillingFeatureBlockBanner'
import BillingLegacyUserBanner from 'components/billing/BillingLegacyUserBanner'
import SubscriptionContext from 'components/contexts/SubscriptionContext'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import { useContext, useState } from 'react'

import { List } from '../../../utils/List'

import { getUserManagementBreadcrumbs } from '../UserManagement'

import RoleCreate from './RoleCreate'
import RolesList from './RolesList'

const breadcrumbs = getUserManagementBreadcrumbs('roles')

export default function Roles() {
  const [q, setQ] = useState('')
  const { availableFeatures } = useContext(SubscriptionContext)
  const isAvailable = !!availableFeatures?.userManagement

  useSetBreadcrumbs(breadcrumbs)

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
              backgroundColor="fill-zero-hover"
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
