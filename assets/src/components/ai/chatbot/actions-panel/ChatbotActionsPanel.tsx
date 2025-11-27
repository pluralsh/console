import { SimpleFlyover } from 'components/utils/SimpleFlyover'
import { Body2BoldP, CaptionP } from 'components/utils/typography/Text'
import {
  ChatFragment,
  ChatType,
  useChatAgentSessionQuery,
} from 'generated/graphql'
import styled, { useTheme } from 'styled-components'
import { useChatbot } from '../../AIContext.tsx'
import { CHATBOT_HEADER_HEIGHT } from '../Chatbot'

import {
  ArrowTopRightIcon,
  Button,
  Flex,
  GitHubLogoIcon,
  GitPullIcon,
  IconFrame,
  PrOpenIcon,
  RobotIcon,
  StackIcon,
} from '@pluralsh/design-system'
import { POLL_INTERVAL } from 'components/cd/ContinuousDeployment.tsx'
import { TableSkeleton } from 'components/utils/SkeletonLoaders.tsx'
import { isEmpty } from 'lodash'
import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { iconUrl } from 'utils/icon.ts'
import { getServiceDetailsPath } from '../../../../routes/cdRoutesConsts.tsx'
import { PR_ABS_PATH } from '../../../../routes/selfServiceRoutesConsts.tsx'
import { getStacksAbsPath } from '../../../../routes/stacksRoutesConsts.tsx'
import { mapExistingNodes } from '../../../../utils/graphql.ts'
import { ServiceStatusChip } from '../../../cd/services/ServiceStatusChip.tsx'
import { PrStatusChip } from '../../../self-service/pr/queue/PrQueueColumns.tsx'
import { StackStatusChip } from '../../../stacks/common/StackStatusChip.tsx'
import { GqlError } from '../../../utils/Alert.tsx'
import { EmptyStateCompact } from '../../AIThreads.tsx'
import { ChatbotCreatePrButton } from '../ChatMessageContent.tsx'
import { ActionsPanelResourceAccordion } from './ActionsPanelResourceAccordion.tsx'

const ACTIONS_PANEL_WIDTH = 400

export function ChatbotActionsPanel({
  zIndex,
  messages,
}: {
  zIndex?: number
  messages: ChatFragment[]
}) {
  const theme = useTheme()
  const { currentThreadId, actionsPanelOpen, setActionsPanelOpen } =
    useChatbot()

  const { data, error, loading } = useChatAgentSessionQuery({
    variables: { id: currentThreadId ?? '' },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_INTERVAL,
  })

  const curSession = data?.chatThread?.session

  const pr = curSession?.pullRequest
  const service = curSession?.service
  const stack = curSession?.stack

  const { prs, services, stacks } = useMemo(
    () => ({
      prs: mapExistingNodes(curSession?.pullRequests),
      services: mapExistingNodes(curSession?.serviceDeployments),
      stacks: mapExistingNodes(curSession?.stacks),
    }),
    [curSession]
  )

  const prCallMessages = useMemo(() => {
    return messages.filter((message) => message.type === ChatType.PrCall)
  }, [messages])

  const hasData = useMemo(
    () =>
      !isEmpty(prCallMessages) ||
      !!pr ||
      !isEmpty(prs) ||
      !!service ||
      !isEmpty(services) ||
      !!stack ||
      !isEmpty(stacks),
    [pr, prCallMessages, prs, service, services, stack, stacks]
  )

  useEffect(() => {
    if (!loading) setActionsPanelOpen(hasData)
    // want this to also recheck when the thread changes
  }, [hasData, loading, setActionsPanelOpen, currentThreadId])

  if (!currentThreadId) return null

  return (
    <SimpleFlyover
      isOpen={actionsPanelOpen}
      zIndex={zIndex}
      css={{ width: ACTIONS_PANEL_WIDTH }}
    >
      <HeaderSC>
        <Body2BoldP>Actions panel</Body2BoldP>
      </HeaderSC>
      <div css={{ overflow: 'auto' }}>
        {!hasData ? (
          loading ? (
            <TableSkeleton
              width={ACTIONS_PANEL_WIDTH - 2 * theme.spacing.xlarge}
              numColumns={1}
              styles={{ padding: theme.spacing.xlarge }}
            />
          ) : error ? (
            <GqlError error={error} />
          ) : (
            <EmptyStateCompact
              cssProps={{ background: 'none', border: 'none' }}
              icon={<RobotIcon size={24} />}
              message="No data available"
              description="Use our agent to run background tasks and get updates on your services, stacks, and pull requests."
            />
          )
        ) : (
          <>
            {prCallMessages.map(({ id, prAutomation, attributes }) => (
              <ActionItemSC key={id}>
                <ActionItemHeaderSC>
                  <IconFrame
                    icon={
                      prAutomation?.icon ? (
                        <img
                          width={20}
                          height={20}
                          src={iconUrl(
                            prAutomation?.icon,
                            prAutomation?.darkIcon,
                            theme.mode
                          )}
                        />
                      ) : (
                        <PrOpenIcon />
                      )
                    }
                    size="small"
                  />
                  {prAutomation?.name ?? 'PR automation'}
                </ActionItemHeaderSC>
                <CaptionP $color="text-xlight">
                  {prAutomation?.documentation ?? ''}
                </CaptionP>
                <ChatbotCreatePrButton
                  prAutomation={prAutomation}
                  threadId={currentThreadId}
                  session={curSession}
                  attributes={attributes?.prCall}
                />
              </ActionItemSC>
            ))}

            {pr && (
              <ActionItemSC>
                <ActionItemHeaderSC>
                  <IconFrame
                    icon={<PrOpenIcon />}
                    size="small"
                  />
                  Pull request
                  <Flex
                    flex={1}
                    justifyContent="flex-end"
                  >
                    <PrStatusChip
                      status={pr.status}
                      size="small"
                    />
                  </Flex>
                </ActionItemHeaderSC>
                <CaptionP $color="text-xlight">{pr.title}</CaptionP>
                <Flex justifyContent="space-between">
                  <Button
                    secondary
                    small
                    as={Link}
                    to={PR_ABS_PATH}
                    onClick={() => setActionsPanelOpen(false)}
                  >
                    View all PRs
                  </Button>
                  <Button
                    startIcon={<GitHubLogoIcon />}
                    endIcon={<ArrowTopRightIcon />}
                    small
                    as="a"
                    href={pr.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View PR
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
                <CaptionP $color="text-xlight">{stack.name}</CaptionP>
                <Flex justifyContent="flex-end">
                  <Button
                    small
                    as={Link}
                    to={getStacksAbsPath(stack.id)}
                    onClick={() => setActionsPanelOpen(false)}
                  >
                    View stack
                  </Button>
                </Flex>
              </ActionItemSC>
            )}

            {service && (
              <ActionItemSC>
                <ActionItemHeaderSC>
                  <IconFrame
                    icon={<GitPullIcon />}
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
                <CaptionP $color="text-xlight">{service.name}</CaptionP>
                <Flex justifyContent="flex-end">
                  <Button
                    small
                    as={Link}
                    to={getServiceDetailsPath({
                      serviceId: service?.id,
                      clusterId: service?.cluster?.id,
                    })}
                    onClick={() => setActionsPanelOpen(false)}
                  >
                    View service
                  </Button>
                </Flex>
              </ActionItemSC>
            )}
            {/* rerender on open so the default accordion logic resets */}
            {actionsPanelOpen && (
              <ActionsPanelResourceAccordion
                prs={prs}
                stacks={stacks}
                services={services}
                closePanel={() => setActionsPanelOpen(false)}
              />
            )}
          </>
        )}
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

export const ActionItemSC = styled.div(({ theme }) => ({
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
