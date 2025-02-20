import { Flex, useSetBreadcrumbs } from '@pluralsh/design-system'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

import { getUserManagementBreadcrumbs } from '../UserManagement'

import WebhooksHeader from './WebhooksHeader'
import WebhooksList from './WebhooksList'

const breadcrumbs = getUserManagementBreadcrumbs('webhooks')

export function Webhooks() {
  useSetBreadcrumbs(breadcrumbs)

  return (
    <ScrollablePage
      scrollable={false}
      heading="Webhooks"
    >
      <Flex
        direction="column"
        height="100%"
        overflow="hidden"
        gap="medium"
      >
        <WebhooksHeader />
        <WebhooksList />
      </Flex>
    </ScrollablePage>
  )
}
