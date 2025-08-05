import { SimpleFlyover } from 'components/utils/SimpleFlyover'
import { Body2BoldP, CaptionP } from 'components/utils/typography/Text'
import {
  useChatAgentSessionPRsQuery,
  useChatAgentSessionQuery,
  useChatAgentSessionServicesQuery,
  useChatAgentSessionStacksQuery,
} from 'generated/graphql'
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
  RobotIcon,
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
import { Dispatch, SetStateAction, useEffect, useMemo } from 'react'
import { useFetchPaginatedData } from '../../../utils/table/useFetchPaginatedData.tsx'
import { mapExistingNodes } from '../../../../utils/graphql.ts'
import { isEmpty } from 'lodash'
import { GqlError } from '../../../utils/Alert.tsx'
import { EmptyStateCompact } from '../../AIThreads.tsx'

export function ChatbotActionsPanel({
  isOpen,
  setOpen,
  zIndex,
}: {
  isOpen: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
  zIndex?: number
}) {
  const navigate = useNavigate()
  const theme = useTheme()
  const { currentThread } = useChatbot()

  const query = useChatAgentSessionQuery({
    skip: !currentThread?.id,
    variables: { id: currentThread?.id ?? '' },
  })

  const pr = query.data?.chatThread?.session?.pullRequest
  const service = query.data?.chatThread?.session?.service
  const stack = query.data?.chatThread?.session?.stack

  const prsQuery = useFetchPaginatedData(
    {
      queryHook: useChatAgentSessionPRsQuery,
      keyPath: ['chatThread', 'session', 'pullRequests'],
      skip: !currentThread?.id,
    },
    { id: currentThread?.id ?? '' }
  )

  const prs = useMemo(
    () => mapExistingNodes(prsQuery.data?.chatThread?.session?.pullRequests),
    [prsQuery.data?.chatThread?.session?.pullRequests]
  )

  const servicesQuery = useFetchPaginatedData(
    {
      queryHook: useChatAgentSessionServicesQuery,
      keyPath: ['chatThread', 'session', 'serviceDeployments'],
      skip: !currentThread?.id,
    },
    { id: currentThread?.id ?? '' }
  )

  const services = useMemo(
    () =>
      mapExistingNodes(
        servicesQuery.data?.chatThread?.session?.serviceDeployments
      ),
    [servicesQuery.data?.chatThread?.session?.serviceDeployments]
  )

  const stacksQuery = useFetchPaginatedData(
    {
      queryHook: useChatAgentSessionStacksQuery,
      keyPath: ['chatThread', 'session', 'stacks'],
      skip: !currentThread?.id,
    },
    { id: currentThread?.id ?? '' }
  )

  const stacks = useMemo(
    () => mapExistingNodes(stacksQuery.data?.chatThread?.session?.stacks),
    [stacksQuery.data?.chatThread?.session?.stacks]
  )

  const hasData = useMemo(
    () =>
      !!pr ||
      !isEmpty(prs) ||
      !!service ||
      !isEmpty(services) ||
      !!stack ||
      !isEmpty(stacks),
    [pr, prs, service, services, stack, stacks]
  )

  const hasErrors = useMemo(
    () =>
      !!query.error ||
      !!prsQuery.error ||
      !!servicesQuery.error ||
      !!stacksQuery.error,
    [query.error, prsQuery.error, servicesQuery.error, stacksQuery.error]
  )

  useEffect(() => {
    if (!isOpen && hasData) setOpen(true)
  }, [hasData, isOpen, setOpen])

  if (!currentThread?.id) return null

  return (
    <SimpleFlyover
      isOpen={isOpen}
      zIndex={zIndex}
    >
      <HeaderSC>
        <Body2BoldP>Actions panel</Body2BoldP>
      </HeaderSC>
      <div css={{ overflow: 'auto' }}>
        {!hasData && !hasErrors && (
          <EmptyStateCompact
            cssProps={{ background: 'none', border: 'none' }}
            icon={<RobotIcon size={24} />}
            message="No data available"
            description="Use our agent to run background tasks and get updates on your services, stacks, and pull requests."
          />
        )}

        {hasErrors && (
          <Flex
            direction="column"
            gap="small"
            css={{ padding: theme.spacing.medium }}
          >
            {query.error && <GqlError error={query.error} />}
            {prsQuery.error && <GqlError error={prsQuery.error} />}
            {servicesQuery.error && <GqlError error={servicesQuery.error} />}
            {stacksQuery.error && <GqlError error={stacksQuery.error} />}
          </Flex>
        )}

        {pr && (
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
                  status={pr.status}
                  size="small"
                />
              </Flex>
            </ActionItemHeaderSC>
            <CaptionP css={{ color: theme.colors['text-xlight'] }}>
              {pr.title}
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
                href={pr.url}
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
                  navigate(
                    getServiceDetailsPath({
                      serviceId: service?.id,
                      clusterId: service?.cluster?.id,
                    })
                  )
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
          <PullRequests
            prs={prs}
            query={prsQuery}
          />
          <Services
            services={services}
            query={servicesQuery}
          />
          <Stacks
            stacks={stacks}
            query={stacksQuery}
          />
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
