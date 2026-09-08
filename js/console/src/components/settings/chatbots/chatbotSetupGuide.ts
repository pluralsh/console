import { ChatProviderConnectionType } from 'generated/graphql'

export const SLACK_CHATBOT_SETUP_GUIDE_MARKDOWN_PATH =
  '/setup-guides/chatbots/slack.md'
export const SLACK_CHATBOT_SETUP_GUIDE_DOCUMENTATION_URL =
  'https://api.slack.com/apis/connections/socket'

export const TEAMS_CHATBOT_SETUP_GUIDE_MARKDOWN_PATH =
  '/setup-guides/chatbots/teams.md'
export const TEAMS_CHATBOT_SETUP_GUIDE_DOCUMENTATION_URL =
  'https://learn.microsoft.com/en-us/azure/bot-service/rest-api/bot-framework-rest-connector-authentication'

export function chatbotSetupGuide(type?: Nullable<ChatProviderConnectionType>) {
  switch (type) {
    case ChatProviderConnectionType.Teams:
      return {
        documentationUrl: TEAMS_CHATBOT_SETUP_GUIDE_DOCUMENTATION_URL,
        markdownPath: TEAMS_CHATBOT_SETUP_GUIDE_MARKDOWN_PATH,
      }
    default:
      return {
        documentationUrl: SLACK_CHATBOT_SETUP_GUIDE_DOCUMENTATION_URL,
        markdownPath: SLACK_CHATBOT_SETUP_GUIDE_MARKDOWN_PATH,
      }
  }
}
