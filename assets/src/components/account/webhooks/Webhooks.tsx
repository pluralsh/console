import { Div, Flex, P } from 'honorable'
import {
  Card,
  IconFrame,
  PageTitle,
  SlackLogoIcon,
} from '@pluralsh/design-system'

import { CreateWebhook } from './CreateWebhook'

function Heading() {
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
      <Div>
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
      </Div>
      <Flex grow={1} />
      <CreateWebhook />
    </Card>
  )
}

export function Webhooks() {
  return (
    <Flex
      flexGrow={1}
      flexDirection="column"
      maxHeight="100%"
    >
      <PageTitle heading="Webhooks" />
      <Heading />
    </Flex>
  )
}
