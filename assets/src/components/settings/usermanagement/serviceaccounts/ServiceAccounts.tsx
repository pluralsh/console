import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { SettingsPageHeader } from 'components/settings/Settings'

import { useState } from 'react'

import { getUserManagementBreadcrumbs } from '../UserManagement'

import ServiceAccountCreate from './ServiceAccountCreate'
import ServiceAccountsList from './ServiceAccountsList'

const breadcrumbs = getUserManagementBreadcrumbs('service-accounts')

export default function ServiceAccounts() {
  useSetBreadcrumbs(breadcrumbs)
  const [q, setQ] = useState('')

  return (
    <>
      <SettingsPageHeader heading="Service Accounts">
        <ServiceAccountCreate q={q} />
      </SettingsPageHeader>
      <ServiceAccountsList
        q={q}
        setQ={setQ}
      />
    </>
  )
}
