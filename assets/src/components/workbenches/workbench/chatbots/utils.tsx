import {
  BotIcon,
  MsTeamsLogoIcon,
  SlackLogoIcon,
} from '@pluralsh/design-system'
import { ChatProviderConnectionType as ChatProviderConnectionTypeGql } from 'generated/graphql'

export function chatProviderConnectionIcon(
  type?: Nullable<ChatProviderConnectionTypeGql>
) {
  switch (type) {
    case ChatProviderConnectionTypeGql.Slack:
      return <SlackLogoIcon fullColor />
    case ChatProviderConnectionTypeGql.Teams:
      return <MsTeamsLogoIcon fullColor />
    default:
      return <BotIcon />
  }
}

export function chatProviderConnectionLabel(
  type?: Nullable<ChatProviderConnectionTypeGql>
) {
  switch (type) {
    case ChatProviderConnectionTypeGql.Slack:
      return 'Slack'
    case ChatProviderConnectionTypeGql.Teams:
      return 'Microsoft Teams'
    default:
      return 'Chatbot'
  }
}
