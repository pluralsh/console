import BillingFeatureBlockBanner from 'components/billing/BillingFeatureBlockBanner'
import SubscriptionContext from 'components/contexts/SubscriptionContext'
import { PageToolbarPortal } from 'components/layout/PageToolbar'
import { useContext } from 'react'

import { useSetBreadcrumbs } from '@pluralsh/design-system'

import { getUserManagementBreadcrumbs } from '../UserManagement'

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
      <PageToolbarPortal>
        <PersonaCreate small />
      </PageToolbarPortal>
      <ListWrapperSC>
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
