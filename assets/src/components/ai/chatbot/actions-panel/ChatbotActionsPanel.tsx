import { SimpleFlyover } from 'components/utils/SimpleFlyover'
import { Body2BoldP, CaptionP } from 'components/utils/typography/Text'
import {
  useAgentSessionPRsQuery,
  useAgentSessionServicesQuery,
} from 'generated/graphql'
import styled, { useTheme } from 'styled-components'
import { mapExistingNodes } from 'utils/graphql'
import { CHATBOT_HEADER_HEIGHT } from '../Chatbot'
import { useChatbot } from '../../AIContext.tsx'
import { useFetchPaginatedData } from '../../../utils/table/useFetchPaginatedData.tsx'
import { useMemo } from 'react'
import {
  Accordion,
  AccordionItem,
  ArrowTopRightIcon,
  Button,
  Flex,
  GitHubLogoIcon,
  GitPullIcon,
  IconFrame,
} from '@pluralsh/design-system'
import { PrStatusChip } from '../../../self-service/pr/queue/PrQueueColumns.tsx'
import { useNavigate } from 'react-router-dom'
import { PR_ABS_PATH } from '../../../../routes/selfServiceRoutesConsts.tsx'
import { ServiceStatusChip } from '../../../cd/services/ServiceStatusChip.tsx'
import { getServiceDetailsPath } from '../../../../routes/cdRoutesConsts.tsx'
import { ComponentIcon } from '../../../cd/services/service/component/misc.tsx'
import { isEmpty } from 'lodash'

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

  const prsQuery = useFetchPaginatedData(
    {
      skip: !currentThread?.id,
      queryHook: useAgentSessionPRsQuery,
      keyPath: ['chatThread', 'session', 'pullRequests'],
    },
    { id: currentThread?.id ?? '' }
  )

  const pullRequest = prsQuery.data?.chatThread?.session?.pullRequest

  const pullRequests = useMemo(
    () => mapExistingNodes(prsQuery.data?.chatThread?.session?.pullRequests),
    [prsQuery.data?.chatThread?.session?.pullRequests]
  )

  const servicesQuery = useFetchPaginatedData(
    {
      skip: !currentThread?.id,
      queryHook: useAgentSessionServicesQuery,
      keyPath: ['chatThread', 'session', 'serviceDeployments'],
    },
    { id: currentThread?.id ?? '' }
  )

  const service = servicesQuery.data?.chatThread?.session?.service

  const services = useMemo(
    () =>
      mapExistingNodes(
        servicesQuery.data?.chatThread?.session?.serviceDeployments
      ),
    [servicesQuery.data?.chatThread?.session?.serviceDeployments]
  )

  return (
    <SimpleFlyover
      isOpen={isOpen}
      zIndex={zIndex}
    >
      <HeaderSC>
        <Body2BoldP>Actions panel</Body2BoldP>
      </HeaderSC>
      <div css={{ overflow: 'auto' }}>
        {/* Pull request */}
        {pullRequest && (
          <EntrySC>
            <SubheaderSC>
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
            </SubheaderSC>
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
          </EntrySC>
        )}

        {/* Service */}
        {service && (
          <EntrySC>
            <SubheaderSC>
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
            </SubheaderSC>
            <CaptionP css={{ color: theme.colors['text-xlight'] }}>
              {service.name} on {service.cluster?.name}
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
          </EntrySC>
        )}

        {/* Accordion */}
        <AccordionSC type="multiple">
          <>
            {/* TODO: Pull requests. */}
            {!isEmpty(pullRequests) && (
              <AccordionItem
                key="pullRequest"
                value={'Pull request'}
                trigger={
                  <SubheaderSC>
                    <IconFrame
                      icon={<GitPullIcon />}
                      size="small"
                    />
                    Pull requests
                  </SubheaderSC>
                }
              >
                ...
              </AccordionItem>
            )}

            {/* TODO: Services. */}
            {!isEmpty(services) && (
              <AccordionItem
                key="pullRequest"
                value={'Pull request'}
                trigger={
                  <SubheaderSC>
                    <IconFrame
                      icon={<GitPullIcon />}
                      size="small"
                    />
                    Services
                  </SubheaderSC>
                }
              >
                ...
              </AccordionItem>
            )}
          </>
        </AccordionSC>
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

const EntrySC = styled.div(({ theme }) => ({
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

const SubheaderSC = styled.div(({ theme }) => ({
  ...theme.partials.text.body2Bold,
  alignItems: 'center',
  display: 'flex',
  flex: 1,
  gap: theme.spacing.xsmall,
}))

const AccordionSC = styled(Accordion)(({ theme }) => ({
  border: 'none',
  background: theme.colors['fill-accent'],
}))
