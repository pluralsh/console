import { useSetBreadcrumbs } from '@pluralsh/design-system'
import {
  PageToolbarPortal,
  ToolbarSearchInput,
} from 'components/layout/PageToolbar'

import { useState } from 'react'

import { getUserManagementBreadcrumbs } from '../UserManagement'

import ServiceAccountCreate from './ServiceAccountCreate'
import { ServiceAccountsList } from './ServiceAccountsList'

const breadcrumbs = getUserManagementBreadcrumbs('service-accounts')

export default function ServiceAccounts() {
  useSetBreadcrumbs(breadcrumbs)
  const [q, setQ] = useState('')

  return (
    <>
      <PageToolbarPortal>
        <ToolbarSearchInput
          placeholder="Search an account"
          value={q}
          onChange={setQ}
        />
        <ServiceAccountCreate
          q={q}
          small
        />
      </PageToolbarPortal>
      <ServiceAccountsList q={q} />
    </>
  )
}
