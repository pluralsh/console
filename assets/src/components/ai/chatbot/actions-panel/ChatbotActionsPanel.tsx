import { SimpleFlyover } from 'components/utils/SimpleFlyover'
import { Body2BoldP, CaptionP } from 'components/utils/typography/Text'
import { useChatAgentSessionQuery } from 'generated/graphql'
import styled, { useTheme } from 'styled-components'
import { CHATBOT_HEADER_HEIGHT } from '../Chatbot'
import { useChatbot } from '../../AIContext.tsx'

import {
  Accordion,
  ArrowTopRightIcon,
  Button,
  Flex,
  GitHubLogoIcon,
  GitPullIcon,
  IconFrame,
  StackIcon,
} from '@pluralsh/design-system'
import { PrStatusChip } from '../../../self-service/pr/queue/PrQueueColumns.tsx'
import { useNavigate } from 'react-router-dom'
import { PR_ABS_PATH } from '../../../../routes/selfServiceRoutesConsts.tsx'
import { ServiceStatusChip } from '../../../cd/services/ServiceStatusChip.tsx'
import { getServiceDetailsPath } from '../../../../routes/cdRoutesConsts.tsx'
import { ComponentIcon } from '../../../cd/services/service/component/misc.tsx'
import StackStatusChip from '../../../stacks/common/StackStatusChip.tsx'
import { getStacksAbsPath } from '../../../../routes/stacksRoutesConsts.tsx'
import { Services } from './Services.tsx'
import { Stacks } from './Stacks.tsx'
import { PullRequests } from './PullRequests.tsx'

export function ChatbotActionsPanel({
  isOpen,
  zIndex,
}: {
  isOpen: boolean
  zIndex?: number
}) {
  const navigate = useNavigate()
  const theme = useTheme()
  const { currentThread } = useChatbot()

  const { data } = useChatAgentSessionQuery({
    skip: !currentThread?.id,
    variables: { id: currentThread?.id ?? '' },
  })

  const pullRequest = data?.chatThread?.session?.pullRequest
  const service = data?.chatThread?.session?.service
  const stack = data?.chatThread?.session?.stack

  if (!currentThread?.id) return null

  // TODO: Handle loading and error states for queries.

  return (
    <SimpleFlyover
      isOpen={isOpen}
      zIndex={zIndex}
    >
      <HeaderSC>
        <Body2BoldP>Actions panel</Body2BoldP>
      </HeaderSC>
      <div css={{ overflow: 'auto' }}>
        {pullRequest && (
          <ActionItemSC>
            <ActionItemHeaderSC>
              <IconFrame
                icon={<GitPullIcon />}
                size="small"
              />
              Pull request
              <Flex
                flex={1}
                justifyContent="flex-end"
              >
                <PrStatusChip
                  status={pullRequest.status}
                  size="small"
                />
              </Flex>
            </ActionItemHeaderSC>
            <CaptionP css={{ color: theme.colors['text-xlight'] }}>
              {pullRequest.title}
            </CaptionP>
            <Flex justifyContent="space-between">
              <Button
                secondary
                small
                onClick={() => navigate(PR_ABS_PATH)}
              >
                View all PRs
              </Button>
              <Button
                startIcon={<GitHubLogoIcon />}
                endIcon={<ArrowTopRightIcon />}
                small
                as="a"
                href={pullRequest.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                View PR
              </Button>
            </Flex>
          </ActionItemSC>
        )}

        {service && (
          <ActionItemSC>
            <ActionItemHeaderSC>
              <IconFrame
                icon={<ComponentIcon kind="service" />}
                size="small"
              />
              Service
              <Flex
                flex={1}
                justifyContent="flex-end"
              >
                <ServiceStatusChip
                  status={service.status}
                  componentStatus={service.componentStatus}
                  size="small"
                />
              </Flex>
            </ActionItemHeaderSC>
            <CaptionP css={{ color: theme.colors['text-xlight'] }}>
              {service.name}
            </CaptionP>
            <Flex justifyContent="flex-end">
              <Button
                small
                onClick={() =>
                  navigate(getServiceDetailsPath({ serviceId: service?.id }))
                }
              >
                View service
              </Button>
            </Flex>
          </ActionItemSC>
        )}

        {stack && (
          <ActionItemSC>
            <ActionItemHeaderSC>
              <IconFrame
                icon={<StackIcon />}
                size="small"
              />
              Stack
              <Flex
                flex={1}
                justifyContent="flex-end"
              >
                <StackStatusChip
                  status={stack.status}
                  deleting={!!stack.deletedAt}
                  size="small"
                />
              </Flex>
            </ActionItemHeaderSC>
            <CaptionP css={{ color: theme.colors['text-xlight'] }}>
              {stack.name}
            </CaptionP>
            <Flex justifyContent="flex-end">
              <Button
                small
                onClick={() => navigate(getStacksAbsPath(stack.id))}
              >
                View stack
              </Button>
            </Flex>
          </ActionItemSC>
        )}

        <Accordion
          type="multiple"
          css={{ border: 'none', background: theme.colors['fill-accent'] }}
        >
          <PullRequests currentThreadId={currentThread.id} />
          <Services currentThreadId={currentThread.id} />
          <Stacks currentThreadId={currentThread.id} />
        </Accordion>
      </div>
    </SimpleFlyover>
  )
}

const HeaderSC = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: theme.borders.default,
  padding: `0 ${theme.spacing.medium}px`,
  minHeight: CHATBOT_HEADER_HEIGHT,
}))

const ActionItemSC = styled.div(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.small,
  padding: theme.spacing.medium,
  borderBottom: theme.borders.default,
  wordBreak: 'break-word',
  height: 'fit-content',
  maxHeight: 324,
  overflow: 'auto',
}))

export const ActionItemHeaderSC = styled.div(({ theme }) => ({
  ...theme.partials.text.body2Bold,
  alignItems: 'center',
  display: 'flex',
  flex: 1,
  gap: theme.spacing.xsmall,
}))
