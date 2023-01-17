import { Card, IconFrame, SlackLogoIcon } from '@pluralsh/design-system'
import { Flex, P } from 'honorable'

import WebhookCreate from './WebhookCreate'

export default function WebhooksHeader() {
  return (
    <Card
      display="flex"
      gap="medium"
      padding="medium"
    >
      <IconFrame
        icon={<SlackLogoIcon />}
        size="large"
        textValue="Slack"
        type="floating"
      />
      <div>
        <P
          body1
          fontWeight={600}
        >
          Slack
        </P>
        <P
          caption
          color="text-xlight"
        >
          Previews alerts and other notifications from Slack.
        </P>
      </div>
      <Flex grow={1} />
      <WebhookCreate />
    </Card>
  )
}
