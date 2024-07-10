import BillingFeatureBlockBanner from 'components/billing/BillingFeatureBlockBanner'
import BillingLegacyUserBanner from 'components/billing/BillingLegacyUserBanner'
import SubscriptionContext from 'components/contexts/SubscriptionContext'
import { useContext, useState } from 'react'

import { Input, SearchIcon, useSetBreadcrumbs } from '@pluralsh/design-system'

import {
  SettingsPageHeader,
  getUserManagementBreadcrumbs,
} from '../UserManagement'

import { ListWrapperSC } from '../users/UsersList'

import GroupCreate from './GroupCreate'
import { GroupsList } from './GroupsList'

export const GROUPS_QUERY_PAGE_SIZE = 100

const breadcrumbs = getUserManagementBreadcrumbs('groups')

export function Groups() {
  const [q, setQ] = useState('')
  const { availableFeatures } = useContext(SubscriptionContext)
  const isAvailable = !!availableFeatures?.userManagement

  useSetBreadcrumbs(breadcrumbs)

  return (
    <>
      <SettingsPageHeader heading="Groups">
        <GroupCreate q={q} />
      </SettingsPageHeader>
      <BillingLegacyUserBanner feature="groups" />
      {isAvailable ? (
        <ListWrapperSC>
          <Input
            value={q}
            placeholder="Search a group"
            startIcon={<SearchIcon color="text-light" />}
            onChange={({ target: { value } }) => setQ(value)}
            backgroundColor="fill-one"
          />
          <GroupsList q={q} />
        </ListWrapperSC>
      ) : (
        <BillingFeatureBlockBanner
          feature="groups"
          description="Organize your users into groups to more easily apply permissions to sub-sections of your team. e.g. ops, end-users, and admins."
          placeholderImageURL="/placeholder-groups.png"
        />
      )}
    </>
  )
}
