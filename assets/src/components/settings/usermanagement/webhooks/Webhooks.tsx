import { Flex } from 'honorable'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

import { useSetBreadcrumbs } from '@pluralsh/design-system'

import { getUserManagementBreadcrumbs } from '../UserManagement'

import WebhooksList from './WebhooksList'
import WebhooksHeader from './WebhooksHeader'

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
