import { Tooltip } from '@pluralsh/design-system'
import { getObservabilityWebhookTypeIcon } from 'components/settings/webhooks/webhookIcons'
import { AlertFragment } from 'generated/graphql'
import { isEmpty } from 'lodash'
import { cloneElement } from 'react'
import styled from 'styled-components'
import { TRUNCATE } from 'components/utils/truncate'
import { ensureURLValidity } from 'utils/url'

// The alert's `alertname` tag (as sent by Grafana and Prometheus-style
// sources), falling back to the alert title.
export function getAlertName(alert: Pick<AlertFragment, 'title' | 'tags'>) {
  return (
    alert.tags?.find((tag) => tag?.name === 'alertname')?.value || alert.title
  )
}

// Link to the alert in its source (e.g. Grafana): source icon + alert name.
export function AlertSourceLink({
  alert,
}: {
  alert: Pick<AlertFragment, 'title' | 'tags' | 'type' | 'url'>
}) {
  const href = ensureURLValidity(alert.url)
  const icon = (
    <IconSC>
      {cloneElement(getObservabilityWebhookTypeIcon(alert.type), {
        size: 12,
      })}
    </IconSC>
  )
  const name = <NameSC>{getAlertName(alert)}</NameSC>

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
}))

const IconSC = styled.span({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: 12,
  height: 12,
})

const NameSC = styled.span({
  minWidth: 0,
  ...TRUNCATE,
})
