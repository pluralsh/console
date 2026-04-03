import {
  ArrowTopRightIcon,
  DocumentIcon,
  Flex,
  GitHubLogoIcon,
  GitLabLogoIcon,
  Prop,
} from '@pluralsh/design-system'
import { WorkbenchTriggerCardIcon } from 'components/workbenches/common/WorkbenchTriggerCardIcon'
import { IssueStatusChip } from 'components/workbenches/common/IssueStatusChip'
import { Body2BoldP, CaptionP, InlineA } from 'components/utils/typography/Text'
import { IssueStatus, IssueWebhookProvider } from 'generated/graphql'
import { startCase } from 'lodash'
import { ComponentType } from 'react'
import styled from 'styled-components'
import { formatDateTime } from 'utils/datetime'

export type WorkbenchJobTriggerIssueData = {
  externalId?: string
  insertedAt?: Nullable<string>
  title: string
  creator?: Nullable<string>
  status: IssueStatus
  url: string
  provider: IssueWebhookProvider
}

export const MOCK_WORKBENCH_JOB_TRIGGER_ISSUE: WorkbenchJobTriggerIssueData = {
  externalId: 'PLT-4821',
  insertedAt: '2026-04-01T09:30:00Z',
  title: 'Investigate repeated workbench-agent pod restarts',
  creator: 'Jake Thompson',
  status: IssueStatus.InProgress,
  url: 'https://example.com/issues/PLT-4821',
  provider: IssueWebhookProvider.Github,
}

const providerToIcon: Partial<
  Record<
    IssueWebhookProvider,
    ComponentType<{ size?: number; fullColor?: boolean }>
  >
> = {
  [IssueWebhookProvider.Github]: GitHubLogoIcon,
  [IssueWebhookProvider.Gitlab]: GitLabLogoIcon,
}

export function WorkbenchJobTriggerIssue({
  issue,
}: {
  issue: WorkbenchJobTriggerIssueData
}) {
  const ProviderIcon = providerToIcon[issue.provider]

  return (
    <CardSC>
      <Flex
        align="center"
        gap="medium"
      >
        <WorkbenchTriggerCardIcon>
          <DocumentIcon />
        </WorkbenchTriggerCardIcon>
        <Body2BoldP $color="text-light">Issue</Body2BoldP>
      </Flex>
      <Flex
        direction="column"
        gap="medium"
      >
        <Flex
          justify="space-between"
          align="flex-start"
          gap="small"
        >
          <Flex
            direction="column"
            gap="xxsmall"
          >
            <InlineA href={issue.url}>{issue.url}</InlineA>
            <CaptionP $color="text-xlight">{issue.title}</CaptionP>
          </Flex>
          <ArrowTopRightIcon size={12} />
        </Flex>
        <PropsRowSC>
          {issue.insertedAt && (
            <Prop
              title="Date"
              margin={0}
            >
              {formatDateTime(issue.insertedAt, 'M/D/YYYY h:mma')}
            </Prop>
          )}
          {issue.creator && (
            <Prop
              title="Creator"
              margin={0}
            >
              {issue.creator}
            </Prop>
          )}
          <Prop
            title="Status"
            margin={0}
          >
            <IssueStatusChip status={issue.status} />
          </Prop>
          <Prop
            title="Provider"
            margin={0}
          >
            <Flex
              align="center"
              gap="xsmall"
            >
              {ProviderIcon ? (
                <ProviderIcon
                  size={14}
                  fullColor
                />
              ) : null}
              {startCase(issue.provider.toLowerCase())}
            </Flex>
          </Prop>
        </PropsRowSC>
      </Flex>
    </CardSC>
  )
}

const CardSC = styled.div(({ theme }) => ({
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.medium,
  padding: theme.spacing.large,
  borderRadius: theme.borderRadiuses.large,
  border: theme.borders.input,
  backgroundColor: theme.colors['fill-zero'],
}))

const PropsRowSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing.medium,
}))
