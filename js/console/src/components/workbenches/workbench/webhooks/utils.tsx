import { TicketIcon, VisualInspectionIcon } from '@pluralsh/design-system'

import {
  WorkbenchWebhookFragment,
  WorkbenchWebhookTinyFragment,
} from 'generated/graphql'
import {
  getIssueWebhookProviderIcon,
  getObservabilityWebhookTypeIcon,
} from 'components/settings/webhooks/webhookIcons'

export function webhookURL(webhook: WorkbenchWebhookFragment) {
  if (webhook.issueWebhook) return webhook.issueWebhook.url

  if (webhook.webhook) return webhook.webhook.url

  return undefined
}

export function webhookTypeIcon(webhook: WorkbenchWebhookFragment) {
  if (webhook.issueWebhook) return <TicketIcon />

  return <VisualInspectionIcon />
}

export function webhookTypeLabel(webhook: WorkbenchWebhookFragment) {
  if (webhook.issueWebhook) return 'Ticketing'

  return 'Observability'
}

export function getWebhookIcon(
  webhook: WorkbenchWebhookFragment | WorkbenchWebhookTinyFragment
) {
  if (webhook.issueWebhook) {
    return getIssueWebhookProviderIcon(webhook.issueWebhook.provider)
  }
  return getObservabilityWebhookTypeIcon(webhook.webhook?.type)
}

export { getIssueWebhookProviderIcon, getObservabilityWebhookTypeIcon }
