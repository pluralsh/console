import { ArrowTopRightIcon, TicketIcon } from '@pluralsh/design-system'
import { getIssueWebhookProviderIcon } from 'components/settings/webhooks/webhookIcons'
import { WorkbenchIssueFragment } from 'generated/graphql'
import { startCase } from 'lodash'
import { cloneElement, ReactNode } from 'react'
import styled from 'styled-components'
import { formatDateTime } from 'utils/datetime'
import { ensureURLValidity } from 'utils/url'
import { IssueStatusChip } from './IssueStatusChip'

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
        <LinkRowSC
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
        </LinkRowSC>
        <PropsRowSC>
          {issue.insertedAt && (
            <IssueProp label="Date">
              {formatDateTime(issue.insertedAt, 'M/D/YYYY h:mma')}
            </IssueProp>
          )}
          <IssueProp label="Status">
            <IssueStatusChip
              status={issue.status}
              fillLevel={1}
            />
          </IssueProp>
          <IssueProp label="Provider">
            <ProviderSC>
              {cloneElement(getIssueWebhookProviderIcon(issue.provider), {
                size: 12,
              })}
              {startCase(issue.provider.toLowerCase())}
            </ProviderSC>
          </IssueProp>
        </PropsRowSC>
      </BodySC>
    </CardSC>
  )
}

function IssueProp({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <PropSC>
      <PropLabelSC>{label}</PropLabelSC>
      <PropValueSC>{children}</PropValueSC>
    </PropSC>
  )
}

const CardSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  padding: `${theme.spacing.small}px ${theme.spacing.large}px`,
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
  borderRadius: '50%',
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
  gap: 6,
})

const LinkRowSC = styled.a(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.medium,
  padding: 10,
  borderRadius: theme.borderRadiuses.medium,
  textDecoration: 'none',
  '&:hover': { backgroundColor: theme.colors['fill-zero-hover'] },
  '&:focus-visible': { outline: theme.borders['outline-focused'] },
}))

const LinkTextSC = styled.div({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minWidth: 0,
})

const LinkUrlSC = styled.span(({ theme }) => ({
  ...theme.partials.text.body2,
  color: theme.colors['action-link-inline'],
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}))

const LinkTitleSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}))

const PropsRowSC = styled.div({
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
  paddingBottom: 10,
})

const PropSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.xxsmall,
  padding: '0 10px',
}))

const PropLabelSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  color: theme.colors['text-xlight'],
  whiteSpace: 'nowrap',
}))

const PropValueSC = styled.div(({ theme }) => ({
  ...theme.partials.text.body2,
  display: 'flex',
  alignItems: 'center',
  minHeight: 20,
  color: theme.colors.text,
  whiteSpace: 'nowrap',
}))

const ProviderSC = styled.span(({ theme }) => ({
  ...theme.partials.text.caption,
  display: 'inline-flex',
  alignItems: 'center',
  gap: theme.spacing.xxsmall,
  color: theme.colors.text,
}))
