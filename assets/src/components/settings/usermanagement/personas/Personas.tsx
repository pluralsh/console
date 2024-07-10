import BillingFeatureBlockBanner from 'components/billing/BillingFeatureBlockBanner'
import BillingLegacyUserBanner from 'components/billing/BillingLegacyUserBanner'
import SubscriptionContext from 'components/contexts/SubscriptionContext'
import { useContext } from 'react'

import { useSetBreadcrumbs } from '@pluralsh/design-system'

import {
  SettingsPageHeader,
  getUserManagementBreadcrumbs,
} from '../UserManagement'

import { ListWrapperSC } from '../users/UsersList'

import PersonaCreate from './PersonaCreate'
import { PersonasList } from './PersonasList'

const breadcrumbs = getUserManagementBreadcrumbs('personas')

export function Personas() {
  const { availableFeatures } = useContext(SubscriptionContext)
  const isAvailable = !!availableFeatures?.userManagement

  useSetBreadcrumbs(breadcrumbs)

  return (
    <>
      <SettingsPageHeader heading="Personas">
        <PersonaCreate />
      </SettingsPageHeader>

      <ListWrapperSC>
        <BillingLegacyUserBanner feature="personas" />
        {isAvailable ? (
          <PersonasList />
        ) : (
          <BillingFeatureBlockBanner
            feature="personas"
            description="Assign personas to your users to limit which parts of the app they can access."
          />
        )}
      </ListWrapperSC>
    </>
  )
}
