import { Flex } from 'honorable'

import { ScrollablePage } from 'components/utils/layout/ScrollablePage'

import { useSetBreadcrumbs } from '@pluralsh/design-system'
import { useMemo } from 'react'

import { BREADCRUMBS } from '../Account'

import WebhooksList from './WebhooksList'
import WebhooksHeader from './WebhooksHeader'

export function Webhooks() {
  useSetBreadcrumbs(
    useMemo(
      () => [...BREADCRUMBS, { label: 'webhooks', url: '/account/webhooks' }],
      []
    )
  )

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
