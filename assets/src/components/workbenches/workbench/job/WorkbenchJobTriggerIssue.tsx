import {
  AccordionItem,
  ArrowTopRightIcon,
  DocumentIcon,
  Flex,
  GitHubLogoIcon,
  GitLabLogoIcon,
  JiraLogoIcon,
  LinearLogoIcon,
  Prop,
} from '@pluralsh/design-system'
import {
  TriggerAccordionSC,
  TriggerCardSC,
  TriggerCardIconWrapperSC,
  TriggerPropsRowSC,
} from 'components/workbenches/common/WorkbenchTriggerCard'
import { IssueStatusChip } from 'components/workbenches/common/IssueStatusChip'
import { Body2BoldP, CaptionP, InlineA } from 'components/utils/typography/Text'
import { IssueWebhookProvider, WorkbenchJobFragment } from 'generated/graphql'
import { startCase } from 'lodash'
import { ComponentType } from 'react'
import styled from 'styled-components'
import { formatDateTime } from 'utils/datetime'

const providerToIcon: Partial<
  Record<
    IssueWebhookProvider,
    ComponentType<{ size?: number; fullColor?: boolean }>
  >
> = {
  [IssueWebhookProvider.Github]: GitHubLogoIcon,
  [IssueWebhookProvider.Gitlab]: GitLabLogoIcon,
  [IssueWebhookProvider.Jira]: JiraLogoIcon,
  [IssueWebhookProvider.Linear]: LinearLogoIcon,
}

export function WorkbenchJobTriggerIssue({
  issue,
}: {
  issue?: Nullable<WorkbenchJobFragment['issue']>
}) {
  if (!issue) return null

  const ProviderIcon = providerToIcon[issue.provider]

  return (
    <TriggerCardSC>
      <TriggerAccordionSC
        type="multiple"
        defaultValue={['issue-details']}
      >
        <AccordionItem
          value="issue-details"
          padding="none"
          caret="right-quarter"
          trigger={
            <Flex
              align="center"
              gap="medium"
            >
              <TriggerCardIconWrapperSC>
                <DocumentIcon />
              </TriggerCardIconWrapperSC>
              <Body2BoldP $color="text-light">Issue</Body2BoldP>
            </Flex>
          }
        >
          <TriggerContentSC
            direction="column"
            gap="medium"
          >
            <Flex
              justify="space-between"
              align="center"
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
            <TriggerPropsRowSC>
              {issue.insertedAt && (
                <Prop
                  title="Date"
                  margin={0}
                >
                  {formatDateTime(issue.insertedAt, 'M/D/YYYY h:mma')}
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
            </TriggerPropsRowSC>
          </TriggerContentSC>
        </AccordionItem>
      </TriggerAccordionSC>
    </TriggerCardSC>
  )
}

const TriggerContentSC = styled(Flex)(({ theme }) => ({
  marginTop: theme.spacing.small,
}))
