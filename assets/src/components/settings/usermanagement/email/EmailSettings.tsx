import { SMTP_Q } from 'components/graphql/plural'
import { useQuery } from '@apollo/client'
import { ScrollablePage } from 'components/utils/layout/ScrollablePage'
import LoadingIndicator from 'components/utils/LoadingIndicator'

import { useSetBreadcrumbs } from '@pluralsh/design-system'

import { getUserManagementBreadcrumbs } from '../UserManagement'

import EmailSettingsForm from './EmailSettingsForm'

const breadcrumbs = getUserManagementBreadcrumbs('email-settings')

export default function EmailSettings() {
  const { data } = useQuery(SMTP_Q)

  useSetBreadcrumbs(breadcrumbs)

  return (
    <ScrollablePage
      scrollable={false}
      heading="Email settings"
    >
      {data ? <EmailSettingsForm smtp={data.smtp} /> : <LoadingIndicator />}
    </ScrollablePage>
  )
}
