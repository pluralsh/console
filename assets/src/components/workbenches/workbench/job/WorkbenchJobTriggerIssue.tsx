import {
  Accordion,
  AccordionItem,
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
}

export function WorkbenchJobTriggerIssue({
  issue,
}: {
  issue?: Nullable<WorkbenchJobFragment['issue']>
}) {
  if (!issue) return null

  const ProviderIcon = providerToIcon[issue.provider]

  return (
    <CardSC>
      <IssueAccordionSC
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
              <WorkbenchTriggerCardIcon>
                <DocumentIcon />
              </WorkbenchTriggerCardIcon>
              <Body2BoldP $color="text-light">Issue</Body2BoldP>
            </Flex>
          }
        >
          <ContentSC
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
          </ContentSC>
        </AccordionItem>
      </IssueAccordionSC>
    </CardSC>
  )
}

const CardSC = styled.div(({ theme }) => ({
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  padding: `${theme.spacing.small}px ${theme.spacing.large}px`,
  borderRadius: theme.borderRadiuses.large,
  border: theme.borders.input,
  backgroundColor: theme.colors['fill-zero'],
}))

const PropsRowSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  gap: theme.spacing.medium,
}))

const ContentSC = styled(Flex)(({ theme }) => ({
  marginTop: theme.spacing.small,
}))

const IssueAccordionSC = styled(Accordion)({
  background: 'none',
  border: 'none',
  marginTop: 0,
})
