import { Flex, IconFrame, ShieldOutlineIcon } from '@pluralsh/design-system'
import { createColumnHelper } from '@tanstack/react-table'
import { ServiceStatusChip } from 'components/cd/services/ServiceStatusChip'
import { PrStatusChip } from 'components/self-service/pr/queue/PrQueueColumns.tsx'
import StackStatusChip from 'components/stacks/common/StackStatusChip.tsx'
import { StackTypeIcon } from 'components/stacks/common/StackTypeIcon.tsx'
import { AiInsightSummaryIcon } from 'components/utils/AiInsights.tsx'
import { DistroProviderIconFrame } from 'components/utils/ClusterDistro'
import { StretchedFlex } from 'components/utils/StretchedFlex.tsx'
import { TRUNCATE } from 'components/utils/truncate.ts'
import { Body2P, CaptionP } from 'components/utils/typography/Text.tsx'
import {
  PullRequestFragment,
  ServiceDeploymentChatFragment,
  StackChatFragment,
} from 'generated/graphql.ts'
import styled, { useTheme } from 'styled-components'

const pullRequestsColHelper = createColumnHelper<PullRequestFragment>()
const stacksColHelper = createColumnHelper<StackChatFragment>()
const servicesColHelper = createColumnHelper<ServiceDeploymentChatFragment>()

export const pullRequestsCol = [
  pullRequestsColHelper.accessor((pr) => pr, {
    id: 'row',
    meta: { gridTemplate: '300' },
    cell: function Cell({ getValue }) {
      const theme = useTheme()
      const pr = getValue()

      return (
        <ItemRowWrapperSC>
          <StretchedFlex>
            <TruncatedBody2P $width={160}>{pr.title}</TruncatedBody2P>
            <PrStatusChip
              size="small"
              status={pr.status}
            />
          </StretchedFlex>
          <CaptionP css={{ color: theme.colors['text-xlight'] }}>
            {pr.url}
          </CaptionP>
        </ItemRowWrapperSC>
      )
    },
  }),
]

export const stacksCol = [
  stacksColHelper.accessor((stack) => stack, {
    id: 'row',
    meta: { gridTemplate: '300' },
    cell: function Cell({ getValue }) {
      const theme = useTheme()
      const stack = getValue()

      return (
        <ItemRowWrapperSC>
          <StretchedFlex>
            <Flex
              gap="small"
              align="center"
            >
              <IconFrame
                icon={<StackTypeIcon stackType={stack.type} />}
                size="small"
                type="floating"
              />
              <TruncatedBody2P $color="text">{stack.name}</TruncatedBody2P>
            </Flex>
            <Flex
              align="center"
              gap="xxsmall"
            >
              <AiInsightSummaryIcon insight={stack.insight} />
              <StackStatusChip
                size="small"
                status={stack.status}
                deleting={!!stack?.deletedAt}
              />
            </Flex>
          </StretchedFlex>
          <CaptionP css={{ color: theme.colors['text-xlight'] }}>
            {stack.repository?.url}
          </CaptionP>
        </ItemRowWrapperSC>
      )
    },
  }),
]

export const servicesCol = [
  servicesColHelper.accessor((service) => service, {
    id: 'row',
    meta: { gridTemplate: '300' },
    cell: function Cell({ getValue }) {
      const { spacing } = useTheme()
      const service = getValue()

      return (
        <ItemRowWrapperSC>
          <StretchedFlex>
            <TruncatedBody2P>{service.name}</TruncatedBody2P>
            {service?.protect && (
              <IconFrame
                icon={<ShieldOutlineIcon />}
                size="small"
              />
            )}
            <Flex flex={1} />
            <AiInsightSummaryIcon insight={service.insight} />
            <ServiceStatusChip
              size="small"
              status={service.status}
              componentStatus={service.componentStatus}
            />
          </StretchedFlex>
          <CaptionP
            $color="text-xlight"
            css={{
              display: 'flex',
              alignItems: 'center',
              gap: spacing.xxsmall,
            }}
          >
            <DistroProviderIconFrame
              distro={service.cluster?.distro}
              provider={service.cluster?.provider?.cloud}
              fillLevel={0}
              type="tertriary"
              size="small"
            />
            {service.cluster?.name}
          </CaptionP>
        </ItemRowWrapperSC>
      )
    },
  }),
]

const TruncatedBody2P = styled(Body2P)<{ $width?: number }>(
  ({ $width, theme }) => ({
    maxWidth: $width ?? 140,
    color: theme.colors.text,
    ...TRUNCATE,
  })
)

const ItemRowWrapperSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  padding: theme.spacing.xxsmall,
  width: '100%',
}))
