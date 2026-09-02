import { Tooltip } from '@pluralsh/design-system'
import { getIssueWebhookProviderIcon } from 'components/settings/webhooks/webhookIcons'
import { IssueWebhookProvider } from 'generated/graphql'
import { cloneElement } from 'react'
import styled from 'styled-components'
import { issueLinkParts } from './issueLinkDisplay'

export function IssueLink({
  url,
  provider,
}: {
  url?: Nullable<string>
  provider?: Nullable<IssueWebhookProvider>
}) {
  if (!url) return null

  const { ticket } = issueLinkParts({ url, provider })
  const icon = getIssueWebhookProviderIcon(provider)

  return (
    <Tooltip
      placement="top"
      label={url}
    >
      <LinkSC
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
      >
        <IconWrapSC>
          {cloneElement(icon, { size: 12, fullColor: false })}
        </IconWrapSC>
        {ticket}
      </LinkSC>
    </Tooltip>
  )
}

const LinkSC = styled.a(({ theme }) => ({
  ...theme.partials.text.body2LooseLineHeight,
  display: 'inline-flex',
  alignItems: 'center',
  gap: theme.spacing.xsmall,
  minWidth: 0,
  maxWidth: '100%',
  color: theme.colors['text-primary-accent'],
  textDecoration: 'none',
  '&:hover': {
    color: theme.colors['action-link-inline-hover'],
  },
}))

const IconWrapSC = styled.span({
  display: 'flex',
  flexShrink: 0,
  lineHeight: 0,
})
