import { TicketIcon, VisualInspectionIcon } from '@pluralsh/design-system'

import { WorkbenchWebhookFragment } from 'generated/graphql'

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
