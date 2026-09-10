import { ArrowTopRightIcon, Tooltip } from '@pluralsh/design-system'
import { getIssueWebhookProviderIcon } from 'components/settings/webhooks/webhookIcons'
import { IssueWebhookProvider } from 'generated/graphql'
import { isEmpty } from 'lodash'
import { cloneElement } from 'react'
import styled from 'styled-components'
import { ensureURLValidity } from 'utils/url'
import { issueLinkLabel } from './issueLinkDisplay'

export function IssueLink({
  url,
  provider,
}: {
  url?: Nullable<string>
  provider?: Nullable<IssueWebhookProvider>
}) {
  if (isEmpty(url)) return null

  const href = ensureURLValidity(url)
  if (isEmpty(href)) return null

  const ticket = issueLinkLabel({ url: href, provider })
  const icon = getIssueWebhookProviderIcon(provider)

  return (
    <Tooltip
      placement="top"
      label={url}
    >
      <LinkSC
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
      >
        <IconWrapSC>
          {cloneElement(icon, { size: 12, fullColor: false })}
        </IconWrapSC>
        <LinkLabelSC>{ticket}</LinkLabelSC>
        <ArrowTopRightIcon
          size={12}
          color="icon-default"
        />
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
  color: theme.colors['text-light'],
  textDecoration: 'none',
  '&:hover': {
    color: theme.colors.text,
    textDecoration: 'underline',
  },
  '> svg': { flexShrink: 0 },
}))

const IconWrapSC = styled.span({
  display: 'flex',
  flexShrink: 0,
  lineHeight: 0,
})

const LinkLabelSC = styled.span({
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})
