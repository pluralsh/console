import { Flex } from 'honorable'
import { PageTitle } from '@pluralsh/design-system'

import WebhooksHeader from './WebhooksHeader'
import WebhooksList from './WebhooksList'

export function Webhooks() {
  return (
    <Flex
      flexGrow={1}
      flexDirection="column"
      maxHeight="100%"
      overflow="hidden"
    >
      <PageTitle heading="Webhooks" />
      <WebhooksHeader />
      <WebhooksList />
    </Flex>
  )
}
