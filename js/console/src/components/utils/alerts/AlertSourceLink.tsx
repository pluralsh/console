import { Tooltip } from '@pluralsh/design-system'
import { getObservabilityWebhookTypeIcon } from 'components/settings/webhooks/webhookIcons'
import { AlertFragment } from 'generated/graphql'
import { isEmpty } from 'lodash'
import { cloneElement } from 'react'
import styled from 'styled-components'
import { TRUNCATE } from 'components/utils/truncate'
import { toHttpURL } from 'utils/url'
import { getAlertSummary } from './alertDetails'

// The alert's `alertname` tag (as sent by Grafana and Prometheus-style
// sources), falling back to the alert title.
export function getAlertName(alert: Pick<AlertFragment, 'title' | 'tags'>) {
  return (
    alert.tags?.find((tag) => tag?.name === 'alertname')?.value || alert.title
  )
}

// Alert title for list rows and cards, falling back to the alert name.
export function getAlertTitle(alert: Pick<AlertFragment, 'title' | 'tags'>) {
  return alert.title || getAlertName(alert) || 'Untitled alert'
}

// Alert heading for the details and quick views: its summary annotation,
// falling back to the alert name.
export function getAlertHeading(
  alert: Pick<AlertFragment, 'title' | 'tags' | 'annotations'>
) {
  return getAlertSummary(alert) || getAlertName(alert)
}

// Link to the alert in its source (e.g. Grafana): source icon + alert name,
// or `label` instead of the name.
export function AlertSourceLink({
  alert,
  label,
}: {
  alert: Pick<AlertFragment, 'title' | 'tags' | 'type' | 'url'>
  label?: string
}) {
  const href = toHttpURL(alert.url)
  const icon = cloneElement(getObservabilityWebhookTypeIcon(alert.type), {
    size: 12,
    flexShrink: 0,
  })
  const name = <NameSC>{label ?? getAlertName(alert)}</NameSC>

  if (isEmpty(href))
    return (
      <LinkSC as="span">
        {icon}
        {name}
      </LinkSC>
    )

  return (
    <Tooltip
      placement="top"
      label={alert.url}
    >
      <LinkSC
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
      >
        {icon}
        {name}
      </LinkSC>
    </Tooltip>
  )
}

const LinkSC = styled.a(({ theme }) => ({
  ...theme.partials.text.body2,
  display: 'inline-flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
  minWidth: 0,
  maxWidth: '100%',
  color: theme.colors['action-link-inline'],
  textDecoration: 'none',
  'a&:hover': { textDecoration: 'underline' },
  // without a usable URL it's plain text, so it shouldn't look clickable
  'span&': { color: theme.colors.text },
}))

const NameSC = styled.span({
  minWidth: 0,
  ...TRUNCATE,
})
