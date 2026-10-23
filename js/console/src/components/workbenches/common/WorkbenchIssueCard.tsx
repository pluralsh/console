import { ArrowTopRightIcon, TicketIcon } from '@pluralsh/design-system'
import { getIssueWebhookProviderIcon } from 'components/settings/webhooks/webhookIcons'
import { WorkbenchIssueFragment } from 'generated/graphql'
import { humanizeIssueWebhookProvider } from 'utils/webhookLabels'
import { cloneElement } from 'react'
import styled from 'styled-components'
import { TRUNCATE } from 'components/utils/truncate'
import { formatDateTime } from 'utils/datetime'
import { ensureURLValidity } from 'utils/url'
import { IssueStatusChip } from './IssueStatusChip'
import { DetailsField, DetailsLinkRowSC } from './WorkbenchDetailsView'

// Issue summary card shown in the Issues details panel.
export function WorkbenchIssueCard({
  issue,
}: {
  issue: WorkbenchIssueFragment
}) {
  const href = ensureURLValidity(issue.url)

  return (
    <CardSC>
      <HeaderSC>
        <HeaderIconSC>
          <TicketIcon
            size={16}
            css={{ transform: 'rotate(90deg)' }}
          />
        </HeaderIconSC>
        <HeaderTitleSC>Issue</HeaderTitleSC>
      </HeaderSC>
      <BodySC>
        <DetailsLinkRowSC
          href={href}
          target="_blank"
          rel="noopener noreferrer"
        >
          <LinkTextSC>
            <LinkUrlSC>{issue.url.replace(/^https?:\/\//, '')}</LinkUrlSC>
            <LinkTitleSC>{issue.title}</LinkTitleSC>
          </LinkTextSC>
          <ArrowTopRightIcon
            size={12}
            color="icon-light"
            css={{ flexShrink: 0 }}
          />
        </DetailsLinkRowSC>
        <PropsRowSC>
          {issue.insertedAt && (
            <DetailsField label="Date">
              {formatDateTime(issue.insertedAt, 'M/D/YYYY h:mma')}
            </DetailsField>
          )}
          <DetailsField label="Status">
            <IssueStatusChip
              status={issue.status}
              fillLevel={1}
            />
          </DetailsField>
          <DetailsField label="Provider">
            <ProviderSC>
              {cloneElement(getIssueWebhookProviderIcon(issue.provider), {
                size: 12,
              })}
              {humanizeIssueWebhookProvider(issue.provider)}
            </ProviderSC>
          </DetailsField>
        </PropsRowSC>
      </BodySC>
    </CardSC>
  )
}

const CardSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  padding: `${theme.spacing.small} ${theme.spacing.large}`,
  borderRadius: theme.borderRadiuses.large,
  backgroundColor: theme.colors['fill-zero'],
  boxShadow: theme.boxShadows.slight,
}))

const HeaderSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.small,
}))

const HeaderIconSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: 32,
  height: 32,
  borderRadius: theme.borderRadiuses.medium,
  border: theme.borders.default,
  color: theme.colors['icon-default'],
}))

const HeaderTitleSC = styled.span(({ theme }) => ({
  ...theme.partials.text.body2Bold,
  color: theme.colors['text-light'],
}))

const BodySC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  gap: '0.375rem',
})

const LinkTextSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minWidth: 0,
})

const LinkUrlSC = styled.span(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors['action-link-inline'],
  ...TRUNCATE,
}))

const LinkTitleSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
  ...TRUNCATE,
}))

const PropsRowSC = styled.div({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.375rem',
  paddingBottom: '0.625rem',
  '& > *': { padding: '0 0.625rem', whiteSpace: 'nowrap' },
})

const ProviderSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  display: 'inline-flex',
  alignItems: 'center',
  gap: theme.spacing.xxsmall,
  color: theme.colors.text,
}))
