import {
  BotIcon,
  MsTeamsLogoIcon,
  SlackLogoIcon,
} from '@pluralsh/design-system'
import {
  ChatProviderConnectionType,
  WorkbenchChatbotMessageBehavior,
} from 'generated/graphql'

export const messageBehaviorOptions = [
  {
    value: WorkbenchChatbotMessageBehavior.Reply,
    label: 'Threaded reply',
    description:
      'Replies to the mention in a thread; all responses stay threaded',
  },
  {
    value: WorkbenchChatbotMessageBehavior.Message,
    label: 'Channel post',
    description: 'Posts in the channel when the job completes',
  },
] as const

export function messageBehaviorLabel(
  behavior?: Nullable<WorkbenchChatbotMessageBehavior>
) {
  return (
    messageBehaviorOptions.find((option) => option.value === behavior)?.label ??
    messageBehaviorOptions[0].label
  )
}

export function chatProviderConnectionIcon(
  type?: Nullable<ChatProviderConnectionType>,
  fullColor: boolean = true
) {
  switch (type) {
    case ChatProviderConnectionType.Slack:
      return <SlackLogoIcon fullColor={fullColor} />
    case ChatProviderConnectionType.Teams:
      return <MsTeamsLogoIcon fullColor={fullColor} />
    default:
      return <BotIcon />
  }
}

export function chatProviderConnectionLabel(
  type?: Nullable<ChatProviderConnectionType>
) {
  switch (type) {
    case ChatProviderConnectionType.Slack:
      return 'Slack'
    case ChatProviderConnectionType.Teams:
      return 'Microsoft Teams'
    default:
      return 'Chatbot'
  }
}

export function formatChatbotChannelLabel({
  type,
  channel,
}: {
  type?: Nullable<ChatProviderConnectionType>
  channel: string
}) {
  return type === ChatProviderConnectionType.Slack ? `#${channel}` : channel
}
