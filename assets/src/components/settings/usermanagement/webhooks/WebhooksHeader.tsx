import { Card, IconFrame, SlackLogoIcon } from '@pluralsh/design-system'
import { useTheme } from 'styled-components'
import { Body1BoldP, CaptionP } from 'components/utils/typography/Text'

import WebhookCreate from './WebhookCreate'

export default function WebhooksHeader() {
  const theme = useTheme()

  return (
    <Card
      css={{
        '&&': {
          display: 'flex',
          gap: theme.spacing.medium,
          padding: theme.spacing.medium,
          alignItems: 'center',
        },
      }}
    >
      <IconFrame
        icon={<SlackLogoIcon fullColor />}
        size="large"
        textValue="Slack"
        type="secondary"
      />
      <div>
        <Body1BoldP>Slack</Body1BoldP>
        <CaptionP
          css={{
            color: theme.colors['text-light'],
          }}
        >
          Previews alerts and other notifications from Slack.
        </CaptionP>
      </div>
      <div css={{ flexGrow: 1 }} />
      <WebhookCreate />
    </Card>
  )
}
