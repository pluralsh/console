import { Flex } from 'honorable'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

import WebhooksHeader from './WebhooksHeader'
import WebhooksList from './WebhooksList'

export function Webhooks() {
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
